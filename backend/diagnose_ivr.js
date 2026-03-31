/**
 * Smart Civic IVR Diagnostic Tool
 * This script simulates an Exotel request to your local server to verify logic.
 */
const axios = require('axios');

const TARGET_URL = 'http://localhost:5000/webhook/ivr/instant-whatsapp';
const TEST_PHONE = '+919513886363'; // Replace with your testing number

async function runTest(digit) {
    console.log(`\n--- [TEST] Simulating Case: Digit ${digit} ---`);
    try {
        // Simulating the exact GET request Exotel sends
        const response = await axios.get(`${TARGET_URL}?From=${encodeURIComponent(TEST_PHONE)}&digits=${digit}`);
        
        console.log(`[Response Status] ${response.status}`);
        console.log(`[Response Data] ${response.data}`);
        
        if (response.data === 'OK') {
            console.log('✅ Success! The server accepted the request as an Exotel Passthru.');
        } else {
            console.error('❌ Failed! The server returned an unexpected response.');
        }
    } catch (err) {
        console.error('❌ Error hitting server. Make sure "npm start" or "npm run dev" is running!');
        console.error(err.message);
    }
}

async function start() {
    console.log('Starting ALL DIGIT Diagnostics for Smart Civic IVR...');
    const digits = ['1', '2', '3', '4', '5'];
    for (const d of digits) {
        await runTest(d);
    }
    console.log('\n--- ALL DIAGNOSTICS COMPLETE ---');
}

start();
