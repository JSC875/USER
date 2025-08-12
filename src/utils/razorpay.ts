// Import RazorpayCheckout with proper error handling for Expo
let RazorpayCheckout: any = null;

// Enhanced import with multiple fallback methods
const importRazorpay = () => {
  try {
    // Method 1: Direct require
    const razorpay = require('react-native-razorpay');
    if (razorpay && razorpay.default) {
      return razorpay.default;
    }
    if (razorpay && razorpay.open) {
      return razorpay;
    }
    return razorpay;
  } catch (error) {
    console.error('❌ Method 1 failed:', error);
    
    try {
      // Method 2: Dynamic import
      const razorpay = require('react-native-razorpay').default;
      return razorpay;
    } catch (altError) {
      console.error('❌ Method 2 failed:', altError);
      
      try {
        // Method 3: Try with different path
        const razorpay = require('react-native-razorpay/index');
        return razorpay.default || razorpay;
      } catch (thirdError) {
        console.error('❌ Method 3 failed:', thirdError);
        return null;
      }
    }
  }
};

RazorpayCheckout = importRazorpay();
import { isDevelopment, isProduction } from '../config/environment';
import { paymentService, RazorpayOptions, PaymentVerificationData } from '../services/paymentService';
import { getRazorpayKey, PAYMENT_CONFIG, validatePaymentAmount, RAZORPAY_ERROR_MESSAGES, isUsingLiveKeys, getPaymentWarningMessage } from '../config/razorpay';

// Payment result types
export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  orderId?: string;
  signature?: string;
  error?: string;
  message?: string;
}

// Payment options interface for direct payment
export interface PaymentOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: {
    email?: string;
    contact?: string;
    name?: string;
  };
  theme: {
    color: string;
  };
  handler: (response: any) => void;
  modal: {
    ondismiss: () => void;
  };
}

// Amount conversion utilities
export const convertRupeesToPaise = (rupees: number): number => {
  return Math.round(rupees * 100);
};

export const convertPaiseToRupees = (paise: number): number => {
  return paise / 100;
};

export const ensureAmountInPaise = (amount: number, isAlreadyInPaise: boolean = false): number => {
  // If explicitly told the amount is already in paise, don't convert
  if (isAlreadyInPaise) {
    console.log(`💰 Amount ${amount} is already in paise (₹${amount / 100})`);
    return amount;
  }
  
  // Check if this looks like a typical rupee amount for rides (small numbers)
  const typicalRupeeAmounts = [50, 100, 150, 200, 250, 300, 500, 750, 1000];
  
  if (typicalRupeeAmounts.includes(amount)) {
    // This looks like a rupee amount, convert to paise
    console.log(`💰 Converting ₹${amount} to ${amount * 100} paise`);
    return amount * 100;
  }
  
  // For amounts like 7300, 5000, 10000, etc., assume they're already in paise
  // This is the normal case from the ride flow
  console.log(`💰 Amount ${amount} is already in paise (₹${amount / 100})`);
  return amount;
};

export const formatAmountForDisplay = (amount: number, currency: string = 'INR'): string => {
  const rupees = convertPaiseToRupees(amount);
  return `${currency} ${rupees.toFixed(2)}`;
};

// Debug function to help troubleshoot amount issues
export const debugAmountConversion = (originalAmount: number, isAlreadyInPaise: boolean = false): void => {
  console.log('🔍 === AMOUNT CONVERSION DEBUG ===');
  console.log('Original amount:', originalAmount);
  console.log('Amount type:', typeof originalAmount);
  console.log('Is integer:', Number.isInteger(originalAmount));
  console.log('Is <= 1000:', originalAmount <= 1000);
  console.log('Is already in paise:', isAlreadyInPaise);
  
  const convertedAmount = ensureAmountInPaise(originalAmount, isAlreadyInPaise);
  console.log('Converted amount (paise):', convertedAmount);
  console.log('Converted amount (rupees):', convertPaiseToRupees(convertedAmount));
  console.log('Display format:', formatAmountForDisplay(convertedAmount));
  console.log('🔍 === END DEBUG ===');
};

