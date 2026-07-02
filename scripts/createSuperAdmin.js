// ==================== CREATE SUPERADMIN SCRIPTS ====================

// ==================== METHOD 1: Interactive Script (Recommended) ====================
// Save as: scripts/createSuperAdmin.js
// Run with: node scripts/createSuperAdmin.js

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const readline = require('readline');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User.model');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const createSuperAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);

    console.log('✅ MongoDB Connected\n');
    console.log('==================== CREATE SUPERADMIN ====================\n');

    // Check if superadmin already exists
    const existingSuperAdmin = await User.findOne({ role: 'superadmin' });
    
    if (existingSuperAdmin) {
      console.log('⚠️  A SuperAdmin already exists:');
      console.log(`   Name: ${existingSuperAdmin.fullName}`);
      console.log(`   Email: ${existingSuperAdmin.email}\n`);
      
      rl.question('Do you want to create another SuperAdmin? (yes/no): ', async (answer) => {
        if (answer.toLowerCase() !== 'yes') {
          console.log('❌ Operation cancelled');
          rl.close();
          mongoose.connection.close();
          process.exit(0);
        }
        await promptForDetails();
      });
    } else {
      await promptForDetails();
    }

  } catch (error) {
    console.error('❌ Database Connection Error:', error.message);
    rl.close();
    process.exit(1);
  }
};

const promptForDetails = () => {
  rl.question('SuperAdmin Full Name: ', (name) => {
    rl.question('SuperAdmin Email: ', (email) => {
      rl.question('SuperAdmin Password (min 6 characters): ', async (password) => {
        
        try {
          // Validate input
          if (!name || name.trim().length === 0) {
            console.log('❌ Name cannot be empty');
            rl.close();
            mongoose.connection.close();
            process.exit(1);
          }

          if (!email || !email.match(/^\S+@\S+\.\S+$/)) {
            console.log('❌ Please provide a valid email');
            rl.close();
            mongoose.connection.close();
            process.exit(1);
          }

          if (!password || password.length < 6) {
            console.log('❌ Password must be at least 6 characters');
            rl.close();
            mongoose.connection.close();
            process.exit(1);
          }

          // Check if email already exists
          const existingUser = await User.findOne({ email });
          if (existingUser) {
            console.log('❌ User with this email already exists!');
            rl.close();
            mongoose.connection.close();
            process.exit(1);
          }

          // Create superadmin (model's pre-save hook handles password hashing)
          const superAdmin = await User.create({
            fullName: name.trim(),
            email: email.toLowerCase().trim(),
            password: password,
            role: 'superadmin',
            isActive: true
          });

          console.log('\n✅ SuperAdmin Created Successfully!\n');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('📋 Account Details:');
          console.log('   Name:', superAdmin.fullName);
          console.log('   Email:', superAdmin.email);
          console.log('   Role:', superAdmin.role);
          console.log('   ID:', superAdmin._id);
          console.log('   Created:', superAdmin.createdAt);
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
          console.log('🔐 Login Credentials:');
          console.log(`   Email: ${superAdmin.email}`);
          console.log(`   Password: ${password}`);
          console.log('\n💡 Use these credentials to login via:');
          console.log('   POST /api/auth/login\n');

          rl.close();
          mongoose.connection.close();
          process.exit(0);

        } catch (error) {
          console.error('❌ Error creating SuperAdmin:', error.message);
          rl.close();
          mongoose.connection.close();
          process.exit(1);
        }
      });
    });
  });
};

// Run the script
createSuperAdmin();