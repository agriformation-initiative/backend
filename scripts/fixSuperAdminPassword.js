const mongoose2 = require('mongoose');
const bcrypt2 = require('bcryptjs');
const dotenv2 = require('dotenv');
const path2 = require('path');

dotenv2.config({ path: path2.join(__dirname, '..', '.env') });

const User2 = require('../models/User');

const fixPassword = async () => {
  try {
    await mongoose2.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ MongoDB Connected\n');
    console.log('==================== FIX SUPERADMIN PASSWORD ====================\n');

    // Find superadmin
    const superAdmin = await User2.findOne({ role: 'superadmin' });

    if (!superAdmin) {
      console.log('❌ No SuperAdmin found!');
      console.log('💡 Run: node scripts/createSuperAdmin.js\n');
      mongoose2.connection.close();
      process.exit(1);
    }

    console.log('Found SuperAdmin:');
    console.log(`   Name: ${superAdmin.name}`);
    console.log(`   Email: ${superAdmin.email}`);
    console.log('');

    // Set a new password
    const newPassword = 'Admin@12345';
    
    console.log('Setting new password: Admin@12345');
    console.log('');

    // Hash the password manually
    const salt = await bcrypt2.genSalt(10);
    const hashedPassword = await bcrypt2.hash(newPassword, salt);

    // Update directly
    superAdmin.password = hashedPassword;
    await superAdmin.save({ validateBeforeSave: false });

    console.log('✅ Password updated successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔐 Login Credentials:');
    console.log(`   Email: ${superAdmin.email}`);
    console.log(`   Password: ${newPassword}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Test the password
    const testMatch = await bcrypt2.compare(newPassword, hashedPassword);
    console.log(`Password verification test: ${testMatch ? '✅ WORKS' : '❌ FAILED'}\n`);

    mongoose2.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    mongoose2.connection.close();
    process.exit(1);
  }
};


fixPassword();
