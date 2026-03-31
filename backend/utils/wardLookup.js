// backend/utils/wardLookup.js
/**
 * JSON mapping for IVR codes and location keywords to zones/wards.
 * This helper resolves codes from IVR 'Gather' or WhatsApp keywords.
 */

const wardMap = {
    "1": { zone: "Virudhunagar Town", ward: "Main" },
    "2": { zone: "Aruppukkottai", ward: "Main" },
    "3": { zone: "Sattur", ward: "Main" },
    "4": { zone: "Sivakasi", ward: "Main" },
    "5": { zone: "Rajapalayam", ward: "Main" },
    "6": { zone: "Srivilliputhur", ward: "Main" },
};

const resolveLocation = (input) => {
    // Check if input is a known IVR code
    if (wardMap[input]) {
        return wardMap[input];
    }
    
    // Fallback for keyword-based search
    const lowerInput = input.toLowerCase();
    if (lowerInput.includes('aruppu')) return { zone: 'Aruppukkottai', ward: 'Main' };
    if (lowerInput.includes('sattur')) return { zone: 'Sattur', ward: 'Main' };
    if (lowerInput.includes('sivakasi')) return { zone: 'Sivakasi', ward: 'Main' };
    if (lowerInput.includes('raja')) return { zone: 'Rajapalayam', ward: 'Main' };
    if (lowerInput.includes('srivi')) return { zone: 'Srivilliputhur', ward: 'Main' };
    
    return { zone: 'Virudhunagar Town', ward: 'General' };
};

module.exports = { wardMap, resolveLocation };
