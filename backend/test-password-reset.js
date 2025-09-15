const axios = require('axios');
const emailService = require('./services/emailService');

const BASE_URL = 'http://localhost:3001/api/auth';
const TEST_EMAIL = 'test@example.com';

// Test configuration
async function testPasswordRecovery() {
  console.log('🧪 Testing Password Recovery Functionality\n');
  
  try {
    // Test 1: Email service configuration
    console.log('1️⃣  Testing email service configuration...');
    const emailTest = await emailService.testEmailConfiguration();
    if (emailTest.success) {
      console.log('   ✅ Email service is configured correctly');
    } else {
      console.log('   ⚠️  Email service configuration issue:', emailTest.message);
    }
    console.log('');

    // Test 2: Forgot password endpoint
    console.log('2️⃣  Testing forgot password endpoint...');
    try {
      const response = await axios.post(`${BASE_URL}/forgot-password`, {
        email: TEST_EMAIL
      });
      
      if (response.data.success) {
        console.log('   ✅ Forgot password endpoint working correctly');
        console.log('   📧 Response:', response.data.message);
      }
    } catch (error) {
      if (error.response) {
        console.log('   ❌ Forgot password endpoint error:', error.response.data);
      } else {
        console.log('   ❌ Server connection error:', error.message);
      }
    }
    console.log('');

    // Test 3: Invalid email validation
    console.log('3️⃣  Testing email validation...');
    try {
      const response = await axios.post(`${BASE_URL}/forgot-password`, {
        email: 'invalid-email'
      });
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('   ✅ Email validation working correctly');
      } else {
        console.log('   ❌ Email validation not working as expected');
      }
    }
    console.log('');

    // Test 4: Reset password with invalid token
    console.log('4️⃣  Testing reset password with invalid token...');
    try {
      const response = await axios.post(`${BASE_URL}/reset-password`, {
        token: 'invalid-token-12345',
        password: 'NewPassword123!'
      });
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('   ✅ Invalid token handling working correctly');
      } else {
        console.log('   ❌ Invalid token handling not working as expected');
      }
    }
    console.log('');

    // Test 5: Password complexity validation
    console.log('5️⃣  Testing password complexity validation...');
    try {
      const response = await axios.post(`${BASE_URL}/reset-password`, {
        token: 'some-token',
        password: 'weak'
      });
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('   ✅ Password complexity validation working correctly');
      } else {
        console.log('   ❌ Password complexity validation not working as expected');
      }
    }
    console.log('');

    // Test 6: Rate limiting
    console.log('6️⃣  Testing rate limiting...');
    console.log('   ℹ️  Making multiple rapid requests...');
    
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(
        axios.post(`${BASE_URL}/forgot-password`, {
          email: `test${i}@example.com`
        }).catch(err => err.response)
      );
    }
    
    const results = await Promise.all(promises);
    const rateLimitedResponses = results.filter(r => r && r.status === 429);
    
    if (rateLimitedResponses.length > 0) {
      console.log('   ✅ Rate limiting is working correctly');
    } else {
      console.log('   ⚠️  Rate limiting might not be configured for development environment');
    }
    console.log('');

    console.log('🎉 Password recovery functionality tests completed!\n');
    
    console.log('📋 Test Summary:');
    console.log('   • Email service configuration: Tested');
    console.log('   • Forgot password endpoint: Tested');
    console.log('   • Email validation: Tested');
    console.log('   • Invalid token handling: Tested');
    console.log('   • Password complexity validation: Tested');
    console.log('   • Rate limiting: Tested');
    console.log('');
    
    console.log('📧 About Mailtrap:');
    console.log('   • Mailtrap is perfect for testing password reset emails');
    console.log('   • It catches all outgoing emails in a safe environment');
    console.log('   • No risk of sending test emails to real users');
    console.log('   • Provides email preview and testing tools');
    console.log('   • Free tier includes 100 emails/month');
    console.log('');
    
    console.log('🔧 To configure Mailtrap:');
    console.log('   1. Sign up at https://mailtrap.io');
    console.log('   2. Create a new inbox');
    console.log('   3. Copy SMTP credentials to your .env file:');
    console.log('      EMAIL_HOST=sandbox.smtp.mailtrap.io');
    console.log('      EMAIL_PORT=2525');
    console.log('      EMAIL_USER=your_username');
    console.log('      EMAIL_PASS=your_password');

  } catch (error) {
    console.error('❌ Unexpected error during testing:', error.message);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testPasswordRecovery();
}

module.exports = { testPasswordRecovery };