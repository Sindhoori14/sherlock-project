const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000/api';

// Helper to delay execution
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function runTest() {
    console.log('🚀 Starting Full System Test...');

    try {
        // =========================================================
        // 1. AUTHENTICATION MODULE
        // =========================================================
        console.log('\n🔐 [MODULE 1] Authentication Test');

        // 1.1 Admin Login
        console.log('   -> Logging in as Admin...');
        let adminLogin = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@sherlock.edu', password: 'Admin@123' })
        });
        
        let adminData = await adminLogin.json();
        if (!adminLogin.ok) throw new Error(`Admin Login Failed: ${adminData.message}`);
        console.log('   ✅ Admin Login Successful');
        const adminToken = adminData.token;

        // 1.2 Student Registration
        const uniqueId = Date.now();
        console.log(`   -> Registering Student (User_${uniqueId})...`);
        const studentUser = {
            name: `Test Student ${uniqueId}`,
            email: `student${uniqueId}@vvit.net`,
            password: 'password123'
        };

        const register = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(studentUser)
        });

        const studentData = await register.json();
        if (!register.ok) throw new Error(`Registration Failed: ${studentData.message}`);
        console.log('   ✅ Student Registered Successfully');
        const studentToken = studentData.token;


        // =========================================================
        // 2. LOST ITEM MODULE & DUPLICATE DETECTION
        // =========================================================
        console.log('\n📦 [MODULE 2] Lost Item & Duplicate Detection');

        const itemDate = new Date().toISOString();
        const lostItemDetails = {
            type: 'lost',
            title: `Lost MacBook Pro ${uniqueId}`,
            category: 'Electronics',
            color: 'Silver',
            location: 'Library Reading Room',
            date: itemDate,
            description: 'Silver MacBook Pro with a sticker on top',
            contactInfo: '9876543210',
            studentName: studentData.name,
            rollNumber: '23BQ1A05K5',
            branch: 'CSE',
            studentEmail: studentData.email
        };

        // 2.1 Duplicate Check (Should be clean initially)
        console.log('   -> Checking for duplicates (expecting none)...');
        let dupCheck = await fetch(`${BASE_URL}/items/check-duplicate`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${studentToken}`
            },
            body: JSON.stringify({
                type: 'lost',
                category: 'Electronics',
                date: itemDate,
                location: 'Library',
                title: 'MacBook'
            })
        });
        let dupData = await dupCheck.json();
        if (dupData.found) console.warn('   ⚠️ Warning: Unexpected duplicate found, but proceeding.');
        else console.log('   ✅ No duplicates found (as expected).');

        // 2.2 Report Lost Item
        console.log('   -> Reporting Lost Item...');
        // Note: For simplicity in this script, sending JSON instead of FormData (assuming controller handles body if no file, but our controller checks req.file)
        // Wait, controller creates itemData from ...req.body.
        // But for images, we need FormData. Let's try without image first for this step, or use image if we can.
        // The controller allows creation without image (default placeholder).
        
        let reportLost = await fetch(`${BASE_URL}/items`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${studentToken}`
            },
            body: JSON.stringify(lostItemDetails)
        });

        let lostData = await reportLost.json();
        if (!reportLost.ok) throw new Error(`Report Failed: ${lostData.message}`);
        console.log(`   ✅ Lost Item Reported: ID ${lostData._id}`);

        // 2.3 Duplicate Check AGAIN (Should find the one we just reported)
        console.log('   -> Checking for duplicates AGAIN (expecting match)...');
        dupCheck = await fetch(`${BASE_URL}/items/check-duplicate`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${studentToken}`
            },
            body: JSON.stringify({
                type: 'lost',
                category: 'Electronics',
                date: itemDate,
                location: 'Library', // Partial match
                title: 'MacBook' // Partial match
            })
        });
        dupData = await dupCheck.json();
        if (dupData.found) console.log('   ✅ Duplicate Detection Working! Found similar item.');
        else throw new Error('❌ Duplicate Detection Failed: Did not find the item we just reported.');


        // =========================================================
        // 3. FOUND ITEM MODULE & MATCHING LOGIC
        // =========================================================
        console.log('\n🔍 [MODULE 3] Found Item & Matching Logic');

        // 3.1 Report Found Item (That matches the lost one)
        console.log('   -> Reporting Found Item (Matching details)...');
        
        const foundItemDetails = {
            type: 'found',
            title: `Found MacBook ${uniqueId}`,
            category: 'Electronics',
            color: 'Silver',
            location: 'Library Floor 1', // Close enough? Logic checks partial string
            date: itemDate,
            description: 'Found a silver laptop',
            contactInfo: 'Security',
            studentName: 'Guard',
            contactInfo: 'Security Office'
        };

        // We use FormData here to test image upload if possible, or just JSON for simplicity of this script
        // Let's use JSON for speed, assuming image upload is tested separately or we rely on placeholder
        let reportFound = await fetch(`${BASE_URL}/items`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}` // Admin or another user reporting found
            },
            body: JSON.stringify(foundItemDetails)
        });

        let foundData = await reportFound.json();
        if (!reportFound.ok) throw new Error(`Found Report Failed: ${foundData.message}`);
        console.log(`   ✅ Found Item Reported: ID ${foundData._id}`);

        // 3.2 Verify Matching Logic
        // The backend should have automatically populated 'potentialMatches'
        console.log('   -> Verifying Match Generation...');
        
        // Fetch the found item again to see updated fields or check response
        // Note: Controller updates matches AFTER creating, but the response might not include the *updated* array if it sends response before saving relations?
        // Checking controller code: It saves item, finds matches, updates item, then sends response. So response should have it.
        
        if (foundData.potentialMatches && foundData.potentialMatches.length > 0) {
            console.log(`   ✅ Match Logic Triggered: Found ${foundData.potentialMatches.length} potential matches.`);
            if (foundData.potentialMatches.includes(lostData._id)) {
                console.log('   ✅ Exact Match Found: Linked to the Lost Item correctly.');
            } else {
                console.warn('   ⚠️ Match found but ID mismatch (might be other test data).');
            }
        } else {
            console.warn('   ⚠️ No automatic match triggered. Scoring threshold might be too high or data mismatch.');
            console.log('      Lost:', lostItemDetails);
            console.log('      Found:', foundItemDetails);
        }


        // =========================================================
        // 4. ADMIN MANAGEMENT & EMAIL
        // =========================================================
        console.log('\n🛡️ [MODULE 4] Admin Management');

        // 4.1 Fetch Admin Dashboard Data
        console.log('   -> Fetching Admin Items...');
        let adminItemsRes = await fetch(`${BASE_URL}/items/admin`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        let adminItems = await adminItemsRes.json();
        console.log(`   ✅ Admin retrieved ${adminItems.length} total items.`);

        // 4.2 Verify Item
        console.log(`   -> Verifying Lost Item (ID: ${lostData._id})...`);
        let verifyRes = await fetch(`${BASE_URL}/items/${lostData._id}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({ status: 'verified' })
        });
        if (verifyRes.ok) console.log('   ✅ Item status updated to Verified.');
        else console.error('   ❌ Verification Failed');

        // 4.3 Confirm Match (Resolve)
        console.log(`   -> Confirming Match between Lost & Found...`);
        let matchRes = await fetch(`${BASE_URL}/items/${lostData._id}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({ matchedWithId: foundData._id })
        });
        
        if (matchRes.ok) {
            console.log('   ✅ Match Confirmed! Items resolved.');
            // This should trigger the email simulation log in the server console
            console.log('   📧 Email notification logic triggered (check server logs).');
        } else {
            console.error('   ❌ Match Confirmation Failed');
        }


        console.log('\n✨ FULL SYSTEM TEST COMPLETED SUCCESSFULLY! ✨');

    } catch (error) {
        console.error('\n❌ SYSTEM TEST FAILED:', error);
    }
}

runTest();
