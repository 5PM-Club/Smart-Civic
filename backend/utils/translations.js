// backend/utils/translations.js
const translations = {
    en: {
        welcome: "Welcome to Smart Civic Reporting! 🇮🇳\nPlease select your preferred language:\n1. தமிழ்\n2. English\n3. Hindi",
        invalid_lang: "Please reply with 1, 2, or 3.",
        cat_prompt: "Great! Now, what is the category of your complaint?\n",
        invalid_cat: "Invalid choice. Please select a number from the list.",
        photo_prompt: "Got it: {category}. Please send a PHOTO of the issue, or reply 'SKIP'.",
        location_prompt: "Please SEND YOUR LIVE LOCATION (GPS) so we can dispatch workers accurately. Or type your Ward/Area name.",
        description_prompt: "Almost done! Please provide a brief description of the problem.",
        success: "Thank you! Your complaint has been registered.\nTicket ID: {ticketId}\nStatus: OPEN\nWe will notify you once a worker is assigned.",
        expired: "Session expired. Please say 'Hi' to start again.",
        worker_assigned: "Worker Assigned! {workerName} is on the way to handle your {category} complaint (Ticket: {ticketId}).",
        status_update: "Status Update: Your complaint {ticketId} is now {status}."
    },
    hi: {
        welcome: "Smart Civic रिपोर्टिंग में आपका स्वागत है! 🇮🇳\nअपनी पसंदीदा भाषा चुनें:\n1. தமிழ்\n2. English\n3. Hindi",
        invalid_lang: "कृपया 1, 2 या 3 के साथ उत्तर दें।",
        cat_prompt: "बहुत बढ़िया! अब, आपकी शिकायत की श्रेणी क्या है?\n",
        invalid_cat: "अमान्य विकल्प। कृपया सूची में से एक नंबर चुनें।",
        photo_prompt: "समझ गया: {category}। कृपया समस्या का एक फोटो भेजें, या 'SKIP' लिखें।",
        location_prompt: "कृपया अपना लाइव स्थान (GPS) भेजें या अपने वार्ड/क्षेत्र का नाम टाइप करें।",
        description_prompt: "लगभग पूरा हो गया! कृपया समस्या का संक्षिप्त विवरण दें।",
        success: "धन्यवाद! आपकी शिकायत दर्ज कर ली गई है।\nटिकट आईडी: {ticketId}\nस्थिति: खुला\nकार्यकर्ता नियुक्त होने पर हम आपको सूचित करेंगे।",
        expired: "सत्र समाप्त हो गया। फिर से शुरू करने के लिए 'नमस्ते' कहें।",
        worker_assigned: "कार्यकर्ता नियुक्त! {workerName} आपकी {category} शिकायत (टिकट: {ticketId}) को हल करने के लिए आ रहे हैं।",
        status_update: "स्थिति अपडेट: आपकी शिकायत {ticketId} अब {status} है।"
    },
    ta: {
        welcome: "Smart Civic புகாரளிப்பிற்கு நல்வரவு! 🇮🇳\nஉங்கள் மொழியைத் தேர்ந்தெடுக்கவும்:\n1. தமிழ்\n2. English\n3. Hindi",
        invalid_lang: "தயவுசெய்து 1, 2 அல்லது 3 எண் கொண்டு பதிலளிக்கவும்.",
        cat_prompt: "மிகவும் நன்று! இப்போது, உங்கள் புகாரின் வகை என்ன?\n",
        invalid_cat: "தவறான தேர்வு. பட்டியலிலிருந்து ஒரு எண்ணைத் தேர்ந்தெடுக்கவும்.",
        photo_prompt: "புரிந்துகொண்டேன்: {category}. சிக்கலின் புகைப்படத்தை அனுப்பவும், அல்லது 'SKIP' எனப் பதிலளிக்கவும்.",
        location_prompt: "இருப்பிடத்தை (GPS) அனுப்பவும் அல்லது உங்கள் வார்டு/பகுதி பெயரைத் தட்டச்சு செய்யவும்.",
        description_prompt: "மிகவும் நன்று! இப்போது, சிக்கலின் விவரத்தை சுருக்கமாகத் தட்டச்சு செய்யவும்.",
        success: "நன்றி! உங்கள் புகார் பதிவு செய்யப்பட்டுள்ளது.\nடிக்கெட் ஐடி: {ticketId}\nநிலை: OPEN\nபணியாளர் நியமிக்கப்பட்டதும் உங்களுக்குத் தெரிவிக்கப்படும்.",
        expired: "அமர்வு காலாவதியானது. மீண்டும் தொடங்க 'வணக்கம்' (Hi) என அனுப்பவும்.",
        worker_assigned: "பணியாளர் நியமிக்கப்பட்டார்! உங்கள் {category} புகாரைக் கையாளுவதற்கு {workerName} வந்து கொண்டிருக்கிறார் (டிக்கெட்: {ticketId}).",
        status_update: "நிலை புதுப்பிப்பு: உங்கள் புகார் {ticketId} இப்போது {status} ஆக உள்ளது."
    }
};

const getTranslation = (lang, key, params = {}) => {
    const l = lang || 'en';
    let text = translations[l]?.[key] || translations['en']?.[key] || key;
    
    // Replace parameters like {ticketId}
    Object.keys(params).forEach(p => {
        text = text.replace(`{${p}}`, params[p]);
    });
    
    return text;
};

module.exports = { translations, getTranslation };
