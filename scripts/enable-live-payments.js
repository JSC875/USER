#!/usr/bin/env node

/**
 * Enable Live Payments Script
 * 
 * This script helps you enable live Razorpay payments in your development environment.
 * Run this script to set up the necessary environment variables and configurations.
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Enabling Live Razorpay Payments...\n');

// Check if .env file exists
const envPath = path.join(process.cwd(), '.env');
const envExists = fs.existsSync(envPath);

if (!envExists) {
  console.log('📝 Creating .env file...');
  fs.writeFileSync(envPath, '');
}

// Read current .env content
let envContent = '';
if (envExists) {
  envContent = fs.readFileSync(envPath, 'utf8');
}

// Check if EXPO_PUBLIC_USE_LIVE_KEYS is already set
if (envContent.includes('EXPO_PUBLIC_USE_LIVE_KEYS=true')) {
  console.log('✅ Live payments are already enabled!');
  console.log('   Environment variable: EXPO_PUBLIC_USE_LIVE_KEYS=true');
} else {
  // Add the environment variable
  const newEnvContent = envContent + '\n# Enable live Razorpay payments\nEXPO_PUBLIC_USE_LIVE_KEYS=true\n';
  fs.writeFileSync(envPath, newEnvContent);
  console.log('✅ Added EXPO_PUBLIC_USE_LIVE_KEYS=true to .env file');
}

console.log('\n🔧 Configuration Summary:');
console.log('   - Live Keys: rzp_live_AEcWKhM01jAKqu');
console.log('   - Environment: Development with Live Keys');
console.log('   - Currency: INR');
console.log('   - Warnings: Enabled for real payments');

console.log('\n⚠️  IMPORTANT WARNINGS:');
console.log('   - This will charge REAL money to your account');
console.log('   - Use small amounts (₹1-₹10) for testing');
console.log('   - Test with your own payment methods only');
console.log('   - Keep your device secure during testing');

console.log('\n🧪 To test live payments:');
console.log('   1. Restart your development server');
console.log('   2. Open the Roqet app');
console.log('   3. Go to Profile → About → Tap "Roqet" 3 times');
console.log('   4. Tap "Live Payment" button');
console.log('   5. Use small amounts for testing');

console.log('\n🔄 To disable live payments:');
console.log('   - Remove EXPO_PUBLIC_USE_LIVE_KEYS=true from .env file');
console.log('   - Or set EXPO_PUBLIC_USE_LIVE_KEYS=false');

console.log('\n📞 For support:');
console.log('   - Check console logs for detailed errors');
console.log('   - Verify Razorpay dashboard for transactions');
console.log('   - Review LIVE_PAYMENTS_IMPLEMENTATION_GUIDE.md');

console.log('\n🎉 Live payments are now enabled!');
console.log('   Remember to test with small amounts first.');
