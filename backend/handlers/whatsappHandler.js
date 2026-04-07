// backend/handlers/whatsappHandler.js — Vonage-based Citizen WhatsApp Handler
const supabase = require('../config/supabase');
const { getSession, setSession, clearSession } = require('../utils/sessionStore');
const { categories, getDeptForCategory } = require('../utils/categoryDeptMap');
const { getSLADeadline } = require('../utils/slaHelper');
const { generateTicketId } = require('../utils/ticketId');
const { dispatchComplaint } = require('../services/dispatchService');
const { sendMessage } = require('../utils/notify');

const { getTranslation } = require('../utils/translations');

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
        
        // Initial welcome always invites language choice in English/Tamil/Hindi mix
        await sendMessage(phone, getTranslation('en', 'welcome'), newSession.channel);
        return;
    }

    const t = (key, params) => getTranslation(session.lang, key, params);

    switch (session.state) {
        case 'AWAIT_LANGUAGE': {
            // New Requested Order: 1. Tamil, 2. English, 3. Hindi
            const langMap = { '1': 'ta', '2': 'en', '3': 'hi' };
            const lang = langMap[text];
            if (lang) {
                await supabase.from('citizens').update({ preferred_language: lang }).eq('id', session.citizen_id);
                session.state = 'AWAIT_CATEGORY';
                session.lang = lang;
                setSession(phone, session);
                
                // Show translated category list
                const catList = Object.keys(categories).map((c, i) => {
                    const catName = lang === 'ta' ? categories[c].name_ta : (lang === 'hi' ? categories[c].name_hi : categories[c].name);
                    return `${i+1}. ${catName}`;
                }).join('\n');
                
                await sendMessage(phone, t('cat_prompt') + catList, session.channel);
            } else {
                // Use English as fallback for error if lang not yet chosen
                await sendMessage(phone, getTranslation('en', 'invalid_lang'), session.channel);
            }
            break;
        }

        case 'AWAIT_CATEGORY': {
            const catKeys = Object.keys(categories);
            const index = parseInt(text) - 1;
            const selectedCat = catKeys[index];
            if (selectedCat) {
                session.category = selectedCat;
                const lang = session.lang;
                const catName = lang === 'ta' ? categories[selectedCat].name_ta : (lang === 'hi' ? categories[selectedCat].name_hi : categories[selectedCat].name);

                // Branch: SMS doesn't support easy photos
                if (session.channel === 'sms') {
                    session.state = 'AWAIT_LOCATION';
                    setSession(phone, session);
                    await sendMessage(phone, t('location_prompt'), session.channel);
                } else {
                    session.state = 'AWAIT_PHOTO';
                    setSession(phone, session);
                    await sendMessage(phone, t('photo_prompt', { category: catName }), session.channel);
                }
            } else {
                await sendMessage(phone, t('invalid_cat'), session.channel);
            }
            break;
        }

        case 'AWAIT_PHOTO': {
            if (mediaUrl) session.photo_url = mediaUrl;
            session.state = 'AWAIT_LOCATION';
            setSession(phone, session);
            await sendMessage(phone, t('location_prompt'), session.channel);
            break;
        }

        case 'AWAIT_LOCATION': {
            if (latitude && longitude) {
                session.lat = latitude;
                session.lng = longitude;
                session.location_source = 'gps';
            }
            if (text && text.length > 2 && text.toLowerCase() !== 'skip') {
                session.address_ward = text;
                session.location_source = session.location_source === 'gps' ? 'gps+text' : 'text';
            }
            
            session.state = 'AWAIT_DESCRIPTION';
            setSession(phone, session);
            await sendMessage(phone, t('description_prompt'), session.channel);
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
                channel: session.channel,
                sla_deadline: slaDeadline.toISOString(),
                status: 'open'
            }]).select().single();

            if (error) {
                await sendMessage(phone, "Error Saving / பிழை ஏற்பட்டது.", session.channel);
            } else {
                await sendMessage(phone, t('success', { ticketId }), session.channel);
                
                // Trigger Auto-Assignment 
                dispatchComplaint(complaint.id);

                try {
                    supabase.rpc('increment_complaint_count', { citizen_id_param: session.citizen_id }).then().catch(()=>{});
                } catch (e) {}
            }
            
            clearSession(phone);
            break;
        }

        default:
            clearSession(phone);
            await sendMessage(phone, getTranslation('en', 'expired'), session.channel || 'whatsapp');
            break;
    }
};

module.exports = { handleWhatsApp };
