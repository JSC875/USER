// Import RazorpayCheckout with proper error handling for Expo
let RazorpayCheckout: any = null;
try {
  // Try different import methods for Expo compatibility
  RazorpayCheckout = require('react-native-razorpay');
  if (RazorpayCheckout && RazorpayCheckout.default) {
    RazorpayCheckout = RazorpayCheckout.default;
  }
} catch (error) {
  console.error('❌ Failed to import react-native-razorpay:', error);
  // Try alternative import
  try {
    RazorpayCheckout = require('react-native-razorpay').default;
  } catch (altError) {
    console.error('❌ Alternative import also failed:', altError);
  }
}
import { isDevelopment, isProduction } from '../config/environment';
import { paymentService, RazorpayOptions, PaymentVerificationData } from '../services/paymentService';
import { getRazorpayKey, PAYMENT_CONFIG, validatePaymentAmount, RAZORPAY_ERROR_MESSAGES } from '../config/razorpay';

// Payment result types
export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  orderId?: string;
  signature?: string;
  error?: string;
  message?: string;
}

// Payment options interface
export interface PaymentOptions {
  rideId: string;
  amount: number;
  currency?: string;
  description?: string;
  userEmail?: string;
  userPhone?: string;
  userName?: string;
  getToken: () => Promise<string | null>;
}

// Initialize Razorpay payment
export const initializePayment = async (options: PaymentOptions): Promise<PaymentResult> => {
  try {
    if (isDevelopment) {
      console.log('💰 Initializing Razorpay payment...');
      console.log('📋 Payment options:', options);
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

    // Step 1: Create payment order on backend
    const orderResponse = await paymentService.createPaymentOrder(
      options.rideId,
      options.amount,
      options.getToken
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
    const razorpayOptions: RazorpayOptions = {
      key: getRazorpayKey(),
      amount: order.amount, // Amount in paise
      currency: order.currency || PAYMENT_CONFIG.currency,
      name: PAYMENT_CONFIG.name,
      description: options.description || PAYMENT_CONFIG.description,
      order_id: order.id,
      prefill: {
        email: options.userEmail,
        contact: options.userPhone,
        name: options.userName,
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
      console.warn('⚠️ RazorpayCheckout not available, using fallback');
      console.log('🎯 Using development fallback - simulating successful payment');
      // For development, simulate successful payment
      return {
        success: true,
        paymentId: 'dev_payment_' + Date.now(),
        orderId: order.id,
        message: 'Payment completed (development mode)',
      };
    }
    
    try {
      const paymentData = await RazorpayCheckout.open(razorpayOptions);
      
      if (isDevelopment) {
        console.log('💳 Payment data received:', paymentData);
      }
      
      // Step 4: Verify payment on backend
      const verificationData: PaymentVerificationData = {
        rideId: options.rideId,
        paymentId: paymentData.razorpay_payment_id,
        signature: paymentData.razorpay_signature,
        orderId: paymentData.razorpay_order_id,
      };
      
      const verificationResponse = await paymentService.verifyPayment(
        verificationData,
        options.getToken
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
      
      // If Razorpay fails, use development fallback
      if (isDevelopment) {
        console.warn('⚠️ Using development fallback due to Razorpay error');
        console.log('🎯 Razorpay error fallback - simulating successful payment');
        return {
          success: true,
          paymentId: 'dev_payment_' + Date.now(),
          orderId: order.id,
          message: 'Payment completed (development fallback)',
        };
      } else {
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
        message: 'Network error',
      };
    }

    if (error.code === 'INVALID_PAYMENT_METHOD') {
      return {
        success: false,
        error: RAZORPAY_ERROR_MESSAGES.PAYMENT_FAILED,
        message: 'Invalid payment method',
      };
    }

    return {
      success: false,
      error: error.message || 'Payment failed',
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
        paymentId: response.data.paymentId,
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