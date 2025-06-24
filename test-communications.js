/**
 * Test Script for Multi-Channel OTP Delivery System
 * Run this script to test all communication services
 */

import dotenv from 'dotenv';
dotenv.config();

import { 
  sendOTPNotification,
  sendOrderConfirmationNotification,
  sendStatusUpdateNotification 
} from './services/communicationService.js';

const testUser = {
  name: 'Test User',
  email: 'test@example.com', // Replace with actual test email
  phone: '+1234567890'        // Replace with actual test phone
};

const mockOrder = {
  _id: 'TEST-ORDER-123',
  totalAmount: 149.99,
  items: [
    { name: 'Test Product', qty: 2, price: 74.99 }
  ],
  shipping: {
    address: '123 Test Street, Test City, TC 12345'
  }
};

async function runTests() {
  console.log('🚀 Starting Multi-Channel Communication Tests...\n');

  try {
    // Test 1: OTP Notification
    console.log('📧 Testing OTP Notification...');
    const otpResult = await sendOTPNotification(testUser, '123456', mockOrder._id);
    console.log('OTP Result:', otpResult.summary);
    console.log('');

    // Test 2: Order Confirmation
    console.log('🛍️ Testing Order Confirmation...');
    const confirmResult = await sendOrderConfirmationNotification(testUser, mockOrder);
    console.log('Confirmation Result:', confirmResult.summary);
    console.log('');

    // Test 3: Status Update
    console.log('📦 Testing Status Update...');
    const statusResult = await sendStatusUpdateNotification(testUser, mockOrder._id, 'Shipped');
    console.log('Status Update Result:', statusResult.summary);
    console.log('');

    // Summary
    console.log('✅ All tests completed!');
    console.log('📊 Summary:');
    console.log(`- OTP: ${otpResult.summary.sent}/${otpResult.summary.total} sent`);
    console.log(`- Confirmation: ${confirmResult.summary.sent}/${confirmResult.summary.total} sent`);
    console.log(`- Status: ${statusResult.summary.sent}/${statusResult.summary.total} sent`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Check environment variables
function checkEnvVars() {
  const required = [
    'BREVO_API_KEY',
    'SMS_API_KEY', 
    'WATI_API_KEY'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.log('⚠️  Missing environment variables:');
    missing.forEach(key => console.log(`   - ${key}`));
    console.log('\nPlease add these to your .env file before testing.\n');
  } else {
    console.log('✅ All required environment variables are set.\n');
  }

  return missing.length === 0;
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🧪 Multi-Channel OTP Delivery Test Suite\n');
  
  if (checkEnvVars()) {
    runTests();
  } else {
    console.log('💡 To test with your actual services:');
    console.log('1. Copy .env.example to .env');
    console.log('2. Fill in your API keys');
    console.log('3. Update testUser email/phone in this script');
    console.log('4. Run: node test-communications.js');
  }
}
