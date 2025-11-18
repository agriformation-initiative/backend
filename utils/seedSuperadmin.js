const mongoose = require('mongoose');
const User = require('../models/User.model');
require('dotenv').config();

const createSuperadmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if superadmin already exists
    const existingSuperadmin = await User.findOne({ role: 'superadmin' });
    
    if (existingSuperadmin) {
      console.log('Superadmin already exists');
      process.exit();
    }

    // Create superadmin
    const superadmin = await User.create({
      fullName: 'Ovieyi Chinedu-Obioha',
      email: 'theagriformation.project@gmail.com',
      password: 'ChangeThisPassword123!',
      role: 'superadmin',
      phoneNumber: '+234',
      isActive: true
    });

    console.log('✅ Superadmin created successfully');
    console.log('Email:', superadmin.email);
    console.log('Password: ChangeThisPassword123!');
    console.log('⚠️  Please change this password immediately after first login');
    
    process.exit();
  } catch (error) {
    console.error('Error creating superadmin:', error);
    process.exit(1);
  }
};

createSuperadmin();