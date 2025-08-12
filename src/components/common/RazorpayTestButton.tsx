import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { initializePayment, PaymentOptions } from '../../utils/razorpay';
import { isUsingLiveKeys, getPaymentWarningMessage } from '../../config/razorpay';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';

interface RazorpayTestButtonProps {
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

export default function RazorpayTestButton({ onSuccess, onError }: RazorpayTestButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleTestPayment = async () => {
    setIsLoading(true);

    try {
      console.log('🧪 Testing Razorpay integration...');

      // Show warning for live payments
      if (isUsingLiveKeys()) {
        const warningResult = await new Promise<boolean>((resolve) => {
          Alert.alert(
            '⚠️ LIVE PAYMENT TEST WARNING',
            `${getPaymentWarningMessage()}\n\nAmount: ₹1.00\n\nThis will charge REAL money to your account!\n\nAre you absolutely sure you want to proceed?`,
            [
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => resolve(false),
              },
              {
                text: 'Proceed (Real Money)',
                style: 'destructive',
                onPress: () => resolve(true),
              },
            ]
          );
        });

        if (!warningResult) {
          console.log('❌ Test payment cancelled by user');
          onError?.('Payment test cancelled by user');
          setIsLoading(false);
          return;
        }
      }

      // Create test payment options
      const paymentOptions: PaymentOptions = {
        key: 'rzp_live_AEcWKhM01jAKqu', // Your live key
        amount: 100, // ₹1 (100 paise)
        currency: 'INR',
        name: 'Roqet Bike Taxi',
        description: 'Test payment for Razorpay integration',
        order_id: `test_order_${Date.now()}`,
        prefill: {
          email: 'test@example.com',
          contact: '+919876543210',
          name: 'Test User',
        },
        theme: {
          color: '#007AFF',
        },
        handler: (response: any) => {
          console.log('✅ Test payment successful:', response);
          Alert.alert(
            'Payment Success',
            `Payment ID: ${response.razorpay_payment_id}\nOrder ID: ${response.razorpay_order_id}`,
            [{ text: 'OK' }]
          );
          onSuccess?.(response);
        },
        modal: {
          ondismiss: () => {
            console.log('Test payment modal dismissed');
            setIsLoading(false);
          },
        },
      };

      const result = await initializePayment(paymentOptions);

      if (result.success) {
        console.log('✅ Test payment completed:', result);
        onSuccess?.(result);
      } else {
        throw new Error(result.error || 'Test payment failed');
      }

    } catch (error) {
      console.error('❌ Test payment error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Test payment failed';
      Alert.alert('Payment Error', errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        isUsingLiveKeys() && styles.liveButton,
        isLoading && styles.loadingButton
      ]}
      onPress={handleTestPayment}
      disabled={isLoading}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={Colors.white} />
      ) : (
        <Text style={styles.buttonText}>
          {isUsingLiveKeys() ? '🔥 Test Live Payment' : 'Test Payment'}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.lg,
    borderRadius: Layout.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Layout.spacing.sm,
  },
  liveButton: {
    backgroundColor: Colors.coral,
  },
  loadingButton: {
    opacity: 0.7,
  },
  buttonText: {
    color: Colors.white,
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
  },
}); 