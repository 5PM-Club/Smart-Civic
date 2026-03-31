const { sendMessage } = require('../utils/notify');

/**
 * Handles incoming WhatsApp/SMS messages from citizens.
 * @param {Object} msg - Normalized message { phone, body, mediaUrl, latitude, longitude, messageType, channel }
 */
const handleWhatsApp = async (msg) => {
    const { phone, body, mediaUrl, latitude, longitude, channel: msgChannel } = msg;
    const text = (body || '').trim();

    let session = getSession(phone);
    const channel = msgChannel || session?.channel || 'whatsapp';

    // Initial greeting if no session
    if (!session) {
        // Upsert citizen
        const phoneFormatted = phone.startsWith('+') ? phone : `+${phone}`;
        let { data: citizen } = await supabase.from('citizens').select('*').eq('phone', phoneFormatted).single();
        if (!citizen) {
            const { data: newCitizen } = await supabase.from('citizens').insert([{ phone: phoneFormatted }]).select().single();
            citizen = newCitizen;
        }

        setSession(phone, { state: 'AWAIT_LANGUAGE', citizen_id: citizen.id, channel });
        await sendMessage(phone, "Welcome to Smart Civic Reporting! 🇮🇳\nPlease select your preferred language:\n1. English\n2. Hindi\n3. Local Language", channel);
        return;
    }

    // Ensure channel is tracked
    if (!session.channel) {
        session.channel = channel;
        setSession(phone, session);
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
                    Object.keys(categories).map((c, i) => `${i+1}. ${categories[c].name}`).join('\n'), channel);
            } else {
                await sendMessage(phone, "Please reply with 1, 2, or 3.", channel);
            }
            break;
        }

        case 'AWAIT_CATEGORY': {
            const catKeys = Object.keys(categories);
            const index = parseInt(text) - 1;
            const selectedCat = catKeys[index];
            if (selectedCat) {
                session.category = selectedCat;
                // SMS doesn't support photos easily in this prototype, skip to location
                if (channel === 'sms') {
                    session.state = 'AWAIT_LOCATION';
                    setSession(phone, session);
                    await sendMessage(phone, `Got it: ${categories[selectedCat].name}. Please type your Ward/Area name.`, channel);
                } else {
                    session.state = 'AWAIT_PHOTO';
                    setSession(phone, session);
                    await sendMessage(phone, `Got it: ${categories[selectedCat].name}. Please send a PHOTO of the issue, or reply 'SKIP'.`, channel);
                }
            } else {
                await sendMessage(phone, "Invalid choice. Please select a number from the list.", channel);
            }
            break;
        }

        case 'AWAIT_PHOTO': {
            if (mediaUrl) session.photo_url = mediaUrl;
            session.state = 'AWAIT_LOCATION';
            setSession(phone, session);
            await sendMessage(phone, "Please SEND YOUR LIVE LOCATION (GPS) so we can dispatch workers accurately. Or type your Ward/Area name.", channel);
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
            await sendMessage(phone, "Almost done! Please provide a brief description of the problem.", channel);
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
                channel: session.channel || 'whatsapp',
                sla_deadline: slaDeadline.toISOString(),
                status: 'open'
            }]).select().single();

            if (error) {
                await sendMessage(phone, "Sorry, there was an error saving your complaint. Please try again.", channel);
            } else {
                await sendMessage(phone, `Thank you! Your complaint has been registered.\nTicket ID: ${ticketId}\nStatus: OPEN\nWe will notify you once a worker is assigned.`, channel);
                
                try {
                    supabase.rpc('increment_complaint_count', { citizen_id_param: session.citizen_id }).then().catch(()=>{});
                } catch (e) {}
                
                // Trigger Auto-Dispatch
                dispatchComplaint(complaint.id);
            }
            
            clearSession(phone);
            break;
        }

        default:
            clearSession(phone);
            await sendMessage(phone, "Session expired. Please say 'Hi' to start again.", channel);
            break;
    }
};

module.exports = { handleWhatsApp };
