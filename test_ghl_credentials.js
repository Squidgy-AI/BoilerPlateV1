// Test GHL credentials generation after email changes
const { generateGHLEmail, getBase2FAEmail, getGHLCredentials } = require('./src/constants/ghlCredentials.js');

console.log('🧪 Testing GHL Credentials Generation');
console.log('=' * 50);

console.log('Generated GHL Email:', generateGHLEmail());
console.log('Base 2FA Email:', getBase2FAEmail());
console.log('Full GHL Credentials:', getGHLCredentials());

console.log('\n✅ Frontend credentials test completed');