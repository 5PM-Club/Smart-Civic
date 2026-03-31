const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// GET /api/analytics/summary
router.get('/summary', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { count: totalCount } = await supabase
            .from('complaints')
            .select('*', { count: 'exact', head: true });

        const { count: todayCount } = await supabase
            .from('complaints')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', today.toISOString());

        const { count: resolvedCount } = await supabase
            .from('complaints')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'resolved');

        const { count: escalatedCount } = await supabase
            .from('complaints')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'escalated');
            
        const { data: categoryData } = await supabase
            .from('complaints')
            .select('category');
            
        const categoryCounts = categoryData ? categoryData.reduce((acc, curr) => {
            acc[curr.category] = (acc[curr.category] || 0) + 1;
            return acc;
        }, {}) : {};

        const chartData = Object.entries(categoryCounts).map(([name, count]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1).replace('_', ' '),
            count
        }));

        res.json({
            total_complaints: totalCount || 0,
            today_complaints: todayCount || 0,
            resolved_complaints: resolvedCount || 0,
            escalated_complaints: escalatedCount || 0,
            complaints_by_category: categoryCounts,
            chart_data: chartData
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/analytics/leaderboard
router.get('/leaderboard', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('citizens')
            .select('id, name, phone, complaint_count')
            .order('complaint_count', { ascending: false })
            .limit(10);
            
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/analytics/departments
router.get('/departments', async (req, res) => {
    try {
        const { data: departments, error } = await supabase
            .from('departments')
            .select('id, name');

        if (error) throw error;

        const deptStats = [];
        for (const dept of departments) {
            const { count: totalCount } = await supabase
                .from('complaints')
                .select('*', { count: 'exact', head: true })
                .eq('department_id', dept.id);

            const { count: resolvedCount } = await supabase
                .from('complaints')
                .select('*', { count: 'exact', head: true })
                .eq('department_id', dept.id)
                .eq('status', 'resolved');

            const rate = totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 0;

            deptStats.push({
                name: dept.name,
                total: totalCount || 0,
                resolved: resolvedCount || 0,
                rate: `${rate}%`
            });
        }

        res.json(deptStats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/analytics/workers
router.get('/workers', async (req, res) => {
    try {
        const { data: workers, error } = await supabase
            .from('workers')
            .select('id, name, departments(name)');

        if (error) throw error;

        const workerStats = [];
        for (const worker of workers) {
            const { count: resolvedCount } = await supabase
                .from('complaints')
                .select('*', { count: 'exact', head: true })
                .eq('worker_id', worker.id)
                .eq('status', 'resolved');

            const { count: totalAssigned } = await supabase
                .from('complaints')
                .select('*', { count: 'exact', head: true })
                .eq('worker_id', worker.id);

            workerStats.push({
                name: worker.name,
                department: worker.departments?.name || 'Unassigned',
                resolved: resolvedCount || 0,
                total_assigned: totalAssigned || 0
            });
        }

        workerStats.sort((a, b) => b.resolved - a.resolved);
        res.json(workerStats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
