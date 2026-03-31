// backend/utils/storage.js
const axios = require('axios');
const supabase = require('../config/supabase');

/**
 * Downloads a media file from Twilio and uploads it to Supabase Storage.
 */
const uploadTwilioMediaToSupabase = async (twilioUrl, ticketId, type = 'completion') => {
    try {
        // 1. Download from Twilio
        const response = await axios({
            method: 'get',
            url: twilioUrl,
            responseType: 'arraybuffer'
        });

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

module.exports = { uploadTwilioMediaToSupabase };
