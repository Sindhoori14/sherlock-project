const BASE_URL = 'http://localhost:5000/api';

async function runTest() {
    console.log('🚀 Starting E2E Test...');

    try {
        // 1. Admin Login
        console.log('\n🔐 Testing Admin Login...');
    let adminLogin = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: 'admin',
            password: 'Admin@123'
        })
    });
    
    let adminData = await adminLogin.json();
    if (!adminLogin.ok) {
        console.log('⚠️ Username login failed:', adminData.message);
        console.log('Trying email login...');
        adminLogin = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@sherlock.com',
                password: 'Admin@123'
            })
        });
        adminData = await adminLogin.json();
    }

    if (!adminLogin.ok) throw new Error(adminData.message);
    console.log('✅ Admin Login Successful:', adminData.role);
        
        const adminToken = adminData.token;

        // 2. Register a Student User
        console.log('\n📝 Testing Student Registration...');
        const uniqueId = Date.now();
        const studentUser = {
            name: `Test Student ${uniqueId}`,
            email: `student${uniqueId}@test.com`,
            password: 'password123'
        };

        const register = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(studentUser)
        });

        const studentData = await register.json();
        if (!register.ok) throw new Error(studentData.message);
        console.log('✅ Student Registered:', studentData.email);
        const studentToken = studentData.token;

        // 3. Report Lost Item
        console.log('\n📌 Reporting Lost Item...');
        const lostItem = {
            type: 'lost',
            title: `Lost Laptop ${uniqueId}`,
            category: 'Electronics',
            color: 'Black',
            location: 'Library',
            date: new Date().toISOString(),
            description: 'Dell XPS 13',
            studentName: studentData.name,
            rollNumber: '123456',
            branch: 'CSE',
            studentEmail: studentData.email,
            contactInfo: '9999999999'
        };

        const reportLost = await fetch(`${BASE_URL}/items`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${studentToken}`
            },
            body: JSON.stringify(lostItem)
        });

        const lostData = await reportLost.json();
        if (!reportLost.ok) throw new Error(lostData.message);
        console.log('✅ Lost Item Reported:', lostData.title);

        // 4. Report Found Item (Match)
        console.log('\n📦 Reporting Found Item (Matching)...');
        const foundItem = {
            type: 'found',
            title: `Found Laptop ${uniqueId}`, // Similar title
            category: 'Electronics',
            color: 'Black', // Exact match
            location: 'Library Floor 2', // Partial match
            date: new Date().toISOString(), // Exact date
            description: 'Found a black Dell laptop',
            contactInfo: 'Security Desk'
        };

        // Use a different user or same user (doesn't matter for matching logic usually, but better if different)
        // For simplicity, using same user
        const reportFound = await fetch(`${BASE_URL}/items`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${studentToken}`
            },
            body: JSON.stringify(foundItem)
        });

        const foundData = await reportFound.json();
        if (!reportFound.ok) throw new Error(foundData.message);
        console.log('✅ Found Item Reported:', foundData.title);

        // 5. Verify Match
        console.log('\n🔍 Verifying Match Logic...');
        // We need to fetch the lost item again to see if potentialMatches has been updated
        // Or fetch admin dashboard items
        const checkItem = await fetch(`${BASE_URL}/items/admin`, {
            headers: { 
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        const allItems = await checkItem.json();
        const updatedLostItem = allItems.find(i => i._id === lostData._id);
        
        if (updatedLostItem && updatedLostItem.potentialMatches && updatedLostItem.potentialMatches.length > 0) {
            console.log(`✅ Match Found! Lost Item has ${updatedLostItem.potentialMatches.length} potential match(es).`);
            console.log('   Match ID:', updatedLostItem.potentialMatches[0]._id);
            console.log('   Found Item ID:', foundData._id);
        } else {
            console.log('❌ No match detected automatically.');
            console.log('Debug - Lost Item:', JSON.stringify(updatedLostItem, null, 2));
        }

    } catch (error) {
        console.error('❌ Test Failed:', error.message);
    }
}

runTest();
