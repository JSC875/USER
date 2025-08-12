import Constants from 'expo-constants';

// Get environment variables from Constants
const getEnvVar = (key: string, fallback?: string): string => {
  return Constants.expoConfig?.extra?.[key] || process.env[key] || fallback || '';
};

// Check if we're in development mode
const isDevelopment = __DEV__;
const isProduction = !__DEV__;

// Razorpay Configuration - Always use live keys
export const RAZORPAY_CONFIG = {
  // Live keys for production
  live: {
    key: getEnvVar('EXPO_PUBLIC_RAZORPAY_LIVE_KEY', 'rzp_live_AEcWKhM01jAKqu'),
    secret: getEnvVar('EXPO_PUBLIC_RAZORPAY_LIVE_SECRET', 'N89cllTVPqHC6CzDCXHlZhxM'),
  },
};

// Get the appropriate configuration - Always use live keys
export const getRazorpayConfig = () => {
  console.log('🔧 Razorpay: Using LIVE keys for all environments');
  console.log('🔧 Razorpay Live Key from Constants:', Constants.expoConfig?.extra?.EXPO_PUBLIC_RAZORPAY_LIVE_KEY);
  console.log('🔧 Razorpay Live Key from process.env:', process.env.EXPO_PUBLIC_RAZORPAY_LIVE_KEY);
  console.log('🔧 Final Razorpay Key:', RAZORPAY_CONFIG.live.key);
  
  return RAZORPAY_CONFIG.live;
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
  return Boolean(key && key.startsWith('rzp_') && key.length > 10);
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
  
  console.log('🔧 Razorpay Configuration:');
  console.log('Environment:', isProduction ? 'Production' : 'Development');
  console.log('Using Live Keys: ✅ Yes (Always)');
  console.log('Key configured:', isRazorpayConfigured());
  console.log('Key prefix:', getRazorpayKey().substring(0, 10) + '...');
  console.log('Full Key:', getRazorpayKey());
  console.log('⚠️ WARNING: Using LIVE keys - Real money will be charged!');
};

// Get payment warning message - Always live keys
export const getPaymentWarningMessage = (): string => {
  return '⚠️ This is a REAL payment that will charge your account. Use small amounts for testing.';
}; 

 