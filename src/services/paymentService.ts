import { api } from './api';
import { isDevelopment } from '../config/environment';
import { getRazorpayKey, validatePaymentAmount, logRazorpayConfig } from '../config/razorpay';

// Payment types
export interface PaymentOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
  created_at: number;
}

export interface PaymentResponse {
  success: boolean;
  data?: {
    order?: PaymentOrder;
    paymentId?: string;
    signature?: string;
    // Direct response fields from backend
    amount?: number;
    orderId?: string;
    keyId?: string;
    currency?: string;
    receipt?: string;
    message?: string;
    upi_link?: string;
    qr_code_url?: string;
  };
  message?: string;
  error?: string;
}

export interface RazorpayOptions {
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

export interface PaymentVerificationData {
  rideId: string;
  paymentId: string;
  signature: string;
  orderId: string;
}

export interface PostRidePaymentData {
  rideId: string;
  amount: number;
  currency: string;
  userInfo: {
    email?: string;
    phone?: string;
    name?: string;
  };
}

// Payment Service class
class PaymentService {
  private baseUrl = 'https://bike-taxi-production.up.railway.app';

  // Create payment order for post-ride payment
  async createPostRideOrder(
    paymentData: PostRidePaymentData,
    getToken: () => Promise<string | null>
  ): Promise<PaymentResponse> {
    try {
      if (isDevelopment) {
        console.log('💳 Creating post-ride payment order...');
        console.log('📋 Payment data:', paymentData);
      }

      const token = await getToken();
      if (!token) {
        throw new Error('Authentication token not found');
      }

      if (!validatePaymentAmount(paymentData.amount)) {
        throw new Error('Invalid payment amount');
      }

      // Log Razorpay configuration
      logRazorpayConfig();

      const response = await api.postAuth<{ 
        success: boolean; 
        message: string; 
        data?: {
          orderId: string;
          keyId: string;
          amount: number;
          currency: string;
          receipt: string;
          upi_link?: string;
          qr_code_url?: string;
        };
      }>(
        '/api/payments/create-order',
        {
          rideId: paymentData.rideId,
          amount: paymentData.amount,
          currency: paymentData.currency || 'INR',
          payment_method: 'razorpay_webview',
          userInfo: paymentData.userInfo
        },
        getToken
      );

      if (isDevelopment) {
        console.log('✅ Post-ride payment order created:', response);
      }

      return {
        success: response.success,
        data: response.data,
        message: response.message,
      };
    } catch (error) {
      if (isDevelopment) {
        console.error('❌ Error creating post-ride payment order:', error);
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create payment order',
      };
    }
  }

  // Generate UUID for ride ID if not provided
  private generateRideId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Create direct payment order for immediate payment
  async createDirectPaymentOrder(
    rideId: string,
    amount: number,
    userInfo: {
      email?: string;
      phone?: string;
      name?: string;
    },
    getToken: () => Promise<string | null>
  ): Promise<PaymentResponse> {
    try {
      if (isDevelopment) {
        console.log('💳 Creating direct payment order...');
        console.log('📋 Ride ID:', rideId);
        console.log('📋 Amount:', amount);
        console.log('📋 User info:', userInfo);
      }

      const token = await getToken();
      if (!token) {
        throw new Error('Authentication token not found');
      }

      if (!validatePaymentAmount(amount)) {
        throw new Error('Invalid payment amount');
      }

      // Log Razorpay configuration
      logRazorpayConfig();

      // Generate proper UUID if rideId is not in UUID format
      const finalRideId = rideId.includes('-') ? rideId : this.generateRideId();
      
      const response = await api.postAuth<{ 
        success: boolean; 
        message: string; 
        data?: {
          order?: PaymentOrder;
          orderId?: string;
          keyId?: string;
          amount?: number;
          currency?: string;
          receipt?: string;
        };
      }>(
        '/api/payments/create-order',
        {
          rideId: finalRideId,
          amount: amount,
          currency: 'INR',
          payment_method: 'razorpay_direct',
          userInfo: userInfo
        },
        getToken
      );

      if (isDevelopment) {
        console.log('✅ Direct payment order created:', response);
      }

      return {
        success: response.success,
        data: response.data,
        message: response.message,
      };
    } catch (error) {
      if (isDevelopment) {
        console.error('❌ Error creating direct payment order:', error);
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create payment order',
      };
    }
  }

