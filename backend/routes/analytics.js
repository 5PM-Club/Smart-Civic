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
        const [{ data: departments }, { data: complaints }] = await Promise.all([
            supabase.from('departments').select('id, name'),
            supabase.from('complaints').select('department_id, status')
        ]);

        if (!departments) return res.json([]);

        const stats = departments.map(dept => {
            const deptComplaints = (complaints || []).filter(c => c.department_id === dept.id);
            const total = deptComplaints.length;
            const resolved = deptComplaints.filter(c => c.status === 'resolved').length;
            const rate = total > 0 ? Math.round((resolved / total) * 100) : 0;

            return {
                name: dept.name,
                total,
                resolved,
                rate: `${rate}%`
            };
        });

        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/analytics/workers
router.get('/workers', async (req, res) => {
    try {
        const [{ data: workers }, { data: complaints }] = await Promise.all([
            supabase.from('workers').select('id, name, departments(name)'),
            supabase.from('complaints').select('worker_id, status')
        ]);

        if (!workers) return res.json([]);

        const stats = workers.map(w => {
            const workerComplaints = (complaints || []).filter(c => c.worker_id === w.id);
            const total = workerComplaints.length;
            const resolved = workerComplaints.filter(c => c.status === 'resolved').length;

            return {
                name: w.name,
                department: w.departments?.name || 'Unassigned',
                resolved,
                total_assigned: total
            };
        });

        stats.sort((a, b) => b.resolved - a.resolved);
        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