// Initialize Razorpay payment with order data
export const initializePayment = async (options: PaymentOptions): Promise<PaymentResult> => {
  try {
    if (isDevelopment) {
      console.log('💰 Initializing Razorpay payment...');
      console.log('📋 Payment options:', options);
      console.log('🔧 Using live keys:', isUsingLiveKeys());
      console.log('⚠️ Warning:', getPaymentWarningMessage());
      console.log('💰 Amount in paise:', options.amount);
      console.log('💰 Amount in rupees:', convertPaiseToRupees(options.amount));
    }

    // Check if Razorpay is available
    if (isDevelopment) {
      console.log('🔍 RazorpayCheckout object:', RazorpayCheckout);
      console.log('🔍 RazorpayCheckout type:', typeof RazorpayCheckout);
      console.log('🔍 RazorpayCheckout.open:', RazorpayCheckout?.open);
    }
    
    if (!isRazorpayAvailable()) {
      throw new Error('Razorpay is not available. Please ensure react-native-razorpay is properly installed and linked.');
    }

    if (isDevelopment) {
      console.log('🔧 Razorpay options:', options);
    }

    // Step 3: Open Razorpay checkout
    if (!RazorpayCheckout || !RazorpayCheckout.open) {
      console.error('❌ RazorpayCheckout not available');
      throw new Error('Razorpay SDK is not properly installed or initialized. Please check the installation.');
    }
    
    try {
      const paymentData = await RazorpayCheckout.open(options);
      
      if (isDevelopment) {
        console.log('💳 Payment data received:', paymentData);
      }
      
      return {
        success: true,
        paymentId: paymentData.razorpay_payment_id,
        orderId: paymentData.razorpay_order_id,
        signature: paymentData.razorpay_signature,
        message: 'Payment completed successfully',
      };
    } catch (razorpayError: any) {
      if (isDevelopment) {
        console.error('❌ Razorpay checkout error:', razorpayError);
      }
      
      // Only use development fallback if we're using test keys
      if (isDevelopment && !isUsingLiveKeys()) {
        console.warn('⚠️ Using development fallback due to Razorpay error (TEST mode)');
        console.log('🎯 Razorpay error fallback - simulating successful payment');
        return {
          success: true,
          paymentId: 'dev_payment_' + Date.now(),
          orderId: options.order_id,
          message: 'Payment completed (development fallback)',
        };
      } else {
        // For live payments, don't use fallback - throw the actual error
        throw razorpayError;
      }
    }

  } catch (error: any) {
    if (isDevelopment) {
      console.error('❌ Payment error:', error);
    }

    // Handle specific Razorpay errors
    if (error.code === 'PAYMENT_CANCELLED') {
      return {
        success: false,
        error: RAZORPAY_ERROR_MESSAGES.PAYMENT_CANCELLED,
        message: 'Payment cancelled',
      };
    }

    if (error.code === 'NETWORK_ERROR') {
      return {
        success: false,
        error: RAZORPAY_ERROR_MESSAGES.NETWORK_ERROR,
        message: 'Network error occurred',
      };
    }

    if (error.code === 'INVALID_PAYMENT') {
      return {
        success: false,
        error: RAZORPAY_ERROR_MESSAGES.PAYMENT_FAILED,
        message: 'Invalid payment',
      };
    }

    return {
      success: false,
      error: error.message || RAZORPAY_ERROR_MESSAGES.PAYMENT_FAILED,
      message: 'Payment failed',
    };
  }
};

