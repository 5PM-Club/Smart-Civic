// backend/utils/ticketId.js
const generateTicketId = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(100000 + Math.random() * 900000);
    return `CMP-${year}-${random}`;
};

module.exports = { generateTicketId };
