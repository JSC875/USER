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
import { initializePayment, PaymentOptions, PaymentResult, formatAmount } from '../../utils/razorpay';
import { useAuth } from '@clerk/clerk-expo';

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
  
  const [isLoading, setIsLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'completed' | 'failed'>('pending');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Validate and ensure minimum amount
  const validatedAmount = Math.max(amount || 0, 100); // Minimum 1 INR (100 paise)
  console.log('💰 PaymentScreen - Original amount:', amount);
  console.log('💰 PaymentScreen - Validated amount:', validatedAmount);
  console.log('💰 PaymentScreen - Amount in INR:', validatedAmount / 100);

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

      // Prepare payment options
      const paymentOptions: PaymentOptions = {
        rideId,
        amount: validatedAmount, // Use validated amount
        currency: 'INR',
        description: `Payment for ride from ${estimate?.pickup || 'Pickup'} to ${destination?.name || 'Destination'}`,
        userEmail: 'user@example.com', // Replace with actual user email
        userPhone: '+919876543210', // Replace with actual user phone
        userName: 'User Name', // Replace with actual user name
        getToken: () => getToken(),
      };

      console.log('💰 PaymentScreen - Payment options:', paymentOptions);

      // Initialize payment
      const result: PaymentResult = await initializePayment(paymentOptions);

      if (result.success) {
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
                    paymentId: result.paymentId,
                    orderId: result.orderId,
                    amount: formatAmount(amount),
                    status: 'completed',
                  },
                });
              },
            },
          ]
        );
      } else {
        setPaymentStatus('failed');
        const errorMsg = result.error || 'Payment failed';
        setErrorMessage(errorMsg);
        Alert.alert('Payment Failed', errorMsg);
      }
    } catch (error: any) {
      setPaymentStatus('failed');
      let errorMsg = error.message || 'An unexpected error occurred';
      
      // Provide more user-friendly error messages
      if (errorMsg.includes('Cannot read property \'open\' of null')) {
        errorMsg = 'Payment gateway is not available. Please try again or contact support.';
      } else if (errorMsg.includes('Razorpay')) {
        errorMsg = 'Payment service temporarily unavailable. Please try again.';
      }
      
      setErrorMessage(errorMsg);
      Alert.alert('Payment Error', errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle payment retry
  const handleRetry = () => {
    setPaymentStatus('pending');
    setErrorMessage('');
    handlePayment();
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
                Pay for your ride to complete the journey
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
              title={`Pay ₹${(validatedAmount / 100).toFixed(2)}`}
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