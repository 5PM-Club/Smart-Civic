// backend/handlers/workerHandler.js — Vonage-based Worker WhatsApp Handler
const supabase = require('../config/supabase');
const { getSession, setSession, clearSession } = require('../utils/sessionStore');
const { uploadTwilioMediaToSupabase } = require('../utils/storage');
const { sendMessage } = require('../utils/notify');

/**
 * Handles incoming messages from registered workers.
 * @param {Object} msg - Normalized message { phone, body, mediaUrl, latitude, longitude, messageType, channel }
 * @param {Object} worker - The worker record from Supabase
 */
const handleWorkerWhatsApp = async (msg, worker) => {
    const { phone, body: rawBody, mediaUrl, channel: workerChannel, recipient } = msg;
    const body = (rawBody || '').trim().toUpperCase();

    let session = getSession(phone) || { state: 'IDLE' };

    // Helper to send messages back from the same number they arrived at
    const reply = async (text, media = null) => {
        return await sendMessage(phone, text, workerChannel, media, recipient);
    };

    // --- Command Handling ---

    // 1. LIST: Show assigned/in_progress tickets
    if (body === 'LIST') {
        const { data: tickets, error } = await supabase
            .from('complaints')
            .select('ticket_id, category, address_ward, status')
            .eq('worker_id', worker.id)
            .in('status', ['assigned', 'in_progress']);

        if (error || !tickets || tickets.length === 0) {
            await reply("You have no active tickets assigned.");
        } else {
            const list = tickets.map(t => `• [${t.status.toUpperCase()}] ${t.ticket_id}: ${t.category} at ${t.address_ward}`).join('\n');
            await reply(`Your active tickets:\n${list}\n\nReply 'CLAIM <id>' to start or 'RESOLVE <id>' to close.`);
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
            .select('*, citizens(phone)')
            .single();

        if (error || !data) {
            await reply(`Error: Could not claim ticket ${ticketId}. Is it assigned to you?`);
        } else {
            await reply(`Ticket ${ticketId} is now IN PROGRESS. Resolve it once fixed.`);
            // Notify citizen on their original channel (Worker number NOT used here)
            if (data.citizens && data.citizens.phone) {
                await sendMessage(data.citizens.phone, `Update: Worker ${worker.name} has started working on your complaint ${ticketId}.`, data.channel || 'whatsapp');
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
            setSession(phone, { 
                state: 'AWAIT_RESOLVE_PHOTO', 
                ticket_id: ticketId, 
                complaint_id: ticket.id, 
                workerChannel,
                recipient // Store for the next step
            });
            await reply(`To resolve ${ticketId}, please send a completion PHOTO showing the fixed issue.`);
        } else {
            await reply(`Error: You cannot resolve ticket ${ticketId}.`);
        }
        return;
    }

    // 4. PHOTO Handling (for RESOLVE)
    if (session.state === 'AWAIT_RESOLVE_PHOTO' && mediaUrl) {
        await reply("Processing resolution photo... please wait.");
        
        // Use generic storage utility
        const { uploadMediaToSupabase } = require('../utils/storage');
        const publicUrl = await uploadMediaToSupabase(mediaUrl, session.ticket_id, 'completion');

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
                .select('*, citizens(phone)')
                .single();

            if (!error) {
                await reply(`Ticket ${session.ticket_id} RESOLVED successfully. Good job!`);
                // Mark worker as available again ONLY if they have no other active tickets
                const { count } = await supabase
                    .from('complaints')
                    .select('*', { count: 'exact', head: true })
                    .eq('worker_id', worker.id)
                    .in('status', ['assigned', 'in_progress']);
                
                if (count === 0) {
                    await supabase.from('workers').update({ is_available: true }).eq('id', worker.id);
                }
                
                // Notify citizen on their original channel (Citizen side number)
                if (ticket.citizens && ticket.citizens.phone) {
                    await sendMessage(ticket.citizens.phone, `Congratulations! Your complaint ${session.ticket_id} has been RESOLVED. Resolution photo: ${publicUrl}`, ticket.channel || 'whatsapp');
                }
                clearSession(phone);
            } else {
                await reply("Error updating ticket status. Please try again.");
            }
        } else {
            await reply("Failed to process photo. Please try sending it again.");
        }
        return;
    }

    // Default Fallback
    await reply("Commands: 'LIST', 'CLAIM <id>', 'RESOLVE <id>'.");
};

module.exports = { handleWorkerWhatsApp };
