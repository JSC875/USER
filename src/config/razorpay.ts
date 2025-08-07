import { isDevelopment, isProduction } from './environment';

// Razorpay Configuration
export const RAZORPAY_CONFIG = {
  // Test keys - Replace with your actual test keys
  test: {
    key: 'rzp_test_JNLEoGZvX3AWac',
    secret: 'qqp0kCPz1T1fdztNHz3FOtc5',
  },
  // Production keys - Live keys for production
  production: {
    key: 'rzp_live_AEcWKhM01jAKqu',
    secret: 'N89cllTVPqHC6CzDCXHlZhxM',
  },
};

// Get the appropriate configuration based on environment
export const getRazorpayConfig = () => {
  // For production builds, always use live keys
  if (isProduction) {
    return RAZORPAY_CONFIG.production;
  }
  
  // For development, check if we want to test with live keys
  const useLiveKeysInDev = process.env.EXPO_PUBLIC_USE_LIVE_KEYS === 'true';
  
  if (useLiveKeysInDev) {
    console.log('🔧 Using LIVE keys in development mode');
    return RAZORPAY_CONFIG.production;
  }
  
  // Default to test keys in development
  console.log('🔧 Using TEST keys in development mode');
  return RAZORPAY_CONFIG.test;
};

// Get Razorpay key for client-side usage
export const getRazorpayKey = (): string => {
  const config = getRazorpayConfig();
  return config.key;
};

// Get Razorpay secret for server-side usage (should not be exposed to client)
export const getRazorpaySecret = (): string => {
  const config = getRazorpayConfig();
  return config.secret;
};

// Check if we're using live keys
export const isUsingLiveKeys = (): boolean => {
  return getRazorpayKey().startsWith('rzp_live_');
};

// Payment configuration
export const PAYMENT_CONFIG = {
  currency: 'INR',
  name: 'Roqet Bike Taxi',
  description: 'Bike taxi ride payment',
  theme: {
    color: '#007AFF',
  },
  // Payment methods to enable
  paymentMethods: {
    card: true,
    netbanking: true,
    upi: true,
    wallet: true,
    emi: true,
  },
  // Prefill options
  prefill: {
    email: '', // Will be set dynamically
    contact: '', // Will be set dynamically
    name: '', // Will be set dynamically
  },
  // Modal options
  modal: {
    ondismiss: () => {
      if (isDevelopment) {
        console.log('Payment modal dismissed');
      }
    },
  },
};

// Validation functions
export const validateRazorpayKey = (key: string): boolean => {
  return key && key.startsWith('rzp_') && key.length > 10;
};

export const validatePaymentAmount = (amount: number): boolean => {
  return amount > 0 && amount <= 1000000; // Max 10 lakh rupees
};

// Error messages
export const RAZORPAY_ERROR_MESSAGES = {
  INVALID_KEY: 'Invalid Razorpay key configuration',
  INVALID_AMOUNT: 'Invalid payment amount',
  NETWORK_ERROR: 'Network error occurred during payment',
  PAYMENT_CANCELLED: 'Payment was cancelled by user',
  PAYMENT_FAILED: 'Payment failed. Please try again',
  VERIFICATION_FAILED: 'Payment verification failed',
  ORDER_CREATION_FAILED: 'Failed to create payment order',
  LIVE_PAYMENT_WARNING: '⚠️ This is a REAL payment that will charge your account',
};

// Success messages
export const RAZORPAY_SUCCESS_MESSAGES = {
  PAYMENT_SUCCESS: 'Payment completed successfully',
  ORDER_CREATED: 'Payment order created successfully',
  VERIFICATION_SUCCESS: 'Payment verified successfully',
};

// Development helpers
export const isRazorpayConfigured = (): boolean => {
  const config = getRazorpayConfig();
  return validateRazorpayKey(config.key);
};

export const logRazorpayConfig = () => {
  const config = getRazorpayConfig();
  const isLive = isUsingLiveKeys();
  
  console.log('🔧 Razorpay Configuration:');
  console.log('Environment:', isProduction ? 'Production' : 'Development');
  console.log('Using Live Keys:', isLive ? '✅ Yes' : '❌ No');
  console.log('Key configured:', isRazorpayConfigured());
  console.log('Key prefix:', getRazorpayKey().substring(0, 10) + '...');
  console.log('Full Key:', getRazorpayKey());
  
  if (isLive) {
    console.log('⚠️ WARNING: Using LIVE keys - Real money will be charged!');
  } else {
    console.log('✅ Using TEST keys - No real money will be charged');
  }
};

// Get payment warning message based on environment
export const getPaymentWarningMessage = (): string => {
  if (isUsingLiveKeys()) {
    return '⚠️ This is a REAL payment that will charge your account. Use small amounts for testing.';
  }
  return '✅ This is a TEST payment. No real money will be charged.';
}; 