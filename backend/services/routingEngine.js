// backend/services/routingEngine.js
const supabase = require('../config/supabase');

/**
 * Finds an available worker in a department.
 * Future expansion: Select based on proximity or current workload.
 */
const findAvailableWorker = async (departmentId) => {
    try {
        const { data: worker, error } = await supabase
            .from('workers')
            .select('*')
            .eq('department_id', departmentId)
            .eq('is_available', true)
            .limit(1)
            .single();

        if (error || !worker) return null;
        return worker;
    } catch (err) {
        console.error('Routing Engine error:', err.message);
        return null;
    }
};

module.exports = { findAvailableWorker };
