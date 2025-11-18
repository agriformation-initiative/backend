const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User');

const debugAuth = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ MongoDB Connected\n');
    console.log('==================== AUTHENTICATION DEBUG ====================\n');

    // Find all users
    const users = await User.find().select('+password');

    if (users.length === 0) {
      console.log('❌ No users found in database!');
      console.log('💡 Run: node scripts/createSuperAdmin.js to create one\n');
      mongoose.connection.close();
      process.exit(0);
    }

    console.log(`Found ${users.length} user(s):\n`);

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      console.log(`${i + 1}. ${user.role.toUpperCase()}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Active: ${user.isActive ? '✅ Yes' : '❌ No'}`);
      console.log(`   Password Hash (first 20 chars): ${user.password.substring(0, 20)}...`);
      console.log('');
    }

    // Test password verification
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('Select user number to test password: ', (answer) => {
      const userIndex = parseInt(answer) - 1;

      if (userIndex < 0 || userIndex >= users.length) {
        console.log('❌ Invalid selection');
        rl.close();
        mongoose.connection.close();
        process.exit(1);
      }

      const selectedUser = users[userIndex];

      rl.question(`Enter password to test for ${selectedUser.email}: `, async (password) => {
        try {
          console.log('\n==================== TEST RESULTS ====================\n');
          
          // Test 1: Direct bcrypt compare
          const isMatch = await bcrypt.compare(password, selectedUser.password);
          console.log(`Direct bcrypt.compare: ${isMatch ? '✅ MATCH' : '❌ NO MATCH'}`);

          // Test 2: Using model method
          const isMatch2 = await selectedUser.comparePassword(password);
          console.log(`Model comparePassword method: ${isMatch2 ? '✅ MATCH' : '❌ NO MATCH'}`);

          // Test 3: Show what was tested
          console.log('\nTested with:');
          console.log(`   Email: ${selectedUser.email}`);
          console.log(`   Password: ${password}`);
          console.log(`   Password Length: ${password.length} characters`);

          if (!isMatch) {
            console.log('\n⚠️  PASSWORD MISMATCH!');
            console.log('\nPossible issues:');
            console.log('1. Wrong password entered');
            console.log('2. Password was hashed incorrectly');
            console.log('3. Extra spaces in password');
            console.log('\n💡 Solution: Reset the password using resetSuperAdminPassword.js');
          } else {
            console.log('\n✅ Password is correct!');
            console.log('\n💡 Try logging in again with:');
            console.log(`   Email: ${selectedUser.email}`);
            console.log(`   Password: ${password}`);
          }

          rl.close();
          mongoose.connection.close();
          process.exit(0);

        } catch (error) {
          console.error('❌ Error testing password:', error.message);
          rl.close();
          mongoose.connection.close();
          process.exit(1);
        }
      });
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

debugAuth();
