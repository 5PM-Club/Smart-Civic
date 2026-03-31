// backend/utils/categoryDeptMap.js
/**
 * Official mapping of complaint categories to departments.
 */

const categories = {
    garbage: { name: 'Garbage Collection', dept: 'Sanitation' },
    pothole: { name: 'Pothole Repair', dept: 'Roads & PWD' },
    drainage: { name: 'Drainage Overflow', dept: 'Water & Sewage' },
    water_leak: { name: 'Water Pipe Leak', dept: 'Water & Sewage' },
    streetlight: { name: 'Streetlight Fault', dept: 'Electricity Board' }
};

const getDeptForCategory = (category) => {
    return categories[category]?.dept || 'General Administration';
};

module.exports = { categories, getDeptForCategory };
