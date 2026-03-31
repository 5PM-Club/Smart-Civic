// backend/utils/geocode.js
const axios = require('axios');

const reverseGeocode = async (lat, lng) => {
    try {
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        const response = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`);
        
        if (response.data.status === 'OK' && response.data.results.length > 0) {
            const address = response.data.results[0].formatted_address;
            const components = response.data.results[0].address_components;
            
            // Extract ward/locality based on common patterns
            const sublocality = components.find(c => c.types.includes('sublocality_level_1'))?.long_name;
            const locality = components.find(c => c.types.includes('locality'))?.long_name;
            
            return { address, ward: sublocality || locality || null };
        }
        return null;
    } catch (err) {
        console.error('Geocoding error:', err.message);
        return null;
    }
};

module.exports = { reverseGeocode };
