const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Important for Twilio webhooks

// Basic Health Check Route
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Smart Civic API is running' });
});

// Admin Auth Route
app.post('/api/admin/auth', (req, res) => {
    const { password } = req.body;
    const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
    
    if (password === adminPass) {
        // In a real app, we would issue a JWT here. 
        // For this local demo, we'll return a simple success token.
        return res.json({ success: true, token: 'super-secret-admin-session' });
    }
    
    res.status(401).json({ success: false, error: 'Invalid password' });
});

// Route imports will go here
app.use('/api/complaints', require('./routes/complaints'));
app.use('/api/workers', require('./routes/workers'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/tickets', require('./routes/tickets'));
app.use('/webhook', require('./routes/webhooks'));

// Start Cron Jobs
const { startCronJobs } = require('./cron/slaChecker');
startCronJobs();

// Start Server
app.listen(PORT, () => {
    console.log(`Backend Server running on port ${PORT}`);
});
