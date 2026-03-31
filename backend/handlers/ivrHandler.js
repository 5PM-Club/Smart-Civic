// backend/handlers/ivrHandler.js — Vonage-compatible IVR Handler (Voice)
// NOTE: Vonage Voice API uses NCCO (Nexmo Call Control Objects) instead of TwiML
const supabase = require('../config/supabase');
const { getSession, setSession, clearSession } = require('../utils/sessionStore');
const { wardMap } = require('../utils/wardLookup');
const { categories, getDeptForCategory } = require('../utils/categoryDeptMap');
const { generateTicketId } = require('../utils/ticketId');
const { getSLADeadline } = require('../utils/slaHelper');
const { dispatchComplaint } = require('../services/dispatchService');
const { sendMessage } = require('../utils/notify');

/**
 * Vonage Voice uses NCCO (JSON arrays) instead of Twilio's TwiML (XML).
 * Each handler returns an NCCO action array.
 */

const handleIVR = async (req, res) => {
    console.log(`[IVR] Incoming call from: ${req.body.From || req.body.from}`);
    res.set('Content-Type', 'text/xml');
    res.send(`
        <Response>
            <Gather action="${getBaseUrl(req)}/webhook/ivr/category" numDigits="1" timeout="10" method="POST">
                <Say voice="alice">Welcome to Smart Civic. For Garbage collection, press 1. For Potholes, press 2. For Drainage, press 3. For Water leaks, press 4. For Streetlights, press 5.</Say>
            </Gather>
            <Say>We did not receive any input. Goodbye.</Say>
            <Hangup />
        </Response>
    `);
};

const handleIVRCategory = async (req, res) => {
    const digits = req.body.digits || req.body.Digits || '';
    const phone = req.body.From || req.body.from || '';
    console.log(`[IVR] Category selection: ${digits} from ${phone}`);

    const map = { '1': 'garbage', '2': 'pothole', '3': 'drainage', '4': 'water_leak', '5': 'streetlight' };
    const category = map[digits];

    res.set('Content-Type', 'text/xml');
    if (category) {
        setSession(phone, { state: 'IVR_ZONE', category });
        res.send(`
            <Response>
                <Gather action="${getBaseUrl(req)}/webhook/ivr/zone" numDigits="1" method="POST">
                    <Say voice="alice">You selected ${category.replace('_', ' ')}. Please select your zone. Press 1 for Zone 1, 2 for Zone 2, or 3 for Zone 3.</Say>
                </Gather>
                <Say>Input timeout. Goodbye.</Say>
                <Hangup />
            </Response>
        `);
    } else {
        res.send(`
            <Response>
                <Say voice="alice">Invalid selection. Let's try again.</Say>
                <Redirect method="POST">${getBaseUrl(req)}/webhook/ivr</Redirect>
            </Response>
        `);
    }
};

const handleIVRZone = async (req, res) => {
    const digits = req.body.digits || req.body.Digits || '';
    const phone = req.body.From || req.body.from || '';
    console.log(`[IVR] Zone selection: ${digits} from ${phone}`);
    let session = getSession(phone);

    res.set('Content-Type', 'text/xml');
    if (session) {
        session.zone = `Zone ${digits}`;
        setSession(phone, session);
        res.send(`
            <Response>
                <Gather action="${getBaseUrl(req)}/webhook/ivr/ward" numDigits="1" method="POST">
                    <Say voice="alice">Zone ${digits} confirmed. Please enter your ward number from 1 to 5.</Say>
                </Gather>
                <Say>Input timeout. Goodbye.</Say>
                <Hangup />
            </Response>
        `);
    } else {
        res.send(`<Response><Say>Session expired. Please call again.</Say><Hangup /></Response>`);
    }
};

const handleIVRWard = async (req, res) => {
    const digits = req.body.digits || req.body.Digits || '';
    const phone = req.body.From || req.body.from || '';
    console.log(`[IVRWard] Ward selection: ${digits} from ${phone}`);
    let session = getSession(phone);

    res.set('Content-Type', 'text/xml');
    if (session) {
        session.ward = `Ward ${digits}`;
        setSession(phone, session);
        res.send(`
            <Response>
                <Say voice="alice">Thank you. After the beep, please state the exact location and issue. Press any key when finished.</Say>
                <Record action="${getBaseUrl(req)}/webhook/ivr/recording" maxLength="30" finishOnKey="#" playBeep="true" method="POST" />
            </Response>
        `);
    } else {
        res.send(`<Response><Say>Session expired.</Say><Hangup /></Response>`);
    }
};

