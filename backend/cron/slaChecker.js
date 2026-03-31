const cron = require('node-cron');
const supabase = require('../config/supabase');
const { sendWhatsApp } = require('../utils/notify');

/**
 * Enhanced SLA Checker: Runs every 30 mins to monitor deadlines.
 */
const checkSLAs = async () => {
    console.log('[CRON] Starting SLA check...');
    try {
        const now = new Date().toISOString();

        // 1. ESCALATION: Past deadline and not resolved
        const { data: overdue, error: overdueErr } = await supabase
            .from('complaints')
            .select('*, workers(phone)')
            .lt('sla_deadline', now)
            .neq('status', 'resolved')
            .neq('status', 'escalated');

        if (overdueErr) throw overdueErr;

        for (const ticket of overdue) {
            console.log(`[CRON] Escalating Ticket ${ticket.ticket_id} (Past Deadline)`);
            await supabase
                .from('complaints')
                .update({ status: 'escalated', updated_at: new Date() })
                .eq('id', ticket.id);

            // Notify worker of escalation
            if (ticket.workers?.phone) {
                await sendWhatsApp(ticket.workers.phone, `⚠️ Ticket ${ticket.ticket_id} has been ESCALATED due to SLA violation.`);
            }
        }

        // 2. REMINDERS: Near deadline (within 4 hours)
        const fourHoursFromNow = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
        const { data: nearDeadline, error: nearErr } = await supabase
            .from('complaints')
            .select('*, workers(phone)')
            .lt('sla_deadline', fourHoursFromNow)
            .gt('sla_deadline', now)
            .in('status', ['assigned', 'in_progress']);

        if (nearErr) throw nearErr;

        for (const ticket of nearDeadline) {
            console.log(`[CRON] Sending Reminder for Ticket ${ticket.ticket_id}`);
            if (ticket.workers?.phone) {
                await sendWhatsApp(ticket.workers.phone, `⏳ Reminder: Ticket ${ticket.ticket_id} is due in less than 4 hours. Resolve it ASAP!`);
            }
        }

        console.log(`[CRON] SLA check completed. Escalated: ${overdue.length}, Reminded: ${nearDeadline.length}`);
    } catch (err) {
        console.error('[CRON] Error checking SLAs:', err.message);
    }
};

const startCronJobs = () => {
    // Run every 30 minutes
    cron.schedule('*/30 * * * *', checkSLAs);
    console.log('[CRON] Enhanced SLA monitoring scheduled.');
};

module.exports = { startCronJobs, checkSLAs };
