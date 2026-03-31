// backend/handlers/ivrHandler.js — Vonage-compatible IVR Handler (Voice)
// NOTE: Vonage Voice API uses NCCO (Nexmo Call Control Objects) instead of TwiML
const supabase = require('../config/supabase');
const { getSession, setSession, clearSession } = require('../utils/sessionStore');
const { wardMap } = require('../utils/wardLookup');
const { categories, getDeptForCategory } = require('../utils/categoryDeptMap');
const { generateTicketId } = require('../utils/ticketId');
const { getSLADeadline } = require('../utils/slaHelper');
const { dispatchComplaint } = require('../services/dispatchService');

/**
 * Vonage Voice uses NCCO (JSON arrays) instead of Twilio's TwiML (XML).
 * Each handler returns an NCCO action array.
 */

const handleIVR = async (req, res) => {
    // Exotel expects XML (ExoML)
    res.set('Content-Type', 'text/xml');
    res.send(`
        <Response>
            <Play>https://smart-civic.com/audio/welcome.mp3</Play>
            <Gather action="${getBaseUrl(req)}/webhook/ivr/category" numDigits="1" timeout="10">
                <Say>Welcome to Smart Civic. Press 1 for Garbage, 2 for Pothole, 3 for Drainage, 4 for Water leak, or 5 for Streetlight.</Say>
            </Gather>
        </Response>
    `);
};

const handleIVRCategory = async (req, res) => {
    const digits = req.body.digits || req.body.Digits || '';
    const phone = req.body.From || req.body.from || '';

    const map = { '1': 'garbage', '2': 'pothole', '3': 'drainage', '4': 'water_leak', '5': 'streetlight' };
    const category = map[digits];

    res.set('Content-Type', 'text/xml');
    if (category) {
        setSession(phone, { state: 'IVR_ZONE', category });
        res.send(`
            <Response>
                <Gather action="${getBaseUrl(req)}/webhook/ivr/zone" numDigits="1">
                    <Say>You selected ${category.replace('_', ' ')}. Press 1 for Zone 1, 2 for Zone 2, 3 for Zone 3.</Say>
                </Gather>
            </Response>
        `);
    } else {
        res.send(`
            <Response>
                <Say>Invalid selection.</Say>
                <Redirect>${getBaseUrl(req)}/webhook/ivr</Redirect>
            </Response>
        `);
    }
};

const handleIVRZone = async (req, res) => {
    const digits = req.body.digits || req.body.Digits || '';
    const phone = req.body.From || req.body.from || '';
    let session = getSession(phone);

    res.set('Content-Type', 'text/xml');
    if (session) {
        session.zone = `Zone ${digits}`;
        setSession(phone, session);
        res.send(`
            <Response>
                <Gather action="${getBaseUrl(req)}/webhook/ivr/ward" numDigits="1">
                    <Say>Zone ${digits} confirmed. Please enter your ward number from 1 to 5.</Say>
                </Gather>
            </Response>
        `);
    } else {
        res.send(`<Response><Say>Session expired.</Say></Response>`);
    }
};

const handleIVRWard = async (req, res) => {
    const digits = req.body.digits || req.body.Digits || '';
    const phone = req.body.From || req.body.from || '';
    let session = getSession(phone);

    res.set('Content-Type', 'text/xml');
    if (session) {
        session.ward = `Ward ${digits}`;
        setSession(phone, session);
        res.send(`
            <Response>
                <Say>Thank you. After the beep, please state the location. Press hash when finished.</Say>
                <Record action="${getBaseUrl(req)}/webhook/ivr/recording" maxLength="30" finishOnKey="#" />
            </Response>
        `);
    } else {
        res.send(`<Response><Say>Session expired.</Say></Response>`);
    }
};

const handleIVRRecording = async (req, res) => {
    const phone = req.body.From || req.body.from || '';
    const recordingUrl = req.body.RecordingUrl || req.body.recording_url || '';
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
            description: `Voice Recording: ${recordingUrl}`,
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
                <Say>Your complaint has been registered. Your ticket ID is ${ticketId}. Goodbye.</Say>
                <Hangup />
            </Response>
        `);
    } else {
        res.send(`<Response><Say>Sorry, session expired.</Say></Response>`);
    }
};

/**
 * Helper: Get the base URL from the request for callback URLs
 */
function getBaseUrl(req) {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    return `${protocol}://${host}`;
}

module.exports = { 
    handleIVR, 
    handleIVRCategory, 
    handleIVRZone, 
    handleIVRWard, 
    handleIVRRecording 
};
