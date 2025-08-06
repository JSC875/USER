import { api } from './api';
import { isDevelopment } from '../config/environment';

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

// Payment Service class
class PaymentService {
  private baseUrl = 'https://bike-taxi-production.up.railway.app';

    // Create payment order
  async createPaymentOrder(
    rideId: string,
    amount: number,
    getToken: () => Promise<string | null>
  ): Promise<PaymentResponse> {
    try {
      if (isDevelopment) {
        console.log('💰 Creating payment order...');
        console.log('🆔 Ride ID:', rideId);
        console.log('💵 Amount (paise):', amount);
        console.log('💵 Amount (INR):', amount / 100);
        console.log('💵 Amount sent to backend (INR):', Math.floor(amount / 100));
      }

      const response = await api.postAuth<{ order: PaymentOrder }>(
        '/api/payments/create-order',
        {
          rideId,
          amount: Math.floor(amount / 100), // Convert paise to INR for backend
        },
        getToken
      );

      if (isDevelopment) {
        console.log('✅ Payment order created:', response);
        console.log('📦 Response data:', response.data);
        console.log('📦 Response success:', response.success);
        console.log('📦 Response message:', response.message);
      }

      return {
        success: response.success,
        data: response.data,
        message: response.message,
      };
    } catch (error) {
      if (isDevelopment) {
        console.error('❌ Error creating payment order:', error);
        console.error('❌ Error details:', JSON.stringify(error, null, 2));
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create payment order',
      };
    }
  }

  // Complete payment flow with WebView
  async processPaymentWithWebView(
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
        console.log('🚀 Starting complete payment flow with WebView...');
        console.log('📋 User info:', userInfo);
      }

      // Step 1: Create payment order
      const orderResponse = await this.createPaymentOrder(rideId, amount, getToken);
      
      if (!orderResponse.success) {
        throw new Error(orderResponse.error || 'Failed to create payment order');
      }

      // Extract order data from response
      const orderData = orderResponse.data;
      if (!orderData?.orderId || !orderData?.keyId) {
        throw new Error('Invalid order data received from backend');
      }

      if (isDevelopment) {
        console.log('✅ Payment order created successfully');
        console.log('📦 Order data:', orderData);
      }

      // Return order data for WebView
      return {
        success: true,
        data: {
          orderId: orderData.orderId,
          keyId: orderData.keyId,
          amount: orderData.amount || amount,
          currency: orderData.currency || 'INR',
          name: 'Roqet Bike Taxi',
          description: `Payment for ride ${rideId}`,
          prefill: userInfo,
        },
        message: 'Payment order created successfully',
      };

    } catch (error) {
      if (isDevelopment) {
        console.error('❌ Error in payment flow:', error);
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment flow failed',
      };
    }
  }

  // Verify payment
  async verifyPayment(
    verificationData: PaymentVerificationData,
    getToken: () => Promise<string | null>
  ): Promise<PaymentResponse> {
    try {
      if (isDevelopment) {
        console.log('🔍 Verifying payment...');
        console.log('📋 Verification data:', verificationData);
      }

      const response = await api.postAuth<{ success: boolean; message: string }>(
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
}

export const paymentService = new PaymentService(); 