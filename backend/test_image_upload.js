const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000/api';

async function runTest() {
    console.log('🚀 Starting Image Upload Test...');

    try {
        // 1. Register a Student User
        const uniqueId = Date.now();
        const studentUser = {
            name: `Image Test User ${uniqueId}`,
            email: `imguser${uniqueId}@test.com`,
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
        const token = studentData.token;

        // 2. Report Item with Image
        console.log('\n📸 Uploading Item with Image...');
        
        const formData = new FormData();
        formData.append('title', `Item with Image ${uniqueId}`);
        formData.append('type', 'lost');
        formData.append('category', 'Electronics');
        formData.append('color', 'Silver');
        formData.append('location', 'Cafeteria');
        formData.append('date', new Date().toISOString());
        formData.append('description', 'Testing image upload');
        formData.append('contactInfo', '1234567890');
        formData.append('studentName', studentData.name);
        
        // Read file and append
        const fileBuffer = fs.readFileSync(path.join(__dirname, 'test.png'));
        const blob = new Blob([fileBuffer], { type: 'image/png' });
        formData.append('image', blob, 'test.png');

        const upload = await fetch(`${BASE_URL}/items`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
                // Content-Type is set automatically with boundary by fetch when using FormData
            },
            body: formData
        });

        const itemData = await upload.json();
        if (!upload.ok) throw new Error(itemData.message || 'Upload failed');
        
        console.log('✅ Item Created:', itemData.title);
        console.log('🖼️  Image URL:', itemData.imageUrl);

        if (itemData.imageUrl && !itemData.imageUrl.includes('placeholder')) {
            console.log('✅ Image Upload Verification PASSED');
        } else {
            console.error('❌ Image Upload Verification FAILED: URL is placeholder');
        }

    } catch (error) {
        console.error('❌ Test Failed:', error);
    }
}

runTest();
