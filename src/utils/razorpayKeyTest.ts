import { getRazorpayKey, getRazorpayConfig } from '../config/razorpay';

export const testRazorpayKeyConfiguration = () => {
  console.log('🧪 === RAZORPAY KEY CONFIGURATION TEST ===');
  
  // Get the current configuration
  const config = getRazorpayConfig();
  const key = getRazorpayKey();
  
  console.log('📋 Configuration Details:');
  console.log('  - Key:', key);
  console.log('  - Key Length:', key.length);
  console.log('  - Key Prefix:', key.substring(0, 10));
  console.log('  - Is Live Key:', key.startsWith('rzp_live_'));
  console.log('  - Is Test Key:', key.startsWith('rzp_test_'));
  
  // Validate the key format
  const isValidFormat = /^rzp_(live|test)_[A-Za-z0-9]+$/.test(key);
  console.log('  - Valid Format:', isValidFormat);
  
  // Check if it's the expected live key
  const expectedLiveKey = 'rzp_live_AEcWKhM01jAKqu';
  const isExpectedKey = key === expectedLiveKey;
  console.log('  - Is Expected Live Key:', isExpectedKey);
  
  // Summary
  console.log('📊 Summary:');
  if (key.startsWith('rzp_live_') && isExpectedKey) {
    console.log('  ✅ LIVE KEYS ARE CONFIGURED CORRECTLY');
    console.log('  ✅ You should see LIVE mode in Razorpay UI');
  } else if (key.startsWith('rzp_test_')) {
    console.log('  ❌ TEST KEYS ARE BEING USED');
    console.log('  ❌ You will see TEST mode in Razorpay UI');
  } else {
    console.log('  ⚠️ UNKNOWN KEY FORMAT');
    console.log('  ⚠️ Check your configuration');
  }
  
  console.log('🧪 === END TEST ===');
  
  return {
    key,
    isLiveKey: key.startsWith('rzp_live_'),
    isTestKey: key.startsWith('rzp_test_'),
    isValidFormat,
    isExpectedKey,
    keyLength: key.length
  };
};

export const verifyLiveKeyUsage = () => {
  const result = testRazorpayKeyConfiguration();
  
  if (!result.isLiveKey) {
    throw new Error(`❌ Test keys are being used instead of live keys. Current key: ${result.key}`);
  }
  
  if (!result.isExpectedKey) {
    console.warn(`⚠️ Unexpected live key format: ${result.key}`);
  }
  
  return result;
};