  // Process payment using WebView with order data
  async processWebViewPayment(
    orderData: {
      orderId: string;
      keyId: string;
      amount: number;
      currency: string;
      receipt: string;
    },
    userInfo: {
      email?: string;
      phone?: string;
      name?: string;
    },
    getToken: () => Promise<string | null>
  ): Promise<PaymentResponse> {
    try {
      if (isDevelopment) {
        console.log('🌐 Processing WebView payment...');
        console.log('📋 Order data:', orderData);
        console.log('👤 User info:', userInfo);
      }

      // Return order data for WebView processing
      return {
        success: true,
        data: {
          orderId: orderData.orderId,
          keyId: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency,
          receipt: orderData.receipt,
        },
        message: 'Order ready for WebView payment',
      };
    } catch (error) {
      if (isDevelopment) {
        console.error('❌ Error in WebView payment processing:', error);
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'WebView payment processing failed',
      };
    }
  }

  // Verify payment after WebView completion
  async verifyPayment(
    verificationData: PaymentVerificationData,
    getToken: () => Promise<string | null>
  ): Promise<PaymentResponse> {
    try {
      if (isDevelopment) {
        console.log('🔍 Verifying payment...');
        console.log('📋 Verification data:', verificationData);
      }

      const response = await api.postAuth<{ 
        success: boolean; 
        message: string;
        data?: {
          payment_verified: boolean;
          payment_id: string;
          order_id: string;
          amount: number;
        };
      }>(
        '/api/payments/verify',
        verificationData,
        getToken
      );

      if (isDevelopment) {
        console.log('✅ Payment verification response:', response);
      }

      return {
        success: response.success,
        data: response.data,
        message: response.message,
      };
    } catch (error) {
      if (isDevelopment) {
        console.error('❌ Error verifying payment:', error);
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to verify payment',
      };
    }
  }

  // Get payment status
  async getPaymentStatus(
    rideId: string,
    getToken: () => Promise<string | null>
  ): Promise<PaymentResponse> {
    try {
      if (isDevelopment) {
        console.log('📊 Getting payment status for ride:', rideId);
      }

      const response = await api.getAuth<{ status: string; paymentId?: string }>(
        `/api/payments/status/${rideId}`,
        getToken
      );

      if (isDevelopment) {
        console.log('✅ Payment status:', response);
      }

      return {
        success: response.success,
        data: response.data,
        message: response.message,
      };
    } catch (error) {
      if (isDevelopment) {
        console.error('❌ Error getting payment status:', error);
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get payment status',
      };
    }
  }

  // Get payment history
  async getPaymentHistory(
    getToken: () => Promise<string | null>
  ): Promise<PaymentResponse> {
    try {
      if (isDevelopment) {
        console.log('📚 Getting payment history...');
      }

      const response = await api.getAuth<{ payments: any[] }>(
        '/api/payments/history',
        getToken
      );

      if (isDevelopment) {
        console.log('✅ Payment history:', response);
      }

      return {
        success: response.success,
        data: response.data,
        message: response.message,
      };
    } catch (error) {
      if (isDevelopment) {
        console.error('❌ Error getting payment history:', error);
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get payment history',
      };
    }
  }

  // Refund payment
  async refundPayment(
    paymentId: string,
    amount: number,
    reason: string,
    getToken: () => Promise<string | null>
  ): Promise<PaymentResponse> {
    try {
      if (isDevelopment) {
        console.log('🔄 Processing refund...');
        console.log('💳 Payment ID:', paymentId);
        console.log('💵 Amount:', amount);
        console.log('📝 Reason:', reason);
      }

      const response = await api.postAuth<{ refundId: string; status: string }>(
        '/api/payments/refund',
        {
          paymentId,
          amount: Math.floor(amount / 100), // Convert paise to INR for backend
          reason,
        },
        getToken
      );

      if (isDevelopment) {
        console.log('✅ Refund processed:', response);
      }

      return {
        success: response.success,
        data: response.data,
        message: response.message,
      };
    } catch (error) {
      if (isDevelopment) {
        console.error('❌ Error processing refund:', error);
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process refund',
      };
    }
  }

  // Test payment connectivity
  async testPaymentConnectivity(
    getToken: () => Promise<string | null>
  ): Promise<boolean> {
    try {
      if (isDevelopment) {
        console.log('🧪 Testing payment connectivity...');
      }

      // Use a simple health check endpoint that doesn't require UUID
      const response = await api.getAuth<{ status: string }>(
        '/api/health',
        getToken
      );

      if (isDevelopment) {
        console.log('✅ Payment connectivity test result:', response);
      }

      return response.success;
    } catch (error) {
      if (isDevelopment) {
        console.error('❌ Payment connectivity test failed:', error);
      }
      return false;
    }
  }
}

export const paymentService = new PaymentService(); 