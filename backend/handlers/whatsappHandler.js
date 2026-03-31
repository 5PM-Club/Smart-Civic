// backend/handlers/whatsappHandler.js — Vonage-based Citizen WhatsApp Handler
const supabase = require('../config/supabase');
const { getSession, setSession, clearSession } = require('../utils/sessionStore');
const { categories, getDeptForCategory } = require('../utils/categoryDeptMap');
const { getSLADeadline } = require('../utils/slaHelper');
const { generateTicketId } = require('../utils/ticketId');
const { dispatchComplaint } = require('../services/dispatchService');
const { sendMessage } = require('../utils/notify');

/**
 * Handles incoming messages from citizens (WhatsApp or SMS).
 * @param {Object} msg - Normalized message { phone, body, mediaUrl, latitude, longitude, messageType, channel }
 */
const handleWhatsApp = async (msg) => {
    const { phone, body, mediaUrl, latitude, longitude, channel } = msg;
    const text = (body || '').trim();

    let session = getSession(phone);

    // Initial greeting if no session
    if (!session) {
        // Upsert citizen
        let { data: citizen } = await supabase.from('citizens').select('*').eq('phone', phone.startsWith('+') ? phone : `+${phone}`).single();
        if (!citizen) {
            const phoneFormatted = phone.startsWith('+') ? phone : `+${phone}`;
            const { data: newCitizen } = await supabase.from('citizens').insert([{ phone: phoneFormatted }]).select().single();
            citizen = newCitizen;
        }

        const newSession = { state: 'AWAIT_LANGUAGE', citizen_id: citizen.id, channel: channel || 'whatsapp' };
        setSession(phone, newSession);
        await sendMessage(phone, "Welcome to Smart Civic Reporting! 🇮🇳\nPlease select your preferred language:\n1. English\n2. Hindi\n3. Local Language", newSession.channel);
        return;
    }

    switch (session.state) {
        case 'AWAIT_LANGUAGE': {
            const langMap = { '1': 'en', '2': 'hi', '3': 'local' };
            const lang = langMap[text];
            if (lang) {
                await supabase.from('citizens').update({ preferred_language: lang }).eq('id', session.citizen_id);
                session.state = 'AWAIT_CATEGORY';
                session.lang = lang;
                setSession(phone, session);
                await sendMessage(phone, "Great! Now, what is the category of your complaint?\n" + 
                    Object.keys(categories).map((c, i) => `${i+1}. ${categories[c].name}`).join('\n'), session.channel);
            } else {
                await sendMessage(phone, "Please reply with 1, 2, or 3.", session.channel);
            }
            break;
        }

        case 'AWAIT_CATEGORY': {
            const catKeys = Object.keys(categories);
            const index = parseInt(text) - 1;
            const selectedCat = catKeys[index];
            if (selectedCat) {
                session.category = selectedCat;
                // Branch: SMS doesn't support easy photos
                if (session.channel === 'sms') {
                    session.state = 'AWAIT_LOCATION';
                    setSession(phone, session);
                    await sendMessage(phone, `Got it: ${categories[selectedCat].name}. Please type your Ward/Area name.`, session.channel);
                } else {
                    session.state = 'AWAIT_PHOTO';
                    setSession(phone, session);
                    await sendMessage(phone, `Got it: ${categories[selectedCat].name}. Please send a PHOTO of the issue, or reply 'SKIP'.`, session.channel);
                }
            } else {
                await sendMessage(phone, "Invalid choice. Please select a number from the list.", session.channel);
            }
            break;
        }

        case 'AWAIT_PHOTO': {
            if (mediaUrl) session.photo_url = mediaUrl;
            session.state = 'AWAIT_LOCATION';
            setSession(phone, session);
            await sendMessage(phone, "Please SEND YOUR LIVE LOCATION (GPS) so we can dispatch workers accurately. Or type your Ward/Area name.", session.channel);
            break;
        }

        case 'AWAIT_LOCATION': {
            if (latitude && longitude) {
                session.lat = latitude;
                session.lng = longitude;
                session.location_source = 'gps';
            } else {
                session.address_ward = text;
                session.location_source = 'text';
            }
            session.state = 'AWAIT_DESCRIPTION';
            setSession(phone, session);
            await sendMessage(phone, "Almost done! Please provide a brief description of the problem.", session.channel);
            break;
        }

        case 'AWAIT_DESCRIPTION': {
            session.description = text;
            
            // Generate Ticket and Save
            const ticketId = generateTicketId();
            const deptName = getDeptForCategory(session.category);
            
            let departmentId = null;
            const { data: dept } = await supabase.from('departments').select('id').eq('name', deptName).single();
            if (dept) departmentId = dept.id;

            const slaDeadline = getSLADeadline(24);

            const { data: complaint, error } = await supabase.from('complaints').insert([{
                ticket_id: ticketId,
                category: session.category,
                description: session.description,
                photo_url: session.photo_url || null,
                lat: session.lat || null,
                lng: session.lng || null,
                address_ward: session.address_ward || null,
                location_source: session.location_source || 'unknown',
                citizen_id: session.citizen_id,
                department_id: departmentId,
                channel: session.channel, // Use actual channel used
                sla_deadline: slaDeadline.toISOString(),
                status: 'open'
            }]).select().single();

            if (error) {
                await sendMessage(phone, "Sorry, there was an error saving your complaint. Please try again.", session.channel);
            } else {
                await sendMessage(phone, `Thank you! Your complaint has been registered.\nTicket ID: ${ticketId}\nStatus: OPEN\nWe will notify you once a worker is assigned.`, session.channel);
                
                try {
                    supabase.rpc('increment_complaint_count', { citizen_id_param: session.citizen_id }).then().catch(()=>{});
                } catch (e) {}
                
                // Auto-Dispatch disabled (manual assignment only)
                // dispatchComplaint(complaint.id);
            }
            
            clearSession(phone);
            break;
        }

        default:
            clearSession(phone);
            await sendMessage(phone, "Session expired. Please say 'Hi' to start again.", session.channel || 'whatsapp');
            break;
    }
};

module.exports = { handleWhatsApp };
