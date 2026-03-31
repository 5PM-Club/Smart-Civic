const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// GET /api/tickets/:ticketId/status
router.get('/:ticketId/status', async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { data, error } = await supabase
            .from('complaints')
            .select(`
                *,
                departments(name),
                workers(name, phone),
                status_history(status, notes, created_at)
            `)
            .eq('ticket_id', ticketId)
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Ticket not found' });

        // Sort status history descending
        if (data.status_history) {
            data.status_history.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