// Legacy function for backward compatibility
export const initializePaymentWithOrder = async (paymentOptions: {
  rideId: string;
  amount: number;
  currency?: string;
  description?: string;
  userEmail?: string;
  userPhone?: string;
  userName?: string;
  getToken: () => Promise<string | null>;
}): Promise<PaymentResult> => {
  try {
    if (isDevelopment) {
      console.log('💰 Initializing Razorpay payment with order...');
      console.log('📋 Payment options:', paymentOptions);
      console.log('🔧 Using live keys:', isUsingLiveKeys());
      console.log('⚠️ Warning:', getPaymentWarningMessage());
    }

    // Check if Razorpay is available
    if (!isRazorpayAvailable()) {
      throw new Error('Razorpay is not available. Please ensure react-native-razorpay is properly installed and linked.');
    }

    // Step 1: Create payment order on backend
    // Convert amount to rupees for backend (if it's in paise)
    const amountForBackend = paymentOptions.amount > 1000 ? convertPaiseToRupees(paymentOptions.amount) : paymentOptions.amount;
    console.log('💰 Amount for backend (rupees):', amountForBackend);
    console.log('💰 Original amount (paise):', paymentOptions.amount);
    
    const orderResponse = await paymentService.createDirectPaymentOrder(
      paymentOptions.rideId,
      amountForBackend,
      {
        email: paymentOptions.userEmail || '',
        phone: paymentOptions.userPhone || '',
        name: paymentOptions.userName || '',
      },
      paymentOptions.getToken
    );

    if (!orderResponse.success) {
      throw new Error(orderResponse.error || 'Failed to create payment order');
    }

    // Handle both response structures
    const order = orderResponse.data?.order || {
      id: orderResponse.data?.orderId,
      amount: orderResponse.data?.amount,
      currency: orderResponse.data?.currency || 'INR',
      receipt: orderResponse.data?.receipt,
      status: 'created',
      created_at: Date.now(),
    };

    if (!order.id) {
      throw new Error('Order ID not received from backend');
    }

    if (isDevelopment) {
      console.log('✅ Payment order created:', order);
    }

    // Step 2: Initialize Razorpay checkout
    const razorpayOptions: PaymentOptions = {
      key: getRazorpayKey(),
      amount: order.amount || 0, // Amount in paise
      currency: order.currency || PAYMENT_CONFIG.currency,
      name: PAYMENT_CONFIG.name,
      description: paymentOptions.description || PAYMENT_CONFIG.description,
      order_id: order.id,
      prefill: {
        email: paymentOptions.userEmail || '',
        contact: paymentOptions.userPhone || '',
        name: paymentOptions.userName || '',
      },
      theme: PAYMENT_CONFIG.theme,
      handler: (response: any) => {
        if (isDevelopment) {
          console.log('✅ Payment successful:', response);
        }
      },
      modal: PAYMENT_CONFIG.modal,
    };

    if (isDevelopment) {
      console.log('🔧 Razorpay options:', razorpayOptions);
    }

    // Step 3: Open Razorpay checkout
    if (!RazorpayCheckout || !RazorpayCheckout.open) {
      console.error('❌ RazorpayCheckout not available');
      throw new Error('Razorpay SDK is not properly installed or initialized. Please check the installation.');
    }
    
    try {
      const paymentData = await RazorpayCheckout.open(razorpayOptions);
      
      if (isDevelopment) {
        console.log('💳 Payment data received:', paymentData);
      }
      
      // Step 4: Verify payment on backend
      const verificationData: PaymentVerificationData = {
        rideId: paymentOptions.rideId,
        paymentId: paymentData.razorpay_payment_id,
        signature: paymentData.razorpay_signature,
        orderId: paymentData.razorpay_order_id,
      };
      
      const verificationResponse = await paymentService.verifyPayment(
        verificationData,
        paymentOptions.getToken
      );
      
      if (!verificationResponse.success) {
        throw new Error(verificationResponse.error || 'Payment verification failed');
      }
      
      if (isDevelopment) {
        console.log('✅ Payment verified successfully');
      }
      
      return {
        success: true,
        paymentId: paymentData.razorpay_payment_id,
        orderId: paymentData.razorpay_order_id,
        signature: paymentData.razorpay_signature,
        message: 'Payment completed successfully',
      };
    } catch (razorpayError: any) {
      if (isDevelopment) {
        console.error('❌ Razorpay checkout error:', razorpayError);
      }
      
      // Only use development fallback if we're using test keys
      if (isDevelopment && !isUsingLiveKeys()) {
        console.warn('⚠️ Using development fallback due to Razorpay error (TEST mode)');
        console.log('🎯 Razorpay error fallback - simulating successful payment');
        return {
          success: true,
          paymentId: 'dev_payment_' + Date.now(),
          orderId: order.id,
          message: 'Payment completed (development fallback)',
        };
      } else {
        // For live payments, don't use fallback - throw the actual error
        throw razorpayError;
      }
    }

  } catch (error: any) {
    if (isDevelopment) {
      console.error('❌ Payment error:', error);
    }

    // Handle specific Razorpay errors
    if (error.code === 'PAYMENT_CANCELLED') {
      return {
        success: false,
        error: RAZORPAY_ERROR_MESSAGES.PAYMENT_CANCELLED,
        message: 'Payment cancelled',
      };
    }

    if (error.code === 'NETWORK_ERROR') {
      return {
        success: false,
        error: RAZORPAY_ERROR_MESSAGES.NETWORK_ERROR,
        message: 'Network error occurred',
      };
    }

    if (error.code === 'INVALID_PAYMENT') {
      return {
        success: false,
        error: RAZORPAY_ERROR_MESSAGES.PAYMENT_FAILED,
        message: 'Invalid payment',
      };
    }

    return {
      success: false,
      error: error.message || RAZORPAY_ERROR_MESSAGES.PAYMENT_FAILED,
      message: 'Payment failed',
    };
  }
};

