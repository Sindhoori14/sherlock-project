const mongoose = require('mongoose');

const EmailLogSchema = new mongoose.Schema({
    recipient: {
        type: String,
        required: true
    },
    subject: {
        type: String,
        required: true
    },
    messageType: {
        type: String,
        enum: ['match_notification', 'status_update', 'admin_manual', 'verification', 'system_notification'],
        default: 'status_update'
    },
    status: {
        type: String,
        enum: ['sent', 'failed', 'pending'],
        default: 'pending'
    },
    messageId: {
        type: String
    },
    error: {
        type: String
    },
    sentAt: {
        type: Date,
        default: Date.now
    },
    triggeredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User' // Admin or System (null)
    }
});

module.exports = mongoose.model('EmailLog', EmailLogSchema);
