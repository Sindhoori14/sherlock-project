// SherLock Email Config Tester
// Run this script to verify your .env credentials are working correctly
// Usage: node tools/test_email.js

require('dotenv').config({ path: '../backend/.env' });
const nodemailer = require('nodemailer');

console.log('🔍 Testing SherLock Email Configuration...');
console.log('----------------------------------------');

// 1. Check Env Vars
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('❌ ERROR: Missing EMAIL_USER or EMAIL_PASS in backend/.env');
    console.log('   Please open backend/.env and add your Real Gmail App Password.');
    process.exit(1);
}

if (process.env.EMAIL_PASS.includes('REPLACE')) {
    console.error('❌ ERROR: Placeholder detected in EMAIL_PASS');
    console.log('   You need to generate a Gmail App Password.');
    console.log('   Go to: Google Account > Security > 2-Step Verification > App Passwords');
    process.exit(1);
}

console.log(`👤 User: ${process.env.EMAIL_USER}`);
console.log('🔑 Pass: [HIDDEN] (Length: ' + process.env.EMAIL_PASS.length + ')');

// 2. Create Transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
});

// 3. Verify Connection
console.log('🔄 Connecting to Gmail SMTP...');

transporter.verify(function (error, success) {
    if (error) {
        console.error('❌ CONNECTION FAILED:');
        console.error(error);
        console.log('\nPossible causes:');
        console.log('1. Wrong Email or App Password.');
        console.log('2. 2-Step Verification not enabled.');
        console.log('3. Firewall/Antivirus blocking port 587/465.');
    } else {
        console.log('✅ SMTP Connection SUCCESSFUL!');
        console.log('   The server is ready to send real emails.');
        console.log('   You can now start the backend with: node server.js');
    }
});
