const { sendMessage } = require('../utils/notify');

/**
 * Handles incoming WhatsApp/SMS messages from registered workers.
 * @param {Object} msg - Normalized message { phone, body, mediaUrl, latitude, longitude, messageType, channel }
 * @param {Object} worker - The worker record from Supabase
 */
const handleWorkerWhatsApp = async (msg, worker) => {
    const { phone, body: rawBody, mediaUrl, channel } = msg;
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
            await sendMessage(phone, "You have no active tickets assigned.", channel);
        } else {
            const list = tickets.map(t => `• [${t.status.toUpperCase()}] ${t.ticket_id}: ${t.category} at ${t.address_ward}`).join('\n');
            await sendMessage(phone, `Your active tickets:\n${list}\n\nReply 'CLAIM <id>' to start or 'RESOLVE <id>' to close.`, channel);
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
            await sendMessage(phone, `Error: Could not claim ticket ${ticketId}. Is it assigned to you?`, channel);
        } else {
            await sendMessage(phone, `Ticket ${ticketId} is now IN PROGRESS. Resolve it once fixed.`, channel);
            // Notify citizen
            const { data: complaint } = await supabase.from('complaints').select('citizen_id, channel').eq('ticket_id', ticketId).single();
            if (complaint) {
                const { data: citizen } = await supabase.from('citizens').select('phone').eq('id', complaint.citizen_id).single();
                if (citizen) {
                    await sendMessage(citizen.phone, `Update: Worker ${worker.name} has started working on your complaint ${ticketId}.`, complaint.channel || 'whatsapp');
                }
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
            // SMS doesn't support photos easily, resolve immediately if on SMS
            if (channel === 'sms') {
                const { data: updatedTicket, error } = await supabase
                    .from('complaints')
                    .update({ 
                        status: 'resolved', 
                        resolved_at: new Date(),
                        updated_at: new Date()
                    })
                    .eq('id', ticket.id)
                    .select('ticket_id, citizen_id, channel')
                    .single();

                if (!error) {
                    await sendMessage(phone, `Ticket ${ticketId} RESOLVED successfully. Good job!`, channel);
                    await supabase.from('workers').update({ is_available: true }).eq('id', worker.id);
                    
                    const { data: citizen } = await supabase.from('citizens').select('phone').eq('id', updatedTicket.citizen_id).single();
                    if (citizen) {
                        await sendMessage(citizen.phone, `Congratulations! Your complaint ${ticketId} has been RESOLVED.`, updatedTicket.channel || 'whatsapp');
                    }
                } else {
                    await sendMessage(phone, "Error updating ticket status. Please try again.", channel);
                }
            } else {
                setSession(phone, { state: 'AWAIT_RESOLVE_PHOTO', ticket_id: ticketId, complaint_id: ticket.id, channel });
                await sendMessage(phone, `To resolve ${ticketId}, please send a completion PHOTO showing the fixed issue.`, channel);
            }
        } else {
            await sendMessage(phone, `Error: You cannot resolve ticket ${ticketId}.`, channel);
        }
        return;
    }

    // 4. PHOTO Handling (for RESOLVE)
    if (session.state === 'AWAIT_RESOLVE_PHOTO' && mediaUrl) {
        await sendMessage(phone, "Processing resolution photo... please wait.", channel);
        
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
                .select('ticket_id, citizen_id, channel')
                .single();

            if (!error) {
                await sendMessage(phone, `Ticket ${session.ticket_id} RESOLVED successfully. Good job!`, channel);
                // Mark worker as available again
                await supabase.from('workers').update({ is_available: true }).eq('id', worker.id);
                
                // Notify citizen
                const { data: citizen } = await supabase.from('citizens').select('phone').eq('id', ticket.citizen_id).single();
                if (citizen) {
                    await sendMessage(citizen.phone, `Congratulations! Your complaint ${session.ticket_id} has been RESOLVED. Resolution photo: ${publicUrl}`, ticket.channel || 'whatsapp');
                }
                clearSession(phone);
            } else {
                await sendMessage(phone, "Error updating ticket status. Please try again.", channel);
            }
        } else {
            await sendMessage(phone, "Failed to process photo. Please try sending it again.", channel);
        }
        return;
    }

    // Default Fallback
    await sendMessage(phone, "Commands: 'LIST', 'CLAIM <id>', 'RESOLVE <id>'.", channel);
};

module.exports = { handleWorkerWhatsApp };
