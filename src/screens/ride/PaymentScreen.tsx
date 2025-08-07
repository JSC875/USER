import React, { useState, useEffect } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import Button from '../../components/common/Button';
import RazorpayTestButton from '../../components/common/RazorpayTestButton';
import AmountTestButton from '../../components/common/AmountTestButton';
import { initializePayment, PaymentOptions, PaymentResult, formatAmount, ensureAmountInPaise, convertPaiseToRupees, debugAmountConversion } from '../../utils/razorpay';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { paymentService } from '../../services/paymentService';
import { emitEvent } from '../../utils/socket';
import { isUsingLiveKeys, getPaymentWarningMessage } from '../../config/razorpay';

type RootStackParamList = {
  RidePayment: {
    rideId: string;
    amount: number;
    destination: any;
    driver: any;
    estimate: any;
  };
};

type PaymentScreenProps = NativeStackScreenProps<RootStackParamList, 'RidePayment'>;

export default function PaymentScreen({ navigation, route }: PaymentScreenProps) {
  const { rideId, amount, destination, driver, estimate } = route.params;
  const { getToken } = useAuth();
  const { user } = useUser();
  
  const [isLoading, setIsLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'completed' | 'failed'>('pending');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [paymentData, setPaymentData] = useState<any>(null);

  // Get user information for payment
  const getUserInfo = () => {
    const email = user?.emailAddresses?.[0]?.emailAddress || 'customer@example.com';
    const phone = user?.phoneNumbers?.[0]?.phoneNumber || '+919876543210';
    const name = user?.fullName || 'Customer Name';
    
    return { email, phone, name };
  };

  // Validate and ensure minimum amount
  console.log('💰 PaymentScreen - Original amount:', amount);
  debugAmountConversion(amount || 0, true); // Amount from RideInProgressScreen is already in paise
  // Amount from RideInProgressScreen is already in paise, so don't convert again
  const validatedAmount = Math.max(ensureAmountInPaise(amount || 0, true), 100); // Minimum 1 INR (100 paise)
  console.log('💰 PaymentScreen - Final validated amount in paise:', validatedAmount);
  console.log('💰 PaymentScreen - Final amount in INR:', convertPaiseToRupees(validatedAmount));

  const driverInfo = driver || {
    name: 'Alex Robin',
    vehicleModel: 'Volkswagen',
    vehicleNumber: 'HG5045',
    photo: undefined,
  };

  // Handle direct payment processing
  const handleDirectPayment = async () => {
    if (isLoading) return;

    // Show warning for live payments
    if (isUsingLiveKeys()) {
      const userInfo = getUserInfo();
      const warningResult = await new Promise<boolean>((resolve) => {
        Alert.alert(
          '⚠️ Real Payment Warning',
          `${getPaymentWarningMessage()}\n\nAmount: ₹${convertPaiseToRupees(validatedAmount).toFixed(2)}\n\nAre you sure you want to proceed?`,
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => resolve(false),
            },
            {
              text: 'Proceed',
              style: 'destructive',
              onPress: () => resolve(true),
            },
          ]
        );
      });

      if (!warningResult) {
        return;
      }
    }

    setIsLoading(true);
    setPaymentStatus('processing');
    setErrorMessage('');

    try {
      console.log('💳 PaymentScreen - Direct payment initiated');
      console.log('💰 Amount for payment:', validatedAmount);
      console.log('🚗 Ride ID:', rideId);

      const token = await getToken();
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const userInfo = getUserInfo();

      // Create a payment order for direct payment
      // Convert validatedAmount (in paise) back to rupees for backend
      const amountInRupees = convertPaiseToRupees(validatedAmount);
      console.log('💰 Amount in paise for Razorpay:', validatedAmount);
      console.log('💰 Amount in rupees for backend:', amountInRupees);
      
      const orderResponse = await paymentService.createDirectPaymentOrder(
        rideId,
        amountInRupees,
        userInfo,
        getToken
      );

      if (!orderResponse.success) {
        throw new Error(orderResponse.error || 'Failed to create payment order');
      }

      console.log('✅ Payment order created:', orderResponse.data);

      // Initialize Razorpay payment
      const paymentOptions: PaymentOptions = {
        key: orderResponse.data?.keyId || 'rzp_live_AEcWKhM01jAKqu',
        amount: validatedAmount,
        currency: 'INR',
        name: 'Roqet Bike Taxi',
        description: `Payment for ride ${rideId}`,
        order_id: orderResponse.data?.orderId || '',
        prefill: userInfo,
        theme: {
          color: '#007AFF',
        },
        handler: async (response: any) => {
          console.log('✅ Payment successful:', response);
          await handlePaymentSuccess(response, orderResponse.data?.orderId || '');
        },
        modal: {
          ondismiss: () => {
            console.log('Payment modal dismissed');
            setPaymentStatus('pending');
            setIsLoading(false);
          },
        },
      };

      console.log('🔧 Razorpay options:', paymentOptions);

      const result = await initializePayment(paymentOptions);
      
      if (result.success) {
        console.log('✅ Direct payment completed successfully');
        // The handler function will handle the success case
      } else {
        throw new Error(result.error || 'Payment failed');
      }

    } catch (error) {
      console.error('❌ Direct payment error:', error);
      setPaymentStatus('failed');
      setErrorMessage(error instanceof Error ? error.message : 'Payment failed');
      setIsLoading(false);
    }
  };

  // Handle payment success
  const handlePaymentSuccess = async (paymentResponse: any, orderId: string) => {
    try {
      console.log('🎉 Payment success, verifying payment...');
      
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication token not found');
      }

      // Verify payment with backend
      const verificationData = {
        rideId: rideId,
        paymentId: paymentResponse.razorpay_payment_id,
        signature: paymentResponse.razorpay_signature,
        orderId: orderId,
      };

      const verificationResponse = await paymentService.verifyPayment(verificationData, getToken);

      if (verificationResponse.success) {
        console.log('✅ Payment verified successfully');
        
        // Emit payment completed event
        emitEvent('payment_completed', {
          rideId: rideId,
          orderId: orderId,
          paymentId: paymentResponse.razorpay_payment_id,
          amount: validatedAmount / 100,
          currency: 'INR',
          timestamp: Date.now()
        });

        setPaymentStatus('completed');
        setPaymentData({
          paymentId: paymentResponse.razorpay_payment_id,
          orderId: orderId,
          amount: formatAmountForDisplay(validatedAmount),
          status: 'completed',
          paymentMethod: 'RAZORPAY'
        });

        // Navigate to ride summary after a short delay
        setTimeout(() => {
          navigation.navigate('RideSummary', {
            destination,
            driver: driverInfo,
            rideId,
            estimate,
            paymentInfo: {
              paymentId: paymentResponse.razorpay_payment_id,
              orderId: orderId,
              amount: formatAmountForDisplay(validatedAmount),
              status: 'completed',
              paymentMethod: 'RAZORPAY'
            }
          });
        }, 2000);

      } else {
        throw new Error(verificationResponse.error || 'Payment verification failed');
      }

    } catch (error) {
      console.error('❌ Payment verification error:', error);
      setPaymentStatus('failed');
      setErrorMessage(error instanceof Error ? error.message : 'Payment verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle QR scanner payment


  // Handle payment retry
  const handleRetry = () => {
    setPaymentStatus('pending');
    setErrorMessage('');
    handleDirectPayment();
  };

  // Handle skip payment (for testing or if payment is not required)
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
              driver: driverInfo,
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
          <Text style={styles.headerTitle}>Payment</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Payment Status */}
        <View style={styles.statusContainer}>
          {paymentStatus === 'pending' && (
            <View style={styles.statusCard}>
              <Ionicons name="card-outline" size={48} color={Colors.primary} />
              <Text style={styles.statusTitle}>Complete Payment</Text>
              <Text style={styles.statusSubtitle}>
                Choose your preferred payment method
              </Text>
            </View>
          )}

          {paymentStatus === 'processing' && (
            <View style={styles.statusCard}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.statusTitle}>Processing Payment</Text>
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

          {/* Trip Stats */}
          <View style={styles.tripStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{estimate?.distance || '5 km'}</Text>
              <Text style={styles.statLabel}>Distance</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{estimate?.duration || '15 min'}</Text>
              <Text style={styles.statLabel}>Duration</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatAmountForDisplay(validatedAmount)}</Text>
              <Text style={styles.statLabel}>Fare</Text>
            </View>
          </View>
        </View>

        {/* Payment Details */}
        <View style={styles.paymentCard}>
          <Text style={styles.cardTitle}>Payment Details</Text>
          
          <View style={styles.paymentItem}>
            <Text style={styles.paymentLabel}>Base Fare</Text>
            <Text style={styles.paymentValue}>{formatAmountForDisplay(validatedAmount * 0.8)}</Text>
          </View>
          
          <View style={styles.paymentItem}>
            <Text style={styles.paymentLabel}>Distance Charge</Text>
            <Text style={styles.paymentValue}>{formatAmountForDisplay(validatedAmount * 0.15)}</Text>
          </View>
          
          <View style={styles.paymentItem}>
            <Text style={styles.paymentLabel}>Service Fee</Text>
            <Text style={styles.paymentValue}>{formatAmountForDisplay(validatedAmount * 0.05)}</Text>
          </View>
          
          <View style={styles.paymentDivider} />
          
          <View style={styles.paymentTotal}>
            <Text style={styles.paymentTotalLabel}>Total Amount</Text>
            <Text style={styles.paymentTotalValue}>{formatAmountForDisplay(validatedAmount)}</Text>
          </View>
        </View>

        {/* Driver Info */}
        <View style={styles.driverCard}>
          <Text style={styles.cardTitle}>Your Driver</Text>
          <View style={styles.driverInfo}>
            {driverInfo.photo ? (
              <Image source={{ uri: driverInfo.photo }} style={styles.driverPhoto} />
            ) : (
              <View style={styles.driverPhotoPlaceholder}>
                <Ionicons name="person" size={24} color={Colors.white} />
              </View>
            )}
            <View style={styles.driverDetails}>
              <Text style={styles.driverName}>{driverInfo.name}</Text>
              <Text style={styles.vehicleInfo}>
                {driverInfo.vehicleModel} • {driverInfo.vehicleNumber}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        {paymentStatus === 'pending' && (
          <>
            <Button
              title={`Pay ${formatAmountForDisplay(validatedAmount)}`}
              onPress={handleDirectPayment}
              style={styles.payButton}
              disabled={isLoading}
            />

            {__DEV__ && (
              <>
                <RazorpayTestButton
                  onSuccess={(paymentData) => {
                    console.log('✅ Test payment successful:', paymentData);
                    Alert.alert('Test Success', 'Razorpay integration is working!');
                  }}
                  onError={(error) => {
                    console.error('❌ Test payment failed:', error);
                  }}
                />
                
                {/* Amount conversion test buttons */}
                <Text style={styles.debugTitle}>Amount Conversion Tests:</Text>
                <AmountTestButton testAmount={50} label="Test ₹50 (rupees)" />
                <AmountTestButton testAmount={5000} label="Test 5000 (paise)" />
                <AmountTestButton testAmount={100} label="Test ₹100 (rupees)" />
                <AmountTestButton testAmount={10000} label="Test 10000 (paise)" />
                <AmountTestButton testAmount={7300} label="Test 7300 (paise) - ₹73" />
                <AmountTestButton testAmount={73} label="Test ₹73 (rupees)" />
                
                <TouchableOpacity
                  style={styles.skipButton}
                  onPress={handleSkipPayment}
                  disabled={isLoading}
                >
                  <Text style={styles.skipButtonText}>Skip Payment (Dev)</Text>
                </TouchableOpacity>
              </>
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
            <ActivityIndicator size="small" color={Colors.white} />
            <Text style={styles.loadingText}>Processing...</Text>
          </View>
        )}
      </View>
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
    textAlign: 'center',
  },
  statusSubtitle: {
    fontSize: Layout.fontSize.md,
    color: Colors.textSecondary,
    marginTop: Layout.spacing.sm,
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
    alignItems: 'flex-start',
    marginBottom: Layout.spacing.sm,
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
  driverCard: {
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
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: Layout.spacing.md,
  },
  driverPhotoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Layout.spacing.md,
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  vehicleInfo: {
    fontSize: Layout.fontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
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
  qrButton: {
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
  debugTitle: {
    fontSize: Layout.fontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Layout.spacing.md,
    marginBottom: Layout.spacing.sm,
  },
}); 