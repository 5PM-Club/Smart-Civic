// backend/utils/notify.js — Vonage-based notification utility
const axios = require('axios');

const VONAGE_API = 'https://messages-sandbox.nexmo.com/v1/messages';

/**
 * Sends a WhatsApp message via Vonage Messages API (Sandbox)
 */
const sendWhatsApp = async (to, body, mediaUrl = null) => {
    try {
        // Clean the phone number (remove any 'whatsapp:' prefix from old Twilio format)
        const cleanTo = to.replace('whatsapp:', '').replace('+', '');
        const cleanFrom = (process.env.VONAGE_WHATSAPP_NUMBER || '14157386102').replace('+', '');

        const payload = {
            from: cleanFrom,
            to: cleanTo,
            message_type: 'text',
            text: body,
            channel: 'whatsapp'
        };

        // If there's an image to send, change message type
        if (mediaUrl) {
            payload.message_type = 'image';
            payload.image = { url: mediaUrl, caption: body };
            delete payload.text;
        }

        const response = await axios.post(VONAGE_API, payload, {
            auth: {
                username: process.env.VONAGE_API_KEY,
                password: process.env.VONAGE_API_SECRET
            },
            headers: { 'Content-Type': 'application/json' }
        });

        console.log(`[Vonage] WhatsApp sent to ${cleanTo}. ID: ${response.data.message_uuid}`);
        return response.data.message_uuid;
    } catch (err) {
        console.error('[Vonage] WhatsApp error:', err.response?.data || err.message);
        return null;
    }
};

/**
 * Sends an SMS message via Vonage SMS API
 */
const sendSMS = async (to, body) => {
    try {
        const cleanTo = to.replace('+', '');
        const cleanFrom = (process.env.VONAGE_SMS_NUMBER || process.env.VONAGE_WHATSAPP_NUMBER || '14157386102').replace('+', '');

        const response = await axios.post('https://rest.nexmo.com/sms/json', {
            from: cleanFrom,
            to: cleanTo,
            text: body,
            api_key: process.env.VONAGE_API_KEY,
            api_secret: process.env.VONAGE_API_SECRET
        }, {
            headers: { 'Content-Type': 'application/json' }
        });

        const msg = response.data.messages?.[0];
        if (msg && msg.status === '0') {
            console.log(`[Vonage] SMS sent to ${cleanTo}. ID: ${msg['message-id']}`);
            return msg['message-id'];
        } else {
            console.error('[Vonage] SMS failed:', msg?.['error-text'] || 'Unknown error');
            return null;
        }
    } catch (err) {
        console.error('[Vonage] SMS error:', err.response?.data || err.message);
        return null;
    }
};

/**
 * Unified sender that routes to the correct channel
 */
const sendMessage = async (to, body, channel = 'whatsapp', mediaUrl = null) => {
    if (channel === 'sms') {
        return await sendSMS(to, body);
    }
    return await sendWhatsApp(to, body, mediaUrl);
};

module.exports = { sendWhatsApp, sendSMS, makeCall, sendMessage };
