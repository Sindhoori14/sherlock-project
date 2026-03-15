const mongoose = require('mongoose');
const Item = require('./models/Item');

// Mock Mongoose Connection (not needed for validation only, but good practice)
// mongoose.connect('mongodb://localhost:27017/sherlock_test');

async function testValidation() {
    console.log("🧪 Testing Strict Validation Rules...\n");

    // 1. Test Valid Item
    const validItem = new Item({
        title: "Lost Dell Laptop",
        description: "Black Dell XPS 15 with a sticker on the lid.",
        type: "lost",
        category: "Electronics",
        color: "Black",
        location: "Library",
        date: new Date(),
        imageUrl: "test.jpg",
        user: new mongoose.Types.ObjectId(),
        contactInfo: "9876543210",
        studentName: "John Doe",
        rollNumber: "23BQ1A05K5",
        branch: "CSE",
        studentEmail: "john@vvit.net",
        verificationQuestions: ["What is the wallpaper?", "Is there a scratch?"],
        verificationAnswers: ["Nature", "Yes"]
    });

    try {
        await validItem.validate();
        console.log("✅ Valid Item passed validation.");
    } catch (err) {
        console.error("❌ Valid Item failed validation:", err.message);
    }

    // 2. Test Invalid Name (Special chars)
    const invalidName = new Item({
        ...validItem.toObject(),
        studentName: "John_Doe123"
    });
    try {
        await invalidName.validate();
        console.error("❌ Invalid Name check FAILED (Should have thrown error)");
    } catch (err) {
        if (err.errors.studentName) console.log("✅ Invalid Name correctly caught:", err.errors.studentName.message);
        else console.error("❌ Invalid Name threw wrong error:", err.message);
    }

    // 3. Test Invalid Roll Number (Special chars)
    const invalidRoll = new Item({
        ...validItem.toObject(),
        rollNumber: "23BQ1A-05K5" // Dash not allowed
    });
    try {
        await invalidRoll.validate();
        console.error("❌ Invalid Roll check FAILED");
    } catch (err) {
        if (err.errors.rollNumber) console.log("✅ Invalid Roll correctly caught:", err.errors.rollNumber.message);
    }

    // 4. Test Future Date
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    const invalidDate = new Item({
        ...validItem.toObject(),
        date: futureDate
    });
    try {
        await invalidDate.validate();
        console.error("❌ Future Date check FAILED");
    } catch (err) {
        if (err.errors.date) console.log("✅ Future Date correctly caught:", err.errors.date.message);
    }

    // 5. Test Invalid Contact (Not 10 digits)
    const invalidContact = new Item({
        ...validItem.toObject(),
        contactInfo: "123"
    });
    try {
        await invalidContact.validate();
        console.error("❌ Invalid Contact check FAILED");
    } catch (err) {
        if (err.errors.contactInfo) console.log("✅ Invalid Contact correctly caught:", err.errors.contactInfo.message);
    }

     // 6. Test Invalid Verification Questions Count (Only 1)
     const invalidQuestions = new Item({
        ...validItem.toObject(),
        verificationQuestions: ["Only one question"],
        verificationAnswers: ["Only one answer"]
    });
    try {
        await invalidQuestions.validate();
        console.error("❌ Invalid Questions Count check FAILED");
    } catch (err) {
        // Note: Array validators in Mongoose sometimes behave differently depending on version
        if (err.errors.verificationQuestions || err.errors.verificationAnswers) {
             console.log("✅ Invalid Questions Count correctly caught.");
        } else {
             console.log("⚠️ Questions validation might need check:", err.message);
        }
    }

    console.log("\nTests Completed.");
    process.exit(0);
}

testValidation();
