// backend/utils/sessionStore.js
/**
 * Simple in-memory storage for citizen conversation sessions.
 */

const sessions = new Map();

const setSession = (phone, data) => {
    sessions.set(phone, {
        ...data,
        last_updated: Date.now()
    });
};

const getSession = (phone) => {
    return sessions.get(phone);
};

const clearSession = (phone) => {
    sessions.delete(phone);
};

// Cleanup old sessions (e.g. older than 30 mins) every 10 mins
setInterval(() => {
    const now = Date.now();
    for (const [phone, session] of sessions.entries()) {
        if (now - session.last_updated > 30 * 60 * 1000) {
            sessions.delete(phone);
        }
    }
}, 10 * 60 * 1000);

module.exports = { setSession, getSession, clearSession };
