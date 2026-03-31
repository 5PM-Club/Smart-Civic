// backend/utils/categoryDeptMap.js
/**
 * Official mapping of complaint categories to departments.
 */

const categories = {
    garbage: { name: 'Garbage Collection', name_ta: 'குப்பை சேகரிப்பு', name_hi: 'कचरा संग्रहण', dept: 'Sanitation' },
    pothole: { name: 'Pothole Repair', name_ta: 'குழி சரிசெய்தல்', name_hi: 'गड्ढे की मरम्मत', dept: 'Roads & PWD' },
    drainage: { name: 'Drainage Overflow', name_ta: 'சாக்கடை நிரம்பி வழிதல்', name_hi: 'नाली अतिप्रवाह', dept: 'Water & Sewage' },
    water_leak: { name: 'Water Pipe Leak', name_ta: 'தண்ணீர் குழாய் கசிவு', name_hi: 'पानी के पाइप का रिसाव', dept: 'Water & Sewage' },
    streetlight: { name: 'Streetlight Fault', name_ta: 'தெருவிளக்கு பழுது', name_hi: 'स्ट्रीटलाइट खराबी', dept: 'Electricity Board' }
};

const getDeptForCategory = (category) => {
    return categories[category]?.dept || 'General Administration';
};

module.exports = { categories, getDeptForCategory };
