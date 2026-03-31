// backend/utils/slaHelper.js
/**
 * Calculates the SLA deadline based on working hours.
 * WORKING_HOURS_START and WORKING_HOURS_END from env.
 */

const getSLADeadline = (hours) => {
    const startHour = parseInt(process.env.WORKING_HOURS_START || 9);
    const endHour = parseInt(process.env.WORKING_HOURS_END || 17);
    const dayHours = endHour - startHour;

    let now = new Date();
    let currentHour = now.getHours();

    // If submitted after hours, start from next day's opening
    if (currentHour >= endHour) {
        now.setDate(now.getDate() + 1);
        now.setHours(startHour, 0, 0, 0);
    } else if (currentHour < startHour) {
        now.setHours(startHour, 0, 0, 0);
    }

    // Simple implementation for now (can expand to properly skip weekends)
    const msPerHour = 60 * 60 * 1000;
    const deadline = new Date(now.getTime() + (hours * msPerHour));

    return deadline;
};

module.exports = { getSLADeadline };
