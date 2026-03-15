const nodemailer = require('nodemailer');
const EmailLog = require('../models/EmailLog');

// 1. Configure Transporter (Real Gmail SMTP)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false // Helps with some self-signed cert issues in dev
    }
});

// 2. HTML Template Generator
const generateEmailTemplate = (data) => {
    const { title, name, details, actionUrl, actionText } = data;
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f4f7f6; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 20px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background: #2c3e50; color: #fff; padding: 20px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { padding: 30px; }
            .item-card { background: #eef2f7; padding: 15px; border-left: 5px solid #3498db; margin: 20px 0; border-radius: 4px; }
            .details-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .details-table td { padding: 8px; border-bottom: 1px solid #ddd; }
            .details-table td:first-child { font-weight: bold; width: 40%; color: #555; }
            .btn { display: inline-block; background: #27ae60; color: #fff; text-decoration: none; padding: 12px 25px; border-radius: 5px; font-weight: bold; margin-top: 20px; }
            .footer { background: #ecf0f1; text-align: center; padding: 15px; font-size: 12px; color: #7f8c8d; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>SherLock 🔍 Notification</h1>
            </div>
            <div class="content">
                <h2>Hello ${name || 'Student'},</h2>
                <p>${title}</p>
                
                <div class="item-card">
                    <h3>Item Details</h3>
                    <table class="details-table">
                        ${Object.entries(details).map(([key, value]) => `
                            <tr>
                                <td>${key}</td>
                                <td>${value}</td>
                            </tr>
                        `).join('')}
                    </table>
                </div>

                ${actionUrl ? `<div style="text-align: center;"><a href="${actionUrl}" class="btn">${actionText || 'View Details'}</a></div>` : ''}
                
                <p>If you have any questions, please reply to this email or visit the Admin Office.</p>
            </div>
            <div class="footer">
                <p>&copy; ${new Date().getFullYear()} SherLock Smart Campus System. All rights reserved.</p>
                <p>This is an automated message. Please do not reply directly unless instructed.</p>
            </div>
        </div>
    </body>
    </html>
    `;
};

// 3. Verify Connection (Exported for server.js)
const verifyConnection = async () => {
    // STRICT MODE: Fail if credentials are missing
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.error('❌ FATAL ERROR: Missing EMAIL_USER or EMAIL_PASS in .env');
        console.error('   You must provide Real Gmail Credentials to start the server.');
        return false;
    }

    console.log(`📧 Email Mode: ${process.env.EMAIL_MODE || 'production'}`);

    try {
        await transporter.verify();
        console.log(`✅ SMTP Server Connection Verified (User: ${process.env.EMAIL_USER})`);
        return true;
    } catch (error) {
        console.error('❌ SMTP Connection Failed:', error.message);
        console.error('   Ensure you are using a Gmail App Password (NOT your login password).');
        console.error('   See: https://support.google.com/accounts/answer/185833');
        return false; 
    }
};

// 4. Send Email Function
const sendEmail = async (options) => {
    // options: { email, subject, templateData, message, type, triggeredBy, attachments }
    
    let htmlContent;
    if (options.templateData) {
        htmlContent = generateEmailTemplate(options.templateData);
    } else if (options.message) {
        // Simple HTML wrapper for raw message
        htmlContent = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>${options.subject}</h2>
            <p>${options.message.replace(/\n/g, '<br>')}</p>
            <hr>
            <small>Sent from SherLock Admin Dashboard</small>
        </div>`;
    } else {
        throw new Error('Email content missing (provide templateData or message)');
    }

    const mailOptions = {
        from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
        to: options.email,
        subject: options.subject,
        html: htmlContent,
        attachments: options.attachments || [] // Support for attachments
    };

    try {
        // Log attempt
        console.log(`📨 Attempting to send email to: ${options.email}`);
        
        const info = await transporter.sendMail(mailOptions);
        
        console.log(`✅ Email Sent! Message ID: ${info.messageId}`);
        
        // Log to DB (Non-blocking/Safe)
        EmailLog.create({
            recipient: options.email,
            subject: options.subject,
            messageType: options.type || 'notification',
            status: 'sent',
            triggeredBy: options.triggeredBy,
            messageId: info.messageId,
            error: null
        }).catch(err => console.error('⚠️ Warning: Failed to save email log to DB:', err.message));

        return { success: true, messageId: info.messageId };

    } catch (error) {
        console.error('❌ Email Send Failed:', error);
        
        // Log failure to DB (Safe)
        EmailLog.create({
            recipient: options.email,
            subject: options.subject,
            messageType: options.type || 'notification',
            status: 'failed',
            triggeredBy: options.triggeredBy,
            messageId: null,
            error: error.message
        }).catch(err => console.error('⚠️ Warning: Failed to save email error log:', err.message));

        // THROW error so controller knows it failed
        throw error;
    }
};

module.exports = { sendEmail, verifyConnection };
