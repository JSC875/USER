import React, { useState, useEffect } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import RazorpayWebView from '../../components/payment/RazorpayWebView';
import { paymentService } from '../../services/paymentService';
import { useAuth } from '@clerk/clerk-expo';
import { emitEvent } from '../../utils/socket';
import { isDevelopment } from '../../config/environment';

type RootStackParamList = {
  WebViewPayment: {
    rideId: string;
    amount: number;
    destination?: any;
    driver?: any;
    estimate?: any;
    // QR-based payment parameters
    orderId?: string;
    paymentLink?: string;
    currency?: string;
    fromQR?: boolean;
  };
  RideSummary: {
    rideId: string;
    amount: number;
    destination: any;
    driver: any;
    estimate: any;
    paymentStatus?: string;
    paymentId?: string;
  };
};

type WebViewPaymentScreenProps = NativeStackScreenProps<RootStackParamList, 'WebViewPayment'>;

export default function WebViewPaymentScreen({ navigation, route }: WebViewPaymentScreenProps) {
  const { 
    rideId, 
    amount, 
    destination, 
    driver, 
    estimate,
    orderId,
    paymentLink,
    currency = 'INR',
    fromQR = false
  } = route.params;
  const { getToken } = useAuth();
  // Socket functions are available via emitEvent
  
  const [isLoading, setIsLoading] = useState(false);
  const [showWebView, setShowWebView] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'completed' | 'failed'>('pending');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [orderData, setOrderData] = useState<any>(null);

  // Validate and ensure minimum amount
  const validatedAmount = Math.max(amount || 0, 100); // Minimum 1 INR (100 paise)
  console.log('💰 WebViewPaymentScreen - Original amount:', amount);
  console.log('💰 WebViewPaymentScreen - Validated amount:', validatedAmount);
  console.log('💰 WebViewPaymentScreen - Amount in INR:', validatedAmount / 100);

  const driverInfo = driver || {
    name: 'Alex Robin',
    vehicleModel: 'Volkswagen',
    vehicleNumber: 'HG5045',
    photo: undefined,
  };

  // Handle payment processing
  const handlePayment = async () => {
    if (isLoading) return;

    setIsLoading(true);
    setPaymentStatus('processing');
    setErrorMessage('');

    try {
      // Get user token
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      if (isDevelopment) {
        console.log('🚀 Starting WebView payment flow...');
        console.log('🔍 From QR:', fromQR);
        console.log('🔍 Order ID:', orderId);
        console.log('🔍 Payment Link:', paymentLink);
      }

      let orderResponse;

      if (fromQR && orderId && paymentLink) {
        // QR-based payment - use existing order data
        orderResponse = {
          success: true,
          data: {
            orderId,
            keyId: 'rzp_test_YOUR_KEY', // This should come from backend
            amount,
            currency,
            name: 'Roqet Bike Taxi',
            description: `Payment for ride ${rideId}`,
            prefill: {
              email: 'user@example.com', // Replace with actual user email
              phone: '+919876543210', // Replace with actual user phone
              name: 'User Name', // Replace with actual user name
            },
          },
          message: 'QR payment order ready'
        };
      } else {
        // Payment orders are now created by driver app
        // Customer should scan QR code from driver
        throw new Error('Please scan the QR code shown by your driver to complete payment');
      }

      if (isDevelopment) {
        console.log('✅ Order data received:', orderResponse.data);
      }

      // Set order data and show WebView
      setOrderData(orderResponse.data);
      setShowWebView(true);

    } catch (error: any) {
      setPaymentStatus('failed');
      setErrorMessage(error.message || 'An unexpected error occurred');
      Alert.alert('Payment Error', error.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle WebView payment success
  const handlePaymentSuccess = async (paymentData: {
    paymentId: string;
    orderId: string;
    signature: string;
  }) => {
    // Emit payment success event for QR-based payments
    if (fromQR) {
      emitEvent('payment_completed', {
        rideId,
        orderId: paymentData.orderId,
        paymentId: paymentData.paymentId,
        amount,
        currency,
        timestamp: Date.now()
      });
    }
    try {
      if (isDevelopment) {
        console.log('✅ WebView payment successful:', paymentData);
      }

      setShowWebView(false);
      setPaymentStatus('processing');

      // Get user token
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      // Step 2: Verify payment on backend
      const verificationResponse = await paymentService.verifyPayment(
        {
          rideId,
          paymentId: paymentData.paymentId,
          signature: paymentData.signature,
          orderId: paymentData.orderId,
        },
        () => getToken()
      );

      if (!verificationResponse.success) {
        throw new Error(verificationResponse.error || 'Payment verification failed');
      }

      if (isDevelopment) {
        console.log('✅ Payment verified successfully');
      }

      // Step 3: Emit socket event to notify driver
      const paymentSuccessEvent = {
        rideId,
        paymentId: paymentData.paymentId,
        orderId: paymentData.orderId,
        amount: validatedAmount,
        status: 'success',
        timestamp: Date.now(),
      };

      if (isDevelopment) {
        console.log('📡 Emitting payment_success event:', paymentSuccessEvent);
      }

      emitEvent('payment_success', paymentSuccessEvent);

      // Step 4: Show success and navigate
      setPaymentStatus('completed');
      Alert.alert(
        'Payment Successful!',
        'Your payment has been processed successfully.',
        [
          {
            text: 'Continue',
            onPress: () => {
              // Navigate to ride summary with payment info
              navigation.navigate('RideSummary', {
                destination,
                driver: driverInfo,
                rideId,
                estimate,
                paymentInfo: {
                  paymentId: paymentData.paymentId,
                  orderId: paymentData.orderId,
                  amount: `₹${(validatedAmount / 100).toFixed(2)}`,
                  status: 'completed',
                },
              });
            },
          },
        ]
      );

    } catch (error: any) {
      if (isDevelopment) {
        console.error('❌ Payment verification error:', error);
      }
      setPaymentStatus('failed');
      setErrorMessage(error.message || 'Payment verification failed');
      Alert.alert('Payment Error', error.message || 'Payment verification failed');
    }
  };

  // Handle WebView payment failure
  const handlePaymentFailure = (error: string) => {
    if (isDevelopment) {
      console.log('❌ WebView payment failed:', error);
    }
    setShowWebView(false);
    setPaymentStatus('failed');
    setErrorMessage(error);
    Alert.alert('Payment Failed', error);
  };

  // Handle WebView close
  const handleWebViewClose = () => {
    setShowWebView(false);
    if (paymentStatus === 'processing') {
      setPaymentStatus('pending');
    }
  };

  // Handle payment retry
  const handleRetry = () => {
    setPaymentStatus('pending');
    setErrorMessage('');
    handlePayment();
  };

  // Handle skip payment (for testing)
  const handleSkipPayment = () => {
    Alert.alert(
      'Skip Payment',
      'Are you sure you want to skip payment? This is only for testing purposes.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Skip',
          onPress: () => {
            // Emit payment success event for testing
            const testPaymentEvent = {
              rideId,
              paymentId: 'test_payment_' + Date.now(),
              orderId: 'test_order_' + Date.now(),
              amount: validatedAmount,
              status: 'success',
              timestamp: Date.now(),
            };

            if (isDevelopment) {
              console.log('🧪 Emitting test payment_success event:', testPaymentEvent);
            }

            emitEvent('payment_success', testPaymentEvent);

            navigation.navigate('RideSummary', {
              destination,
              driver: driverInfo,
              rideId,
              estimate,
              paymentInfo: {
                status: 'skipped',
                amount: `₹${(validatedAmount / 100).toFixed(2)}`,
              },
            });
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Secure Payment</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Payment Status */}
        <View style={styles.statusContainer}>
          {paymentStatus === 'pending' && (
            <View style={styles.statusCard}>
              <Ionicons name="shield-checkmark" size={48} color={Colors.primary} />
              <Text style={styles.statusTitle}>Secure Payment Gateway</Text>
              <Text style={styles.statusSubtitle}>
                Your payment will be processed securely through Razorpay
              </Text>
            </View>
          )}

          {paymentStatus === 'processing' && (
            <View style={styles.statusCard}>
              <LoadingSpinner size="large" text="Processing Payment" />
              <Text style={styles.statusSubtitle}>
                Please wait while we process your payment...
              </Text>
            </View>
          )}

          {paymentStatus === 'completed' && (
            <View style={styles.statusCard}>
              <Ionicons name="checkmark-circle" size={48} color={Colors.success} />
              <Text style={styles.statusTitle}>Payment Successful!</Text>
              <Text style={styles.statusSubtitle}>
                Your payment has been processed successfully
              </Text>
            </View>
          )}

          {paymentStatus === 'failed' && (
            <View style={styles.statusCard}>
              <Ionicons name="close-circle" size={48} color={Colors.error} />
              <Text style={styles.statusTitle}>Payment Failed</Text>
              <Text style={styles.statusSubtitle}>
                {errorMessage || 'Payment could not be processed'}
              </Text>
            </View>
          )}
        </View>

        {/* Ride Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Ride Summary</Text>
          
          <View style={styles.routeInfo}>
            <View style={styles.routePoint}>
              <View style={styles.pickupDot} />
              <View style={styles.routeDetails}>
                <Text style={styles.routeLabel}>From</Text>
                <Text style={styles.routeAddress}>
                  {estimate?.pickup || 'Your pickup location'}
                </Text>
              </View>
            </View>

            <View style={styles.routeLine} />

            <View style={styles.routePoint}>
              <View style={styles.destinationDot} />
              <View style={styles.routeDetails}>
                <Text style={styles.routeLabel}>To</Text>
                <Text style={styles.routeAddress}>
                  {destination?.name || 'Your destination'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.tripStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{estimate?.distance || '--'}</Text>
              <Text style={styles.statLabel}>Distance</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{estimate?.duration || '--'}</Text>
              <Text style={styles.statLabel}>Duration</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>₹{estimate?.fare ?? '--'}</Text>
              <Text style={styles.statLabel}>Fare</Text>
            </View>
          </View>
        </View>

        {/* Payment Details */}
        <View style={styles.paymentCard}>
          <Text style={styles.cardTitle}>Payment Details</Text>
          
          <View style={styles.paymentItem}>
            <Text style={styles.paymentLabel}>Ride Fare</Text>
            <Text style={styles.paymentValue}>₹{estimate?.fare ?? '--'}</Text>
          </View>
          
          <View style={styles.paymentItem}>
            <Text style={styles.paymentLabel}>Platform Fee</Text>
            <Text style={styles.paymentValue}>₹0</Text>
          </View>
          
          <View style={styles.paymentItem}>
            <Text style={styles.paymentLabel}>Taxes</Text>
            <Text style={styles.paymentValue}>₹0</Text>
          </View>
          
          <View style={styles.paymentDivider} />
          
          <View style={styles.paymentTotal}>
            <Text style={styles.paymentTotalLabel}>Total Amount</Text>
            <Text style={styles.paymentTotalValue}>₹{estimate?.fare ?? '--'}</Text>
          </View>
        </View>

        {/* Security Info */}
        <View style={styles.securityCard}>
          <View style={styles.securityHeader}>
            <Ionicons name="shield-checkmark" size={24} color={Colors.success} />
            <Text style={styles.securityTitle}>Secure Payment</Text>
          </View>
          <Text style={styles.securityText}>
            Your payment is processed securely through Razorpay's PCI DSS compliant payment gateway. 
            We never store your card details.
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        {paymentStatus === 'pending' && (
          <>
            <Button
              title={`Pay Securely ₹${(validatedAmount / 100).toFixed(2)}`}
              onPress={handlePayment}
              style={styles.payButton}
              disabled={isLoading}
            />
            {__DEV__ && (
              <TouchableOpacity
                style={styles.skipButton}
                onPress={handleSkipPayment}
                disabled={isLoading}
              >
                <Text style={styles.skipButtonText}>Skip Payment (Dev)</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {paymentStatus === 'failed' && (
          <>
            <Button
              title="Retry Payment"
              onPress={handleRetry}
              style={styles.retryButton}
              disabled={isLoading}
            />
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => navigation.goBack()}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </>
        )}

        {isLoading && (
          <View style={styles.loadingContainer}>
            <LoadingSpinner size="small" />
            <Text style={styles.loadingText}>Processing...</Text>
          </View>
        )}
      </View>

      {/* Razorpay WebView Modal */}
      {orderData && (
        <RazorpayWebView
          visible={showWebView}
          onClose={handleWebViewClose}
          onSuccess={handlePaymentSuccess}
          onFailure={handlePaymentFailure}
          orderData={orderData}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backButton: {
    padding: Layout.spacing.sm,
  },
  headerTitle: {
    fontSize: Layout.fontSize.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  placeholder: {
    width: 40,
  },
  statusContainer: {
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
  },
  statusCard: {
    backgroundColor: Colors.white,
    borderRadius: Layout.borderRadius.lg,
    padding: Layout.spacing.xl,
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statusTitle: {
    fontSize: Layout.fontSize.lg,
    fontWeight: '600',
    color: Colors.text,
    marginTop: Layout.spacing.md,
    marginBottom: Layout.spacing.sm,
  },
  statusSubtitle: {
    fontSize: Layout.fontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: Colors.white,
    marginHorizontal: Layout.spacing.lg,
    marginBottom: Layout.spacing.md,
    borderRadius: Layout.borderRadius.lg,
    padding: Layout.spacing.lg,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: Layout.fontSize.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Layout.spacing.md,
  },
  routeInfo: {
    marginBottom: Layout.spacing.md,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickupDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
    marginRight: Layout.spacing.md,
  },
  destinationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.coral,
    marginRight: Layout.spacing.md,
  },
  routeDetails: {
    flex: 1,
    paddingVertical: Layout.spacing.sm,
  },
  routeLabel: {
    fontSize: Layout.fontSize.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  routeAddress: {
    fontSize: Layout.fontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: Colors.gray300,
    marginLeft: 5,
    marginVertical: 4,
  },
  tripStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: Layout.spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: Layout.fontSize.lg,
    fontWeight: 'bold',
    color: Colors.text,
  },
  statLabel: {
    fontSize: Layout.fontSize.sm,
    color: Colors.textSecondary,
    marginTop: Layout.spacing.xs,
  },
  paymentCard: {
    backgroundColor: Colors.white,
    marginHorizontal: Layout.spacing.lg,
    marginBottom: Layout.spacing.md,
    borderRadius: Layout.borderRadius.lg,
    padding: Layout.spacing.lg,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  paymentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Layout.spacing.sm,
  },
  paymentLabel: {
    fontSize: Layout.fontSize.md,
    color: Colors.textSecondary,
  },
  paymentValue: {
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  paymentDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Layout.spacing.sm,
  },
  paymentTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Layout.spacing.sm,
  },
  paymentTotalLabel: {
    fontSize: Layout.fontSize.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  paymentTotalValue: {
    fontSize: Layout.fontSize.lg,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  securityCard: {
    backgroundColor: Colors.white,
    marginHorizontal: Layout.spacing.lg,
    marginBottom: Layout.spacing.lg,
    borderRadius: Layout.borderRadius.lg,
    padding: Layout.spacing.lg,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  securityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Layout.spacing.sm,
  },
  securityTitle: {
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: Layout.spacing.sm,
  },
  securityText: {
    fontSize: Layout.fontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  bottomActions: {
    backgroundColor: Colors.white,
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  payButton: {
    marginBottom: Layout.spacing.sm,
  },
  retryButton: {
    marginBottom: Layout.spacing.sm,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: Layout.spacing.md,
  },
  skipButtonText: {
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: Layout.spacing.md,
  },
  cancelButtonText: {
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
    color: Colors.error,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Layout.spacing.md,
  },
  loadingText: {
    fontSize: Layout.fontSize.md,
    color: Colors.white,
    marginLeft: Layout.spacing.sm,
  },
}); 