// Check if Razorpay is available
export const isRazorpayAvailable = (): boolean => {
  try {
    // Check if RazorpayCheckout is available
    return RazorpayCheckout !== null && typeof RazorpayCheckout !== 'undefined' && RazorpayCheckout.open !== undefined;
  } catch (error) {
    if (isDevelopment) {
      console.error('❌ Razorpay not available:', error);
    }
    return false;
  }
};

// Get payment status
export const getPaymentStatus = async (
  rideId: string,
  getToken: () => Promise<string | null>
): Promise<PaymentResult> => {
  try {
    const response = await paymentService.getPaymentStatus(rideId, getToken);
    
    if (response.success && response.data) {
      return {
        success: true,
        message: response.message || 'Payment status retrieved',
        paymentId: response.data.paymentId || '',
      };
    } else {
      return {
        success: false,
        error: response.error || 'Failed to get payment status',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to get payment status',
    };
  }
};

// Format amount for display
export const formatAmount = (amount: number, currency: string = 'INR'): string => {
  return `${currency} ${(amount / 100).toFixed(2)}`;
};

// Re-export the validatePaymentAmount function from config
export { validatePaymentAmount } from '../config/razorpay';

// Get payment method display name
export const getPaymentMethodName = (method: string): string => {
  const methodNames: { [key: string]: string } = {
    card: 'Credit/Debit Card',
    netbanking: 'Net Banking',
    upi: 'UPI',
    wallet: 'Digital Wallet',
    emi: 'EMI',
  };
  
  return methodNames[method] || method;
};

// Payment error messages
export const getPaymentErrorMessage = (errorCode: string): string => {
  const errorMessages: { [key: string]: string } = {
    PAYMENT_CANCELLED: 'Payment was cancelled by you',
    NETWORK_ERROR: 'Network error occurred. Please check your internet connection',
    INVALID_PAYMENT_METHOD: 'Selected payment method is not available',
    INSUFFICIENT_FUNDS: 'Insufficient funds in your account',
    CARD_DECLINED: 'Your card was declined. Please try another card',
    EXPIRED_CARD: 'Your card has expired. Please use a valid card',
    INVALID_CARD: 'Invalid card details. Please check and try again',
    BANK_DECLINED: 'Transaction declined by your bank',
    TIMEOUT: 'Payment request timed out. Please try again',
  };
  
  return errorMessages[errorCode] || 'Payment failed. Please try again';
}; 