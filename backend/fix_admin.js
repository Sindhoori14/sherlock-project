const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log('✅ MongoDB Connected');
        await User.findOneAndUpdate({ username: 'admin' }, { email: 'admin@sherlock.edu' });
        console.log('✅ Admin email updated to admin@sherlock.edu');
        process.exit();
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
