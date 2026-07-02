const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Create super admin if doesn't exist
    await createSuperAdmin();
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

// Create default super admin
const createSuperAdmin = async () => {
  try {
    const User = require('../models/User.model');
    const superAdminExists = await User.findOne({ role: 'superadmin' });

    if (!superAdminExists) {
      await User.create({
        fullName: 'Super Administrator',
        email: process.env.SUPER_ADMIN_EMAIL || 'superadmin@agriformation.org',
        password: process.env.SUPER_ADMIN_PASSWORD || 'Admin@123',
        role: 'superadmin',
        isActive: true
      });

      console.log('✅ Super Admin created successfully');
    }
  } catch (error) {
    console.error('Error creating super admin:', error.message);
  }
};

module.exports = connectDB;
