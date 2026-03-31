const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// GET /api/workers
router.get('/', async (req, res) => {
    try {
        const { department_id } = req.query;
        let query = supabase.from('workers').select('*, departments(name)');
        
        if (department_id) {
            query = query.eq('department_id', department_id);
        }

        const { data, error } = await query.order('name', { ascending: true });

        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/workers — create worker
router.post('/', async (req, res) => {
    try {
        const { name, phone, department } = req.body;

        if (!name || !phone) {
            return res.status(400).json({ error: 'Name and phone are required' });
        }

        // Find department by name
        let departmentId = null;
        if (department) {
            const { data: dept } = await supabase
                .from('departments')
                .select('id')
                .eq('name', department)
                .single();
            
            if (dept) {
                departmentId = dept.id;
            } else {
                // Create department if it doesn't exist
                const { data: newDept } = await supabase
                    .from('departments')
                    .insert([{ name: department }])
                    .select()
                    .single();
                if (newDept) departmentId = newDept.id;
            }
        }

        const { data, error } = await supabase
            .from('workers')
            .insert([{ name, phone, department_id: departmentId }])
            .select('*, departments(name)')
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/workers/:id/reassign
router.patch('/:id/reassign', async (req, res) => {
    try {
        const { id } = req.params;
        const { department_id, is_available } = req.body;

        const updates = {};
        if (department_id !== undefined) updates.department_id = department_id;
        if (is_available !== undefined) updates.is_available = is_available;

        const { data, error } = await supabase
            .from('workers')
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

// DELETE /api/workers/:id
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('workers')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
