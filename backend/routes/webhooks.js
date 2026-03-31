// backend/routes/webhooks.js — Vonage Webhook Routes
const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { handleWhatsApp } = require('../handlers/whatsappHandler');
const { handleWorkerWhatsApp } = require('../handlers/workerHandler');
const { 
    handleIVR, 
    handleIVRCategory, 
    handleIVRZone, 
    handleIVRWard, 
    handleIVRRecording 
} = require('../handlers/ivrHandler');

// ========== VONAGE WHATSAPP WEBHOOKS ==========

// POST /webhook/whatsapp/inbound — Receives incoming WhatsApp messages from Vonage
router.post('/whatsapp/inbound', async (req, res) => {
    // Vonage requires an immediate 200 OK response
    res.status(200).send('OK');

    try {
        const data = req.body;
        console.log(`[Webhook Debug] Raw WhatsApp Data:`, JSON.stringify(data));
        
        // Skip status updates (they don't have text or message object)
        if (!data.from) {
            return;
        }

        // Handle string format (standard Vonage Sandbox) vs object format
        const phone = typeof data.from === 'object' ? (data.from.number || '') : (data.from || '');
        
        // Handle various Message body formats
        let bodyText = data.text || '';
        let mediaUrl = data.image?.url || data.image || null;
        let lat = data.location?.lat || null;
        let long = data.location?.long || null;
        let msgType = data.message_type || 'text';

        // Fallback or old format support
        if (data.message && data.message.content) {
            bodyText = data.message.content.text || bodyText;
            mediaUrl = data.message.content.image?.url || mediaUrl;
            lat = data.message.content.location?.lat || lat;
            long = data.message.content.location?.long || long;
            msgType = data.message.content.type || msgType;
        }
        
        // If there's absolutely no text or media, ignore
        if (!bodyText && !mediaUrl) {
           return;
        }

        // Normalize incoming data into a simpler format our handlers understand
        const normalized = {
            phone: phone,
            body: bodyText,
            mediaUrl: mediaUrl,
            latitude: lat,
            longitude: long,
            messageType: msgType
        };

        // 1. Identify: Is this a Worker or a Citizen?
        const { data: worker } = await supabase
            .from('workers')
            .select('*')
            .eq('phone', phone.startsWith('+') ? phone : `+${phone}`)
            .single();

        if (worker) {
            console.log(`[AUTH] Worker ${worker.name} identified.`);
            return await handleWorkerWhatsApp(normalized, worker);
        }

        // 2. Default to Citizen Handler
        await handleWhatsApp(normalized);
    } catch (err) {
        console.error('WhatsApp webhook error:', err.message);
    }
});

// POST /webhook/whatsapp/status — Receives delivery status updates from Vonage
router.post('/whatsapp/status', (req, res) => {
    // Just acknowledge and log
    const status = req.body.status || 'unknown';
    const messageUuid = req.body.message_uuid || '';
    console.log(`[Vonage Status] Message ${messageUuid}: ${status}`);
    res.status(200).send('OK');
});

// ========== SMS WEBHOOK ==========
router.post('/sms', async (req, res) => {
    // Vonage SMS inbound format
    const from = req.body.msisdn || req.body.from || '';
    const text = req.body.text || '';
    console.log(`[SMS Inbound] From: ${from}, Text: ${text}`);
    
    // For prototype: treat SMS the same as WhatsApp
    const normalized = {
        phone: from,
        body: text,
        mediaUrl: null,
        latitude: null,
        longitude: null,
        messageType: 'text'
    };

    try {
        await handleWhatsApp(normalized);
        res.status(200).send('OK');
    } catch (err) {
        console.error('SMS webhook error:', err.message);
        res.status(200).send('OK');
    }
});

// ========== IVR ROUTES (Kept for future use — requires Vonage Voice setup) ==========
router.post('/ivr', handleIVR);
router.post('/ivr/category', handleIVRCategory);
router.post('/ivr/zone', handleIVRZone);
router.post('/ivr/ward', handleIVRWard);
router.post('/ivr/recording', handleIVRRecording);

module.exports = router;
