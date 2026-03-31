const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { dispatchComplaint } = require('../services/dispatchService');
const { getSLADeadline } = require('../utils/slaHelper');

// GET /api/complaints
router.get('/', async (req, res) => {
    try {
        const { status, category, search, limit } = req.query;
        let query = supabase.from('complaints').select('*, workers(name, phone), departments(name)');
        
        if (status) query = query.eq('status', status);
        if (category) query = query.eq('category', category);

        query = query.order('created_at', { ascending: false });

        if (limit) query = query.limit(parseInt(limit));

        const { data, error } = await query;

        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/complaints/:id
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('complaints')
            .select('*, workers(name, phone), departments(name), status_history(*)')
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Complaint not found' });

        if (data.status_history) {
            data.status_history.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/complaints — web form submission
router.post('/', async (req, res) => {
    try {
        const { name, phone, category, zone, ward, locality, description, lat, lng, photo_url } = req.body;

        if (!phone || !category) {
            return res.status(400).json({ error: 'Phone and category are required' });
        }

        // Upsert citizen
        let { data: citizen } = await supabase
            .from('citizens')
            .select('*')
            .eq('phone', phone)
            .single();

        if (!citizen) {
            const { data: newCitizen, error: citizenErr } = await supabase
                .from('citizens')
                .insert([{ phone, name: name || null }])
                .select()
                .single();
            if (citizenErr) throw citizenErr;
            citizen = newCitizen;
        } else if (name && !citizen.name) {
            await supabase.from('citizens').update({ name }).eq('id', citizen.id);
        }

        // Generate ticket ID
        const ticketId = `CMP-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

        // Build address string
        const addressParts = [locality, ward, zone].filter(Boolean);
        const addressWard = addressParts.length > 0 ? addressParts.join(', ') : null;

        // Find department for category
        const categoryDeptMap = {
            garbage: 'Sanitation',
            pothole: 'Roads & PWD',
            drainage: 'Water & Sewage',
            water_leak: 'Water & Sewage',
            streetlight: 'Electricity Board'
        };

        let departmentId = null;
        const deptName = categoryDeptMap[category];
        if (deptName) {
            const { data: dept } = await supabase
                .from('departments')
                .select('id')
                .eq('name', deptName)
                .single();
            if (dept) departmentId = dept.id;
        }

        // Insert complaint
        const { data: complaint, error } = await supabase
            .from('complaints')
            .insert([{
                ticket_id: ticketId,
                category,
                description: description || `Reported via web form`,
                citizen_id: citizen.id,
                department_id: departmentId,
                address_ward: addressWard,
                lat: lat || null,
                lng: lng || null,
                photo_url: photo_url || null,
                channel: 'web',
                sla_deadline: getSLADeadline(24).toISOString(),
                status: 'open'
            }])
            .select('*, departments(name)')
            .single();

        if (error) throw error;

        // Trigger Auto-Dispatch
        dispatchComplaint(complaint.id);

        // Increment citizen complaint count
        try {
            await supabase.rpc('increment_complaint_count', { citizen_id_param: citizen.id });
        } catch (rpcErr) {
            console.log('[RPC FALLBACK] Updating complaint count manually.');
            await supabase.from('citizens')
                .update({ complaint_count: (citizen.complaint_count || 0) + 1 })
                .eq('id', citizen.id);
        }

        res.status(201).json(complaint);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/complaints/:id/status
router.patch('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, worker_id } = req.body;

        const updates = { status, updated_at: new Date() };
        if (worker_id !== undefined) updates.worker_id = worker_id;

        const { data, error } = await supabase
            .from('complaints')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
