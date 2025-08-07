import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@clerk/clerk-expo';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import { paymentService } from '../../services/paymentService';
import RazorpayWebView from '../../components/payment/RazorpayWebView';
import { isDevelopment } from '../../config/environment';

interface PostRidePaymentScreenProps {
  navigation: any;
  route: {
    params: {
      rideId: string;
      amount: number; // in paise
      destination: string | {
        name: string;
        latitude: number;
        longitude: number;
      };
      driver: {
        name: string;
        phone: string;
        vehicleNumber?: string;
      };
      estimate: {
        fare: number;
        distance: string;
        duration: string;
      };
    };
  };
}

export default function PostRidePaymentScreen({ navigation, route }: PostRidePaymentScreenProps) {
  const { getToken } = useAuth();
  const { rideId, amount, destination, driver, estimate } = route.params;

  // Extract destination name safely
  const destinationName = typeof destination === 'string' ? destination : destination?.name || 'Destination';

  // Extract driver name safely
  const driverName = driver?.name || 'Driver';

  // Extract estimate properties safely
  const estimateDistance = estimate?.distance || 'N/A';
  const estimateDuration = estimate?.duration || 'N/A';

  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'completed' | 'failed'>('pending');
  const [errorMessage, setErrorMessage] = useState('');
  const [showWebView, setShowWebView] = useState(false);
  const [orderData, setOrderData] = useState<any>(null);
  const [userInfo, setUserInfo] = useState<any>(null);

  // Format amount for display
  const formatAmount = (amountInPaise: number) => {
    return `₹${(amountInPaise / 100).toFixed(2)}`;
  };

  // Initialize payment flow
  useEffect(() => {
    if (isDevelopment) {
      console.log('🎯 PostRidePaymentScreen mounted with params:', route.params);
      console.log('🎯 Destination type:', typeof destination);
      console.log('🎯 Destination value:', destination);
      console.log('🎯 Destination name:', destinationName);
      console.log('🎯 Driver:', driver);
      console.log('🎯 Estimate:', estimate);
    }
    
    // Validate required parameters
    if (!rideId || !amount) {
      console.error('❌ Missing required parameters:', { rideId, amount });
      setErrorMessage('Invalid ride data. Please try again.');
      setPaymentStatus('failed');
      return;
    }
    
    initializePayment();
  }, []);

  const initializePayment = async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');

      if (isDevelopment) {
        console.log('🚀 Initializing post-ride payment...');
        console.log('🆔 Ride ID:', rideId);
        console.log('💵 Amount:', formatAmount(amount));
        console.log('📋 Route params:', route.params);
      }

      // Get user token
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      if (isDevelopment) {
        console.log('✅ Authentication token obtained');
      }

      // Get user info from token or user context
      const userInfoData = {
        email: 'customer@example.com', // Replace with actual user email
        phone: '+919876543210', // Replace with actual user phone
        name: 'Customer Name', // Replace with actual user name
      };
      setUserInfo(userInfoData);

      if (isDevelopment) {
        console.log('👤 User info set:', userInfoData);
      }

      // Step 1: Create payment order via API
      if (isDevelopment) {
        console.log('📡 Calling payment service to create order...');
      }

      // Convert amount from paise to rupees for backend
      const amountInRupees = amount / 100;
      console.log('💰 Amount in paise:', amount);
      console.log('💰 Amount in rupees for backend:', amountInRupees);
      
      const orderResponse = await paymentService.createPostRideOrder(
        {
          rideId,
          amount: amountInRupees,
          currency: 'INR',
          userInfo: userInfoData,
        },
        getToken
      );

      if (isDevelopment) {
        console.log('📡 Order creation response:', orderResponse);
      }

      if (!orderResponse.success) {
        throw new Error(orderResponse.error || 'Failed to create payment order');
      }

      if (isDevelopment) {
        console.log('✅ Payment order created successfully');
        console.log('📋 Order data:', orderResponse.data);
      }

      // Store order data for WebView
      const orderDataToStore = {
        orderId: orderResponse.data?.orderId,
        keyId: orderResponse.data?.keyId,
        amount: orderResponse.data?.amount,
        currency: orderResponse.data?.currency,
        receipt: orderResponse.data?.receipt,
      };

      setOrderData(orderDataToStore);

      if (isDevelopment) {
        console.log('💾 Order data stored for WebView:', orderDataToStore);
      }

      // Show WebView for payment
      if (isDevelopment) {
        console.log('🌐 Opening Razorpay WebView...');
      }

      setShowWebView(true);

    } catch (error: any) {
      if (isDevelopment) {
        console.error('❌ Payment initialization error:', error);
        console.error('❌ Error stack:', error.stack);
        console.error('❌ Error message:', error.message);
      }
      setErrorMessage(error.message || 'Failed to initialize payment');
      setPaymentStatus('failed');
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
    try {
      if (isDevelopment) {
        console.log('✅ WebView payment successful:', paymentData);
        console.log('🔍 Payment data validation:');
        console.log('  - Payment ID:', paymentData.paymentId);
        console.log('  - Order ID:', paymentData.orderId);
        console.log('  - Signature:', paymentData.signature);
      }

      setShowWebView(false);
      setPaymentStatus('processing');

      if (isDevelopment) {
        console.log('🔄 Starting payment verification...');
      }

      // Step 2: Verify payment with backend
      const verificationResponse = await paymentService.verifyPayment(
        {
          rideId,
          paymentId: paymentData.paymentId,
          signature: paymentData.signature,
          orderId: paymentData.orderId,
        },
        getToken
      );

      if (isDevelopment) {
        console.log('📡 Verification response:', verificationResponse);
      }

      if (!verificationResponse.success) {
        throw new Error(verificationResponse.error || 'Payment verification failed');
      }

      if (isDevelopment) {
        console.log('✅ Payment verified successfully');
      }

      // Step 3: Show success and navigate
      setPaymentStatus('completed');
      Alert.alert(
        'Payment Successful! 🎉',
        'Your payment has been processed successfully.',
        [
          {
            text: 'View Ride Summary',
            onPress: () => {
              if (isDevelopment) {
                console.log('🚀 Navigating to RideSummary with payment info');
              }
              navigation.navigate('RideSummary', {
                destination,
                driver,
                rideId,
                estimate,
                paymentInfo: {
                  paymentId: paymentData.paymentId,
                  orderId: paymentData.orderId,
                  amount: formatAmount(amount),
                  status: 'completed',
                  paymentMethod: 'RAZORPAY_WEBVIEW',
                },
              });
            },
          },
        ]
      );

    } catch (error: any) {
      if (isDevelopment) {
        console.error('❌ Payment verification error:', error);
        console.error('❌ Error stack:', error.stack);
        console.error('❌ Error message:', error.message);
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
      console.log('🔍 Failure details:');
      console.log('  - Error message:', error);
      console.log('  - Current order data:', orderData);
      console.log('  - Current user info:', userInfo);
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
    initializePayment();
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
            navigation.navigate('RideSummary', {
              destination,
              driver,
              rideId,
              estimate,
              paymentInfo: {
                status: 'skipped',
                amount: formatAmount(amount),
              },
            });
          },
        },
      ]
    );
  };

  // Test payment connectivity
  const testPaymentConnectivity = async () => {
    try {
      if (isDevelopment) {
        console.log('🧪 Testing payment connectivity...');
      }

      const token = await getToken();
      if (!token) {
        Alert.alert('Test Failed', 'Authentication token not found');
        return;
      }

      const isConnected = await paymentService.testPaymentConnectivity(getToken);
      
      if (isDevelopment) {
        console.log('🧪 Payment connectivity test result:', isConnected);
      }

      Alert.alert(
        'Payment Test',
        isConnected ? 'Payment service is connected!' : 'Payment service connection failed',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      if (isDevelopment) {
        console.error('🧪 Payment connectivity test error:', error);
      }
      Alert.alert('Test Error', error.message || 'Payment test failed');
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Initializing payment...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render WebView modal
  if (showWebView && orderData) {
    return (
      <RazorpayWebView
        visible={showWebView}
        onClose={handleWebViewClose}
        onSuccess={handlePaymentSuccess}
        onFailure={handlePaymentFailure}
        orderData={{
          orderId: orderData.orderId,
          keyId: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency,
          name: 'Bike Taxi Ride',
          description: `Payment for ride to ${destinationName}`,
          prefill: userInfo || {},
        }}
      />
    );
  }

  // Main render with error handling
  try {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Complete Payment</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Payment Summary */}
          <View style={styles.summaryContainer}>
            <View style={styles.summaryHeader}>
              <Ionicons name="card" size={32} color={Colors.primary} />
              <Text style={styles.summaryTitle}>Payment Summary</Text>
            </View>

            <View style={styles.summaryDetails}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Ride ID</Text>
                <Text style={styles.summaryValue}>{rideId}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Destination</Text>
                <Text style={styles.summaryValue}>{destinationName}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Driver</Text>
                <Text style={styles.summaryValue}>{driverName}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Distance</Text>
                <Text style={styles.summaryValue}>{estimateDistance}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Duration</Text>
                <Text style={styles.summaryValue}>{estimateDuration}</Text>
              </View>
            </View>

            <View style={styles.amountContainer}>
              <Text style={styles.amountLabel}>Total Amount</Text>
              <Text style={styles.amountValue}>{formatAmount(amount)}</Text>
            </View>
          </View>

          {/* Payment Status */}
          {paymentStatus === 'failed' && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={48} color={Colors.error} />
              <Text style={styles.errorTitle}>Payment Failed</Text>
              <Text style={styles.errorMessage}>{errorMessage}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
                <Text style={styles.retryButtonText}>Retry Payment</Text>
              </TouchableOpacity>
            </View>
          )}

          {paymentStatus === 'completed' && (
            <View style={styles.successContainer}>
              <Ionicons name="checkmark-circle" size={48} color={Colors.success} />
              <Text style={styles.successTitle}>Payment Successful!</Text>
              <Text style={styles.successMessage}>Your payment has been processed successfully.</Text>
            </View>
          )}

          {/* Action Buttons */}
          {paymentStatus === 'pending' && (
            <View style={styles.actionContainer}>
              <TouchableOpacity
                style={styles.payButton}
                onPress={initializePayment}
              >
                <Ionicons name="card" size={20} color={Colors.white} />
                <Text style={styles.payButtonText}>Pay {formatAmount(amount)}</Text>
              </TouchableOpacity>

              {isDevelopment && (
                <>
                  <TouchableOpacity
                    style={styles.testButton}
                    onPress={testPaymentConnectivity}
                  >
                    <Text style={styles.testButtonText}>Test Payment Connection</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.skipButton}
                    onPress={handleSkipPayment}
                  >
                    <Text style={styles.skipButtonText}>Skip Payment (Dev)</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          {/* Payment Info */}
          <View style={styles.infoContainer}>
            <Text style={styles.infoTitle}>Payment Methods</Text>
            <View style={styles.paymentMethods}>
              <View style={styles.paymentMethod}>
                <Ionicons name="card" size={20} color={Colors.primary} />
                <Text style={styles.paymentMethodText}>Credit/Debit Cards</Text>
              </View>
              <View style={styles.paymentMethod}>
                <Ionicons name="phone-portrait" size={20} color={Colors.primary} />
                <Text style={styles.paymentMethodText}>UPI Apps (GPay, PhonePe)</Text>
              </View>
              <View style={styles.paymentMethod}>
                <Ionicons name="wallet" size={20} color={Colors.primary} />
                <Text style={styles.paymentMethodText}>Digital Wallets</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  } catch (error) {
    if (isDevelopment) {
      console.error('❌ Error rendering PostRidePaymentScreen:', error);
    }
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle" size={48} color={Colors.error} />
          <Text style={styles.loadingText}>Something went wrong. Please try again.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Layout.spacing.xl,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Layout.spacing.md,
    fontSize: Layout.fontSize.md,
    color: Colors.textSecondary,
  },
  summaryContainer: {
    margin: Layout.spacing.lg,
    backgroundColor: Colors.white,
    borderRadius: Layout.borderRadius.lg,
    padding: Layout.spacing.lg,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Layout.spacing.lg,
  },
  summaryTitle: {
    fontSize: Layout.fontSize.lg,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: Layout.spacing.md,
  },
  summaryDetails: {
    marginBottom: Layout.spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Layout.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  summaryLabel: {
    fontSize: Layout.fontSize.md,
    color: Colors.textSecondary,
  },
  summaryValue: {
    fontSize: Layout.fontSize.md,
    color: Colors.text,
    fontWeight: '500',
  },
  amountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Layout.spacing.md,
    borderTopWidth: 2,
    borderTopColor: Colors.borderLight,
  },
  amountLabel: {
    fontSize: Layout.fontSize.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  amountValue: {
    fontSize: Layout.fontSize.xl,
    fontWeight: '700',
    color: Colors.primary,
  },
  errorContainer: {
    margin: Layout.spacing.lg,
    backgroundColor: Colors.errorLight,
    borderRadius: Layout.borderRadius.lg,
    padding: Layout.spacing.xl,
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: Layout.fontSize.lg,
    fontWeight: '600',
    color: Colors.error,
    marginTop: Layout.spacing.md,
    marginBottom: Layout.spacing.sm,
  },
  errorMessage: {
    fontSize: Layout.fontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Layout.spacing.xl,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Layout.spacing.xl,
    paddingVertical: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
  },
  successContainer: {
    margin: Layout.spacing.lg,
    backgroundColor: Colors.successLight,
    borderRadius: Layout.borderRadius.lg,
    padding: Layout.spacing.xl,
    alignItems: 'center',
  },
  successTitle: {
    fontSize: Layout.fontSize.lg,
    fontWeight: '600',
    color: Colors.success,
    marginTop: Layout.spacing.md,
    marginBottom: Layout.spacing.sm,
  },
  successMessage: {
    fontSize: Layout.fontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  actionContainer: {
    margin: Layout.spacing.lg,
  },
  payButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Layout.spacing.lg,
    borderRadius: Layout.borderRadius.md,
    marginBottom: Layout.spacing.md,
  },
  payButtonText: {
    color: Colors.white,
    fontSize: Layout.fontSize.lg,
    fontWeight: '600',
    marginLeft: Layout.spacing.sm,
  },
  skipButton: {
    backgroundColor: Colors.secondary,
    paddingVertical: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    alignItems: 'center',
  },
  skipButtonText: {
    color: Colors.textSecondary,
    fontSize: Layout.fontSize.md,
    fontWeight: '500',
  },
  testButton: {
    backgroundColor: Colors.info,
    paddingVertical: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    alignItems: 'center',
    marginBottom: Layout.spacing.md,
  },
  testButtonText: {
    color: Colors.white,
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
  },
  infoContainer: {
    margin: Layout.spacing.lg,
    backgroundColor: Colors.white,
    borderRadius: Layout.borderRadius.lg,
    padding: Layout.spacing.lg,
  },
  infoTitle: {
    fontSize: Layout.fontSize.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Layout.spacing.md,
  },
  paymentMethods: {
    gap: Layout.spacing.md,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentMethodText: {
    fontSize: Layout.fontSize.md,
    color: Colors.textSecondary,
    marginLeft: Layout.spacing.sm,
  },
});
