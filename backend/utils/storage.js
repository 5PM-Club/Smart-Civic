// backend/utils/storage.js
const axios = require('axios');
const supabase = require('../config/supabase');

/**
 * Downloads a media file (from Vonage or elsewhere) and uploads it to Supabase Storage.
 */
const uploadMediaToSupabase = async (mediaUrl, ticketId, type = 'completion') => {
    try {
        // 1. Download from source (Vonage media URLs require auth)
        const axiosConfig = {
            method: 'get',
            url: mediaUrl,
            responseType: 'arraybuffer'
        };

        // Add Vonage auth if downloading from Vonage media API
        if (mediaUrl.includes('nexmo.com') || mediaUrl.includes('vonage.com')) {
            axiosConfig.auth = {
                username: process.env.VONAGE_API_KEY,
                password: process.env.VONAGE_API_SECRET
            };
        }

        const response = await axios(axiosConfig);

        const contentType = response.headers['content-type'];
        const extension = contentType.split('/')[1] || 'jpg';
        const fileName = `${type}/${ticketId}-${Date.now()}.${extension}`;
        const bucketName = 'complaint-photos'; 

        // 2. Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from(bucketName)
            .upload(fileName, response.data, {
                contentType,
                upsert: true
            });

        if (error) throw error;

        // 3. Get Public URL
        const { data: { publicUrl } } = supabase.storage
            .from(bucketName)
            .getPublicUrl(fileName);

        return publicUrl;
    } catch (err) {
        console.error('Storage upload error:', err.message);
        return null;
    }
};

module.exports = { uploadMediaToSupabase };
