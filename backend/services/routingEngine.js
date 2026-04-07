// backend/services/routingEngine.js
const supabase = require('../config/supabase');

/**
 * Finds an available worker in a department.
 * Future expansion: Select based on proximity or current workload.
 */
const findAvailableWorker = async (departmentId) => {
    try {
        const { data: workers, error } = await supabase
            .from('workers')
            .select('*')
            .eq('department_id', departmentId)
            .eq('is_available', true);

        if (error || !workers || workers.length === 0) return null;

        // Simple Random Selection: Prevents everyone getting assigned to the first worker in the list
        const randomIndex = Math.floor(Math.random() * workers.length);
        return workers[randomIndex];
    } catch (err) {
        console.error('Routing Engine error:', err.message);
        return null;
    }
};

module.exports = { findAvailableWorker };
