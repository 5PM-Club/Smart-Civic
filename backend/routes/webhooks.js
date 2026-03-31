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
        
        // Skip status updates (delivery receipts, read receipts, etc.)
        if (!data.from || !data.message) {
            return;
        }

        const phone = data.from.number || '';
        const messageContent = data.message.content || {};
        
        // Normalize incoming data into a simpler format our handlers understand
        const normalized = {
            phone: phone,
            body: messageContent.text || '',
            mediaUrl: messageContent.image?.url || null,
            latitude: messageContent.location?.lat || null,
            longitude: messageContent.location?.long || null,
            messageType: messageContent.type || 'text'
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
