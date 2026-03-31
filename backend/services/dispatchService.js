// backend/services/dispatchService.js
const supabase = require('../config/supabase');
const { findAvailableWorker } = require('./routingEngine');
const { sendWhatsApp } = require('../utils/notify');

/**
 * Assigns a worker to a complaint and sends notifications.
 */
const dispatchComplaint = async (complaintId) => {
    try {
        // 1. Fetch complaint details
        const { data: complaint, error: fetchErr } = await supabase
            .from('complaints')
            .select('*, citizens(phone), departments(name)')
            .eq('id', complaintId)
            .single();

        if (fetchErr || !complaint) throw new Error('Complaint not found');

        if (!complaint.department_id) {
            console.log(`[DISPATCH] No department assigned to ticket ${complaint.ticket_id}. Skipping auto-dispatch.`);
            return;
        }

        // 2. Find Available Worker
        const worker = await findAvailableWorker(complaint.department_id);

        if (!worker) {
            console.log(`[DISPATCH] No available workers in ${complaint.departments.name}. Ticket ${complaint.ticket_id} remains OPEN.`);
            return;
        }

        // 3. Update Complaint
        const { error: updateErr } = await supabase
            .from('complaints')
            .update({
                worker_id: worker.id,
                status: 'assigned',
                updated_at: new Date()
            })
            .eq('id', complaint.id);

        if (updateErr) throw updateErr;

        // 4. Mark Worker as Unavailable
        await supabase.from('workers').update({ is_available: false }).eq('id', worker.id);

        // 5. Notify Worker
        const workerMsg = `Hello ${worker.name}! A new ticket ${complaint.ticket_id} has been assigned to you.\nCategory: ${complaint.category}\nLocation: ${complaint.address_ward}\nDescription: ${complaint.description}\nPlease resolve this within the SLA deadline.`;
        await sendWhatsApp(worker.phone, workerMsg, complaint.photo_url);

        // 6. Notify Citizen
        const citizenMsg = `Update: A worker (${worker.name}) has been assigned to your complaint ${complaint.ticket_id}. They will contact you if needed.`;
        await sendWhatsApp(complaint.citizens.phone, citizenMsg);

        console.log(`[DISPATCH] Ticket ${complaint.ticket_id} assigned to ${worker.name}.`);
    } catch (err) {
        console.error('Dispatch error:', err.message);
    }
};

module.exports = { dispatchComplaint };
