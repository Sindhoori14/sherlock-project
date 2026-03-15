const mongoose = require('mongoose');
const { normalizeText, removeStopwords } = require('../utils/textUtils');

const itemSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please add a title'],
        minlength: [3, 'Title must be at least 3 characters'],
        trim: true
    },
    normalizedTitle: {
        type: String,
        index: true
    },
    description: {
        type: String,
        required: [true, 'Please add a description'],
        minlength: [10, 'Description must be at least 10 characters'],
        trim: true
    },
    type: {
        type: String,
        enum: ['lost', 'found'],
        required: [true, 'Please select a report type']
    },
    category: {
        type: String,
        required: [true, 'Please select a category'],
        enum: ['Electronics', 'Clothing', 'Documents', 'Accessories', 'Other']
    },
    color: {
        type: String,
        required: [true, 'Please add a color'],
        match: [/^[a-zA-Z]+$/, 'Color must contain alphabets only'],
        trim: true
    },
    location: {
        type: String,
        required: [true, 'Please add a location'],
        minlength: [3, 'Location must be at least 3 characters'],
        trim: true
    },
    date: {
        type: Date,
        required: [true, 'Please add a date'],
        max: [Date.now, 'Date cannot be in the future']
    },
    imageUrl: {
        type: String,
        required: [true, 'Please upload an item image']
    },
    imageHash: {
        type: String,
        index: true
    },
    imageEmbedding: {
        type: [Number],
        select: false
    },
    similarityScore: {
        type: Number
    },
    status: {
        type: String,
        enum: ['pending', 'verified', 'resolved', 'rejected'],
        default: 'pending'
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    contactInfo: {
        type: String,
        required: [true, 'Please add contact info'],
        match: [/^\d{10}$/, 'Contact info must be exactly 10 digits']
    },
    // Student Details - STRICT VALIDATION
    studentName: {
        type: String,
        required: [true, 'Student Name is required'],
        match: [/^[a-zA-Z\s]+$/, 'Student Name must contain alphabets only'],
        trim: true
    },
    rollNumber: {
        type: String,
        required: [true, 'Roll Number is required'],
        match: [/^[a-zA-Z0-9]+$/, 'Roll Number must be alphanumeric (no special characters)'],
        trim: true
    },
    branch: {
        type: String,
        required: [true, 'Branch is required'],
        match: [/^[a-zA-Z]+$/, 'Branch must contain alphabets only'],
        trim: true
    },
    studentEmail: {
        type: String,
        required: [true, 'Student Email is required'],
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please add a valid institutional email']
    },
    
    potentialMatches: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Item'
    }],
    matchedWith: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Item'
    },
    // Security Feature: Private Verification Questions
    // Minimum 2 and maximum 5 private verification questions
    verificationQuestions: {
        type: [{
            type: String,
            trim: true,
            required: [true, 'Verification question cannot be empty']
        }],
        validate: {
            validator: function(v) {
                return v.length >= 2 && v.length <= 5;
            },
            message: 'You must provide between 2 and 5 verification questions'
        }
    },
    verificationAnswers: {
        type: [{
            type: String,
            trim: true,
            required: [true, 'Verification answer cannot be empty']
        }],
        select: false, // Security: Never return answers in API queries
        immutable: true, // Security: Answers cannot be changed once set
        validate: {
            validator: function(v) {
                // Access the document to check questions length
                // Note: this validator runs on the array path, but we need to ensure length matches questions
                // Ideally this check is done in controller or pre-save, but basic length check here
                return v.length >= 2 && v.length <= 5;
            },
            message: 'You must provide between 2 and 5 verification answers'
        }
    },
    claims: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        answers: [String],
        score: Number,
        status: { 
            type: String, 
            enum: ['pending', 'verified', 'rejected'],
            default: 'pending'
        },
        timestamp: { type: Date, default: Date.now }
    }],
}, { timestamps: true });

itemSchema.index({ user: 1 });
itemSchema.index({ createdAt: -1 });

// Pre-save hook to normalize title
itemSchema.pre('save', async function() {
    if (this.title && !this.normalizedTitle) {
        this.normalizedTitle = removeStopwords(normalizeText(this.title));
    }
});

module.exports = mongoose.model('Item', itemSchema);
