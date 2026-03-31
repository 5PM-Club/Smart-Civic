// backend/handlers/workerHandler.js — Vonage-based Worker WhatsApp Handler
const supabase = require('../config/supabase');
const { getSession, setSession, clearSession } = require('../utils/sessionStore');
const { uploadTwilioMediaToSupabase } = require('../utils/storage');
const { sendWhatsApp } = require('../utils/notify');

/**
 * Handles incoming WhatsApp messages from registered workers.
 * @param {Object} msg - Normalized message { phone, body, mediaUrl, latitude, longitude, messageType }
 * @param {Object} worker - The worker record from Supabase
 */
const handleWorkerWhatsApp = async (msg, worker) => {
    const { phone, body: rawBody, mediaUrl } = msg;
    const body = (rawBody || '').trim().toUpperCase();

    let session = getSession(phone) || { state: 'IDLE' };

    // --- Command Handling ---

    // 1. LIST: Show assigned/in_progress tickets
    if (body === 'LIST') {
        const { data: tickets, error } = await supabase
            .from('complaints')
            .select('ticket_id, category, address_ward, status')
            .eq('worker_id', worker.id)
            .in('status', ['assigned', 'in_progress']);

        if (error || !tickets || tickets.length === 0) {
            await sendWhatsApp(phone, "You have no active tickets assigned.");
        } else {
            const list = tickets.map(t => `• [${t.status.toUpperCase()}] ${t.ticket_id}: ${t.category} at ${t.address_ward}`).join('\n');
            await sendWhatsApp(phone, `Your active tickets:\n${list}\n\nReply 'CLAIM <id>' to start or 'RESOLVE <id>' to close.`);
        }
        return;
    }

    // 2. CLAIM <ID>: Set status to in_progress
    if (body.startsWith('CLAIM ')) {
        const ticketId = body.replace('CLAIM ', '').trim();
        const { data, error } = await supabase
            .from('complaints')
            .update({ status: 'in_progress', updated_at: new Date() })
            .eq('ticket_id', ticketId)
            .eq('worker_id', worker.id)
            .select()
            .single();

        if (error || !data) {
            await sendWhatsApp(phone, `Error: Could not claim ticket ${ticketId}. Is it assigned to you?`);
        } else {
            await sendWhatsApp(phone, `Ticket ${ticketId} is now IN PROGRESS. Resolve it once fixed.`);
            // Notify citizen
            const { data: citizen } = await supabase.from('citizens').select('phone').eq('id', data.citizen_id).single();
            if (citizen) {
                await sendWhatsApp(citizen.phone, `Update: Worker ${worker.name} has started working on your complaint ${ticketId}.`);
            }
        }
        return;
    }

    // 3. RESOLVE <ID>: Trigger photo request
    if (body.startsWith('RESOLVE ')) {
        const ticketId = body.replace('RESOLVE ', '').trim();
        const { data: ticket } = await supabase
            .from('complaints')
            .select('id')
            .eq('ticket_id', ticketId)
            .eq('worker_id', worker.id)
            .single();

        if (ticket) {
            setSession(phone, { state: 'AWAIT_RESOLVE_PHOTO', ticket_id: ticketId, complaint_id: ticket.id });
            await sendWhatsApp(phone, `To resolve ${ticketId}, please send a completion PHOTO showing the fixed issue.`);
        } else {
            await sendWhatsApp(phone, `Error: You cannot resolve ticket ${ticketId}.`);
        }
        return;
    }

    // 4. PHOTO Handling (for RESOLVE)
    if (session.state === 'AWAIT_RESOLVE_PHOTO' && mediaUrl) {
        await sendWhatsApp(phone, "Processing resolution photo... please wait.");
        
        const publicUrl = await uploadTwilioMediaToSupabase(mediaUrl, session.ticket_id, 'completion');

        if (publicUrl) {
            const { data: ticket, error } = await supabase
                .from('complaints')
                .update({ 
                    status: 'resolved', 
                    completion_photo_url: publicUrl,
                    resolved_at: new Date(),
                    updated_at: new Date()
                })
                .eq('id', session.complaint_id)
                .select('ticket_id, citizen_id')
                .single();

            if (!error) {
                await sendWhatsApp(phone, `Ticket ${session.ticket_id} RESOLVED successfully. Good job!`);
                // Mark worker as available again
                await supabase.from('workers').update({ is_available: true }).eq('id', worker.id);
                
                // Notify citizen
                const { data: citizen } = await supabase.from('citizens').select('phone').eq('id', ticket.citizen_id).single();
                if (citizen) {
                    await sendWhatsApp(citizen.phone, `Congratulations! Your complaint ${session.ticket_id} has been RESOLVED. Resolution photo: ${publicUrl}`);
                }
                clearSession(phone);
            } else {
                await sendWhatsApp(phone, "Error updating ticket status. Please try again.");
            }
        } else {
            await sendWhatsApp(phone, "Failed to process photo. Please try sending it again.");
        }
        return;
    }

    // Default Fallback
    await sendWhatsApp(phone, "Commands: 'LIST', 'CLAIM <id>', 'RESOLVE <id>'.");
};

module.exports = { handleWorkerWhatsApp };
