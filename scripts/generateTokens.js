const readline = require('readline');
const jwt2 = require('jsonwebtoken');
const dotenv2 = require('dotenv');

dotenv2.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n🔐 JWT Token Generator (Interactive)\n');

rl.question('Enter User ID (MongoDB ObjectId): ', (userId) => {
  rl.question('Enter JWT Secret (or press Enter for .env value): ', (secret) => {
    rl.question('Token Expiration (e.g., 7d, 24h, 1h) [default: 7d]: ', (expiry) => {
      
      const jwtSecret = secret || process.env.JWT_SECRET;
      const expiresIn = expiry || '7d';

      if (!jwtSecret) {
        console.log('❌ Error: No JWT_SECRET found in .env or provided');
        rl.close();
        return;
      }

      const token = jwt2.sign({ id: userId }, jwtSecret, { expiresIn });

      console.log('\n✅ Token Generated Successfully!\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(token);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      console.log('📝 Token Details:');
      const decoded = jwt2.decode(token, { complete: true });
      console.log('  User ID:', decoded.payload.id);
      console.log('  Issued At:', new Date(decoded.payload.iat * 1000).toLocaleString());
      console.log('  Expires At:', new Date(decoded.payload.exp * 1000).toLocaleString());
      console.log('\n💡 Use this token in Authorization header:');
      console.log('  Authorization: Bearer ' + token + '\n');

      rl.close();
    });
  });
});