const handleIVRRecording = async (req, res) => {
    const phone = req.body.From || req.body.from || '';
    const recordingUrl = req.body.RecordingUrl || req.body.recording_url || '';
    console.log(`[IVR] Recording received for ${phone}: ${recordingUrl}`);
    let session = getSession(phone);

    res.set('Content-Type', 'text/xml');
    if (session) {
        const ticketId = generateTicketId();
        const addressWard = `${session.zone}, ${session.ward}`;
        const deptName = getDeptForCategory(session.category);
        
        let { data: citizen } = await supabase.from('citizens').select('id').eq('phone', phone).single();
        if (!citizen) {
            const { data: newCitizen } = await supabase.from('citizens').insert([{ phone }]).select().single();
            citizen = newCitizen;
        }

        let departmentId = null;
        const { data: dept } = await supabase.from('departments').select('id').eq('name', deptName).single();
        if (dept) departmentId = dept.id;

        await supabase.from('complaints').insert([{
            ticket_id: ticketId,
            category: session.category,
            description: `Voice Recording (Local): ${recordingUrl}`,
            address_ward: addressWard,
            channel: 'ivr',
            citizen_id: citizen.id,
            department_id: departmentId,
            sla_deadline: getSLADeadline(24).toISOString(),
            status: 'open'
        }]);

        clearSession(phone);
        res.send(`
            <Response>
                <Say voice="alice">Thank you. Your complaint has been registered. Your ticket ID is ${ticketId.split('').join(' ')}. Goodbye.</Say>
                <Hangup />
            </Response>
        `);
    } else {
        res.send(`<Response><Say>Sorry, session expired.</Say><Hangup /></Response>`);
    }
};

const handleIVRInstantWhatsApp = async (req, res) => {
    try {
        const body = req.body || {};
        const query = req.query || {};

        const phoneRaw = body.From || query.From || body.from || query.from || '';
        const digitRaw = body.digits || query.digits || body.Digits || query.Digits || query.digit || '';

        if (!phoneRaw) {
            console.error('[IVR ERROR] No phone number found in Exotel request.');
            return res.status(200).send('ERR: No Phone'); 
        }

        // Normalize phone: Ensure it has a '+' prefix for our database/session store
        let phone = phoneRaw.trim();
        if (!phone.startsWith('+')) phone = `+${phone}`;

        // Normalize digit: Get the first character in case it's "1#"
        const digit = (digitRaw.toString() || '').replace(/[^0-9]/g, '')[0] || '';

        console.log(`[IVR-NORMALIZED] User: ${phone}, Digit Pressed: ${digit}`);

        const map = { '1': 'garbage', '2': 'pothole', '3': 'drainage', '4': 'water_leak', '5': 'streetlight' };
        const category = map[digit] || 'general';

        // 1. Ensure Citizen exists
        console.log(`[IVR-LOG] Checking citizen in Supabase for ${phone}`);
        let { data: citizen, error: citError } = await supabase.from('citizens').select('*').eq('phone', phone).single();
        
        if (!citizen) {
            console.log(`[IVR-LOG] No citizen found. Attempting to insert...`);
            const { data: newCitizen, error: insError } = await supabase.from('citizens').insert([{ phone }]).select().single();
            if (insError) {
                console.error(`[IVR-ERR] Supabase Insert Failed:`, insError.message);
                throw new Error(`Citizen creation failed: ${insError.message}`);
            }
            citizen = newCitizen;
            console.log(`[IVR-LOG] New citizen created: ${citizen.id}`);
        }

        // 2. Set Session state
        console.log(`[IVR-LOG] Setting session for ${phone}`);
        setSession(phone, { 
            state: 'AWAIT_LOCATION', 
            category: category,
            channel: 'whatsapp'
        });

        // 3. Respond to Exotel IMMEDIATELY (Non-blocking)
        // This ensures the call ends gracefully and doesn't timeout while waiting for Vonage
        res.status(200).send('OK');
        console.log(`[IVR-LOG] Exotel Response Sent. Dispatching message in background...`);

        // 4. Send message in the background
        const welcomeMsg = `🚨 *SMART CIVIC REPORT* 🚨\n\nYou selected *${category.toUpperCase().replace('_', ' ')}*.\n\nPlease send your **Live Location** or type your **Ward Name** now.`;
        
        try {
            const messageId = await sendMessage(phone, welcomeMsg, 'whatsapp');
            
            if (messageId) {
                console.log(`[IVR SUCCESS] WhatsApp sent: ${messageId}`);
            } else {
                console.log(`[IVR-WARNING] WhatsApp failed/opt-out. Trying SMS...`);
                await sendMessage(phone, `Smart Civic: You selected ${category}. Please reply with your Ward to continue.`, 'sms');
            }
        } catch (msgErr) {
            console.error(`[IVR-MSG-ERR] Async message dispatch failed:`, msgErr.message);
        }
    } catch (err) {
        console.error(`[IVR CRASH] Fatal Error Line: ${err.stack}`);
        if (!res.headersSent) res.status(200).send('OK'); // Always send OK to Exotel
    }
};

/**
 * Helper: Get the base URL from the request for callback URLs
 */
function getBaseUrl(req) {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    let host = req.headers['x-forwarded-host'] || req.headers.host;
    // Handle comma-separated hosts from proxies
    if (host && host.includes(',')) {
        host = host.split(',')[0].trim();
    }
    return `${protocol}://${host}`;
}

module.exports = { 
    handleIVR, 
    handleIVRCategory, 
    handleIVRZone, 
    handleIVRWard, 
    handleIVRRecording,
    handleIVRInstantWhatsApp
};
