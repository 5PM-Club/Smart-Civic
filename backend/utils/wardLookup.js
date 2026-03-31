// backend/utils/wardLookup.js
/**
 * JSON mapping for IVR codes and location keywords to zones/wards.
 * This helper resolves codes from IVR 'Gather' or WhatsApp keywords.
 */

const wardMap = {
    "1": { zone: "Virudhunagar", ward: "Town Ward 1" },
    "2": { zone: "Aruppukottai", ward: "Ward 1" },
    "3": { zone: "Sathur", ward: "Ward 1" },
    "4": { zone: "Sivakasi", ward: "Ward 1" },
    "5": { zone: "Rajapalayam", ward: "Ward 1" },
};

const resolveLocation = (input) => {
    // Check if input is a known IVR code
    if (wardMap[input]) {
        return wardMap[input];
    }
    
    // Fallback for keyword-based search
    const lowerInput = input.toLowerCase();
    if (lowerInput.includes('aruppukottai')) return { zone: 'Aruppukottai', ward: 'Main' };
    if (lowerInput.includes('sathur')) return { zone: 'Sathur', ward: 'Main' };
    
    return { zone: 'Virudhunagar', ward: 'General' };
};

module.exports = { wardMap, resolveLocation };
