// backend/utils/wardLookup.js
/**
 * JSON mapping for IVR codes and location keywords to zones/wards.
 * This helper resolves codes from IVR 'Gather' or WhatsApp keywords.
 */

const wardMap = {
    "1": { zone: "Zone 1", ward: "Ward 1" },
    "2": { zone: "Zone 1", ward: "Ward 2" },
    "3": { zone: "Zone 2", ward: "Ward 3" },
    "4": { zone: "Zone 2", ward: "Ward 4" },
    "5": { zone: "Zone 3", ward: "Ward 5" },
};

const resolveLocation = (input) => {
    // Check if input is a known IVR code
    if (wardMap[input]) {
        return wardMap[input];
    }
    
    // Fallback for keyword-based search
    const lowerInput = input.toLowerCase();
    if (lowerInput.includes('pincode 110001')) return { zone: 'New Delhi', ward: 'Ward 01' };
    
    return null;
};

module.exports = { wardMap, resolveLocation };
