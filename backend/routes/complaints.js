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

        // Auto-Dispatch enabled
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

const { sendMessage } = require('../utils/notify');
const { getTranslation } = require('../utils/translations');
const { categories } = require('../utils/categoryDeptMap');

// PATCH /api/complaints/:id/status
router.patch('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, worker_id } = req.body;

        const updates = { status, updated_at: new Date() };
        if (worker_id !== undefined) updates.worker_id = worker_id;

        const { data: complaint, error } = await supabase
            .from('complaints')
            .update(updates)
            .eq('id', id)
            .select('*, citizens:citizen_id(phone, preferred_language), workers:worker_id(name, phone)')
            .single();

        if (error) {
            console.error(`[Status Update Error] ID: ${id}, Error:`, error);
            throw error;
        }

        console.log(`[Status Debug] Update successful for Ticket: ${complaint.ticket_id}`);
        console.log(`[Status Debug] Citizen:`, JSON.stringify(complaint.citizens));
        console.log(`[Status Debug] Worker:`, JSON.stringify(complaint.workers));

        // If a worker is being assigned, notify both the worker and the citizen
        if (worker_id && complaint.workers && complaint.citizens) {
            const lang = complaint.citizens.preferred_language || 'en';
            const cat = categories[complaint.category];
            const localizedCatName = lang === 'ta' ? cat?.name_ta : (lang === 'hi' ? cat?.name_hi : cat?.name);

            // 1. Notify Worker (Always English for admin technical details)
            const workerMsg = `Hello ${complaint.workers.name}! A new ticket ${complaint.ticket_id} has been assigned to you.\nCategory: ${complaint.category}\nLocation: ${complaint.address_ward || 'N/A'}\nDescription: ${complaint.description}\nPlease resolve this within the SLA deadline.`;
            const workerSideNum = process.env.VONAGE_WORKER_NUMBER;
            console.log(`[Notification] Sending to Worker: ${complaint.workers.phone} from ${workerSideNum || 'default'}`);
            await sendMessage(complaint.workers.phone, workerMsg, 'whatsapp', complaint.photo_url, workerSideNum);

            // 2. Notify Citizen (In their preferred language)
            const citizenMsg = getTranslation(lang, 'worker_assigned', {
                workerName: complaint.workers.name,
                category: localizedCatName || complaint.category,
                ticketId: complaint.ticket_id
            });
            console.log(`[Notification] Sending to Citizen (${lang}): ${complaint.citizens.phone}`);
            await sendMessage(complaint.citizens.phone, citizenMsg, complaint.channel || 'whatsapp');

            // 3. Update Worker Availability
            await supabase.from('workers').update({ is_available: false }).eq('id', worker_id);
        }

        // If marked as resolved by admin, notify the citizen
        if (status === 'resolved' && complaint.citizens && complaint.citizens.phone) {
            const lang = complaint.citizens.preferred_language || 'en';
            const message = getTranslation(lang, 'status_update', { 
                ticketId: complaint.ticket_id, 
                status: lang === 'ta' ? 'தீர்க்கப்பட்டது (RESOLVED)' : 'RESOLVED' 
            });
            console.log(`[Notification] Sending Resolution to Citizen: ${complaint.citizens.phone}`);
            await sendMessage(complaint.citizens.phone, message, complaint.channel || 'whatsapp');
        }

        res.json(complaint);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
