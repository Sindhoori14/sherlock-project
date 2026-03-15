const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const path = require('path');
const { initAIService } = require('./utils/aiService');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for simplicity in demo
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors());
app.use(express.json());

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

// Serve static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve Frontend
app.use(express.static(path.join(__dirname, '../frontend/html')));
app.use('/css', express.static(path.join(__dirname, '../frontend/css')));
app.use('/js', express.static(path.join(__dirname, '../frontend/js')));
app.use('/assets', express.static(path.join(__dirname, '../frontend/assets')));

const { verifyConnection, sendEmail } = require('./utils/emailService');

// Database Connection
mongoose.connect(process.env.MONGO_URI)
.then(async () => {
    console.log('✅ MongoDB Connected');
    
    // Verify Email Connection on Startup
    console.log('🔄 Verifying SMTP Connection...');
    const emailVerified = await verifyConnection();
    
    if (!emailVerified) {
        console.error('❌ CRITICAL ERROR: SMTP Connection Failed.');
        console.error('   Server cannot start without valid email credentials.');
        process.exit(1); // Hard Fail as requested
    }

    // Send Startup Test Email
    try {
        console.log('🔄 Sending Startup Test Email...');
        await sendEmail({
            email: process.env.EMAIL_USER, // Send to self (Admin)
            subject: '🚀 SherLock System Online - SMTP Test',
            templateData: {
                title: 'System Startup Successful',
                name: 'Administrator',
                details: {
                    'Status': 'Online',
                    'Time': new Date().toLocaleString(),
                    'Environment': 'Production'
                },
                actionText: 'Go to Dashboard',
                actionUrl: 'http://localhost:5000'
            },
            type: 'system_notification',
            triggeredBy: null
        });
        console.log('✅ Startup Test Email Sent Successfully!');
    } catch (err) {
        console.error('❌ Startup Test Email Failed:', err.message);
        process.exit(1); // Fail if test email fails? User said "Application must FAIL to start if real credentials are missing". If verify passed but send failed, it's still a critical issue.
    }

    // AI Service Health Check (non-blocking)
    try {
        await initAIService();
    } catch (aiErr) {
        // initAIService handles its own logging and never throws, but this is here for safety
        console.warn('AI Service unavailable (non-blocking)');
    }
})
.catch(err => console.error('❌ MongoDB Connection Error:', err));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/items', require('./routes/itemRoutes'));

// Test Route
app.get('/', (req, res) => {
    res.send('SherLock Backend is Running 🚀');
});

// Error Handler (must have 4 args to be recognized by Express)
app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.statusCode || 500).json({ message: err.message || 'Server Error' });
});

// Start Server
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});
