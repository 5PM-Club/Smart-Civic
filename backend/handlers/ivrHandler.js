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
    // Vonage NCCO: Talk + Input (replaces twiml.gather + twiml.say)
    const ncco = [
        {
            action: 'talk',
            text: 'Welcome to Smart Civic platform. Please select the category of your complaint. Press 1 for Garbage collection, 2 for Pothole repair, 3 for Drainage overflow, 4 for Water pipe leak, or 5 for Streetlight faults.',
            bargeIn: true
        },
        {
            action: 'input',
            type: ['dtmf'],
            dtmf: { maxDigits: 1, timeOut: 10 },
            eventUrl: [`${getBaseUrl(req)}/webhook/ivr/category`]
        }
    ];
    
    res.json(ncco);
};

const handleIVRCategory = async (req, res) => {
    const digits = req.body.dtmf?.digits || req.body.Digits || '';
    const phone = req.body.from || req.body.From || '';

    console.log(`[IVR DEBUG] Received digits: ${digits} from ${phone}`);

    const map = { '1': 'garbage', '2': 'pothole', '3': 'drainage', '4': 'water_leak', '5': 'streetlight' };
    const category = map[digits];

    if (category) {
        setSession(phone, { state: 'IVR_ZONE', category });
        
        const ncco = [
            {
                action: 'talk',
                text: `You have selected ${category.replace('_', ' ')}. Please select your zone. Press 1 for Zone 1, 2 for Zone 2, 3 for Zone 3.`,
                bargeIn: true
            },
            {
                action: 'input',
                type: ['dtmf'],
                dtmf: { maxDigits: 1 },
                eventUrl: [`${getBaseUrl(req)}/webhook/ivr/zone`]
            }
        ];
        
        res.json(ncco);
    } else {
        console.log(`[IVR DEBUG] Invalid selection: ${digits}`);
        const ncco = [
            { action: 'talk', text: 'Sorry, I did not understand that selection.' },
            { action: 'input', type: ['dtmf'], dtmf: { maxDigits: 1, timeOut: 10 }, eventUrl: [`${getBaseUrl(req)}/webhook/ivr`] }
        ];
        res.json(ncco);
    }
};

const handleIVRZone = async (req, res) => {
    const digits = req.body.dtmf?.digits || req.body.Digits || '';
    const phone = req.body.from || req.body.From || '';
    let session = getSession(phone);

    if (session) {
        session.zone = `Zone ${digits}`;
        setSession(phone, session);
        
        const ncco = [
            {
                action: 'talk',
                text: `Zone ${digits} confirmed. Now please enter your ward number from 1 to 5.`,
                bargeIn: true
            },
            {
                action: 'input',
                type: ['dtmf'],
                dtmf: { maxDigits: 1 },
                eventUrl: [`${getBaseUrl(req)}/webhook/ivr/ward`]
            }
        ];
        
        res.json(ncco);
    } else {
        res.json([{ action: 'talk', text: 'Session expired. Please call again.' }]);
    }
};

const handleIVRWard = async (req, res) => {
    const digits = req.body.dtmf?.digits || req.body.Digits || '';
    const phone = req.body.from || req.body.From || '';
    let session = getSession(phone);

    if (session) {
        session.ward = `Ward ${digits}`;
        setSession(phone, session);

        const ncco = [
            {
                action: 'talk',
                text: 'Thank you. After the beep, please state the exact location and a brief description of the issue. Press any key or stay silent when finished.'
            },
            {
                action: 'record',
                eventUrl: [`${getBaseUrl(req)}/webhook/ivr/recording`],
                endOnKey: '*',
                endOnSilence: 3,
                beepStart: true
            }
        ];
        
        res.json(ncco);
    } else {
        res.json([{ action: 'talk', text: 'Session expired. Please call again.' }]);
    }
};

const handleIVRRecording = async (req, res) => {
    const phone = req.body.from || req.body.From || '';
    const recordingUrl = req.body.recording_url || req.body.RecordingUrl || '';
    let session = getSession(phone);

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

        const { data: complaint, error: insertErr } = await supabase.from('complaints').insert([{
            ticket_id: ticketId,
            category: session.category,
            description: `Voice Recording: ${recordingUrl}`,
            address_ward: addressWard,
            channel: 'ivr',
            citizen_id: citizen.id,
            department_id: departmentId,
            sla_deadline: getSLADeadline(24).toISOString(),
            status: 'open'
        }]).select().single();

        if (!insertErr && complaint) {
            try {
                await supabase.rpc('increment_complaint_count', { citizen_id_param: citizen.id });
            } catch (rpcErr) {
                console.log('[RPC FALLBACK] Updating count manually.');
            }
            dispatchComplaint(complaint.id);
        }

        clearSession(phone);
        res.json([{ action: 'talk', text: 'Thank you. Your complaint has been registered. Your ticket ID is being sent to you via SMS. Goodbye.' }]);
    } else {
        res.json([{ action: 'talk', text: 'Sorry, your session expired. Goodbye.' }]);
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
