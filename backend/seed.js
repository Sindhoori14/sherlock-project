const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('✅ MongoDB Connected');
        seedAdmin();
    })
    .catch(err => console.error(err));

const seedAdmin = async () => {
    try {
        // Check if admin exists by username
        const adminExists = await User.findOne({ username: 'admin' });
        
        if (adminExists) {
            console.log('⚠️ Admin user already exists');
            process.exit();
        }

        // Create Admin
        await User.create({
            name: 'System Admin',
            username: 'admin',
            email: 'admin@sherlock.edu', // Official admin email
            password: 'Admin@123', // Will be hashed by pre-save hook
            role: 'admin'
        });

        console.log('✅ Admin user created successfully!');
        console.log('👤 Username: admin');
        console.log('🔑 Password: Admin@123');
        process.exit();
    } catch (error) {
        console.error('❌ Error seeding admin:', error);
        process.exit(1);
    }
};
