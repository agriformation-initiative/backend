const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

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
    const User = require('../models/User');
    const superAdminExists = await User.findOne({ role: 'superadmin' });

    if (!superAdminExists) {
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(
        process.env.SUPER_ADMIN_PASSWORD || 'Admin@123',
        salt
      );

      await User.create({
        name: 'Super Administrator',
        email: process.env.SUPER_ADMIN_EMAIL || 'superadmin@agriformation.org',
        password: hashedPassword,
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
