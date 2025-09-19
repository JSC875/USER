import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import { initializePayment, PaymentOptions } from '../../utils/razorpay';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { getRazorpayKey, logRazorpayConfig, isUsingLiveKeys, getPaymentWarningMessage } from '../../config/razorpay';
import { testRazorpayKeyConfiguration } from '../../utils/razorpayKeyTest';
import { paymentService } from '../../services/paymentService';
import { useAuth } from '@clerk/clerk-expo';

interface TestResult {
  id: string;
  message: string;
  timestamp: Date;
  type: 'info' | 'success' | 'error' | 'warning';
}

export default function LivePaymentTestScreen({ navigation }: any) {
  const { getToken } = useAuth();
  const [amount, setAmount] = useState('100'); // Default ₹1
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);

  const addTestResult = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    const result: TestResult = {
      id: Date.now().toString(),
      message,
      timestamp: new Date(),
      type,
    };
    setTestResults(prev => [result, ...prev.slice(0, 19)]); // Keep last 20 results
  };

  const handleDirectPayment = async () => {
    setIsLoading(true);
    addTestResult('🧪 Starting direct payment test...');

    try {
      const paymentAmount = parseInt(amount) || 100;
      addTestResult(`💰 Payment amount: ₹${(paymentAmount / 100).toFixed(2)}`);

      // Show warning for live payments
      if (isUsingLiveKeys()) {
        const warningResult = await new Promise<boolean>((resolve) => {
          Alert.alert(
            '⚠️ LIVE PAYMENT WARNING',
            `${getPaymentWarningMessage()}\n\nAmount: ₹${(paymentAmount / 100).toFixed(2)}\n\nThis will charge REAL money to your account!\n\nAre you absolutely sure you want to proceed?`,
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
          addTestResult('❌ Payment cancelled by user', 'warning');
          setIsLoading(false);
          return;
        }
      }

      // Log Razorpay configuration
      logRazorpayConfig();
      addTestResult('🔧 Razorpay configuration logged');
      
      // Verify live key usage
      const keyTest = testRazorpayKeyConfiguration();
      if (!keyTest.isLiveKey) {
        throw new Error('Test keys are being used instead of live keys. Please check configuration.');
      }
      addTestResult('✅ Live keys verified');

      // Create payment options
      const paymentOptions: PaymentOptions = {
        key: getRazorpayKey(), // This will use your live key
        amount: paymentAmount,
        currency: 'INR',
        name: 'Roqet Bike Taxi',
        description: 'Live payment test for Razorpay integration',
        order_id: `order_live_${Date.now()}`,
        prefill: {
          email: 'test@example.com',
          contact: '+919876543210',
          name: 'Test User',
        },
        theme: {
          color: '#007AFF',
        },
        handler: (response: any) => {
          addTestResult('✅ Payment handler called');
          addTestResult(`💳 Payment ID: ${response.razorpay_payment_id}`);
          addTestResult(`📋 Order ID: ${response.razorpay_order_id}`);
          
          Alert.alert(
            'Payment Success! 🎉',
            `Payment completed successfully!\n\nPayment ID: ${response.razorpay_payment_id}\nOrder ID: ${response.razorpay_order_id}\nAmount: ₹${(paymentAmount / 100).toFixed(2)}`,
            [{ text: 'OK' }]
          );
        },
        modal: {
          ondismiss: () => {
            addTestResult('❌ Payment modal dismissed');
            setIsLoading(false);
          },
        },
      };

      addTestResult('🔧 Initializing Razorpay payment...');
      const result = await initializePayment(paymentOptions);
      
      if (result.success) {
        addTestResult('✅ Direct payment completed successfully', 'success');
        addTestResult(`💳 Payment ID: ${result.paymentId}`);
        addTestResult(`📋 Order ID: ${result.orderId}`);
      } else {
        throw new Error(result.error || 'Payment failed');
      }

    } catch (error) {
      console.error('❌ Direct payment error:', error);
      addTestResult(`❌ Payment error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      Alert.alert('Payment Error', error instanceof Error ? error.message : 'Payment failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackendPayment = async () => {
    setIsLoading(true);
    addTestResult('🧪 Starting backend payment test...');

    try {
      const paymentAmount = parseInt(amount) || 100;
      addTestResult(`💰 Payment amount: ₹${(paymentAmount / 100).toFixed(2)}`);

      // Show warning for live payments
      if (isUsingLiveKeys()) {
        const warningResult = await new Promise<boolean>((resolve) => {
          Alert.alert(
            '⚠️ LIVE PAYMENT WARNING',
            `${getPaymentWarningMessage()}\n\nAmount: ₹${(paymentAmount / 100).toFixed(2)}\n\nThis will charge REAL money to your account!\n\nAre you absolutely sure you want to proceed?`,
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
          addTestResult('❌ Payment cancelled by user', 'warning');
          setIsLoading(false);
          return;
        }
      }

      const token = await getToken();
      if (!token) {
        throw new Error('Authentication token not found');
      }

      // Test backend connectivity
      addTestResult('🔍 Testing backend connectivity...');
      const connectivityTest = await paymentService.testPaymentConnectivity(getToken);
      
      if (!connectivityTest) {
        throw new Error('Backend connectivity test failed');
      }
      addTestResult('✅ Backend connectivity verified');

      // Create payment order
      addTestResult('📋 Creating payment order...');
      const orderResponse = await paymentService.createDirectPaymentOrder(
        `test_ride_${Date.now()}`,
        paymentAmount,
        {
          email: 'test@example.com',
          phone: '+919876543210',
          name: 'Test User',
        },
        getToken
      );

      if (!orderResponse.success) {
        throw new Error(orderResponse.error || 'Failed to create payment order');
      }

      addTestResult('✅ Payment order created');
      addTestResult(`📋 Order ID: ${orderResponse.data?.orderId}`);

      // Initialize payment with order
      addTestResult('🔧 Initializing payment with order...');
      const paymentOptions: PaymentOptions = {
        key: orderResponse.data?.keyId || getRazorpayKey(),
        amount: paymentAmount,
        currency: 'INR',
        name: 'Roqet Bike Taxi',
        description: 'Backend payment test for Razorpay integration',
        order_id: orderResponse.data?.orderId || '',
        prefill: {
          email: 'test@example.com',
          contact: '+919876543210',
          name: 'Test User',
        },
        theme: {
          color: '#007AFF',
        },
        handler: (response: any) => {
          addTestResult('✅ Payment handler called');
          addTestResult(`💳 Payment ID: ${response.razorpay_payment_id}`);
          addTestResult(`📋 Order ID: ${response.razorpay_order_id}`);
          
          Alert.alert(
            'Payment Success! 🎉',
            `Payment completed successfully!\n\nPayment ID: ${response.razorpay_payment_id}\nOrder ID: ${response.razorpay_order_id}\nAmount: ₹${(paymentAmount / 100).toFixed(2)}`,
            [{ text: 'OK' }]
          );
        },
        modal: {
          ondismiss: () => {
            addTestResult('❌ Payment modal dismissed');
            setIsLoading(false);
          },
        },
      };

      const result = await initializePayment(paymentOptions);
      
      if (result.success) {
        addTestResult('✅ Backend payment completed successfully', 'success');
        addTestResult(`💳 Payment ID: ${result.paymentId}`);
        addTestResult(`📋 Order ID: ${result.orderId}`);
      } else {
        throw new Error(result.error || 'Payment failed');
      }

    } catch (error) {
      console.error('❌ Backend payment error:', error);
      addTestResult(`❌ Payment error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      Alert.alert('Payment Error', error instanceof Error ? error.message : 'Payment failed');
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      default:
        return 'ℹ️';
    }
  };

  const getResultColor = (type: string) => {
    switch (type) {
      case 'success':
        return Colors.success;
      case 'error':
        return Colors.error;
      case 'warning':
        return Colors.warning;
      default:
        return Colors.textSecondary;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Live Payment Test</Text>
        <TouchableOpacity
          style={styles.clearButton}
          onPress={clearResults}
        >
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Configuration Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>🔧 Razorpay Configuration</Text>
          <Text style={styles.infoText}>
            Key ID: {getRazorpayKey().substring(0, 10)}...
          </Text>
          <Text style={styles.infoText}>
            Full Key: {getRazorpayKey()}
          </Text>
          <Text style={styles.infoText}>
            Environment: {isUsingLiveKeys() ? 'Production (Live Keys)' : 'Development (Test Keys)'}
          </Text>
          <Text style={styles.infoText}>
            Currency: INR
          </Text>
          <Text style={[styles.infoText, { color: isUsingLiveKeys() ? Colors.error : Colors.success }]}>
            Is Live Key: {isUsingLiveKeys() ? '✅ Yes' : '❌ No'}
          </Text>
          {isUsingLiveKeys() && (
            <Text style={[styles.infoText, { color: Colors.error, fontWeight: 'bold' }]}>
              ⚠️ WARNING: Using LIVE keys - Real money will be charged!
            </Text>
          )}
        </View>

        {/* Amount Input */}
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>Payment Amount (in paise)</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            placeholder="100 (₹1)"
            keyboardType="numeric"
            placeholderTextColor={Colors.textSecondary}
          />
          <Text style={styles.inputHint}>
            Current amount: ₹{(parseInt(amount) || 100) / 100}
          </Text>
          {isUsingLiveKeys() && (
            <Text style={[styles.inputHint, { color: Colors.error, fontWeight: 'bold' }]}>
              ⚠️ This will charge REAL money to your account!
            </Text>
          )}
        </View>

        {/* Test Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.testButton, isUsingLiveKeys() && styles.liveButton]}
            onPress={handleDirectPayment}
            disabled={isLoading}
          >
            <Text style={styles.testButtonText}>
              {isUsingLiveKeys() ? '🔥 Direct Payment Test (LIVE)' : 'Direct Payment Test'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.testButton, isUsingLiveKeys() && styles.liveButton]}
            onPress={handleBackendPayment}
            disabled={isLoading}
          >
            <Text style={styles.testButtonText}>
              {isUsingLiveKeys() ? '🔥 Backend Payment Test (LIVE)' : 'Backend Payment Test'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Test Results */}
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>Test Results</Text>
          {testResults.map((result) => (
            <View key={result.id} style={styles.resultItem}>
              <Text style={styles.resultIcon}>{getResultIcon(result.type)}</Text>
              <View style={styles.resultContent}>
                <Text style={[styles.resultMessage, { color: getResultColor(result.type) }]}>
                  {result.message}
                </Text>
                <Text style={styles.resultTimestamp}>
                  {result.timestamp.toLocaleTimeString()}
                </Text>
              </View>
            </View>
          ))}
          {testResults.length === 0 && (
            <Text style={styles.noResults}>No test results yet. Run a test to see results here.</Text>
          )}
        </View>
      </ScrollView>

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <LoadingSpinner size="large" text="Processing Payment..." />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
  clearButton: {
    padding: Layout.spacing.sm,
  },
  clearButtonText: {
    fontSize: Layout.fontSize.sm,
    color: Colors.coral,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: Layout.spacing.lg,
  },
  infoCard: {
    backgroundColor: Colors.white,
    borderRadius: Layout.borderRadius.lg,
    padding: Layout.spacing.lg,
    marginBottom: Layout.spacing.lg,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: Layout.fontSize.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Layout.spacing.md,
  },
  infoText: {
    fontSize: Layout.fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Layout.spacing.xs,
  },
  inputCard: {
    backgroundColor: Colors.white,
    borderRadius: Layout.borderRadius.lg,
    padding: Layout.spacing.lg,
    marginBottom: Layout.spacing.lg,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputLabel: {
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Layout.spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: Layout.borderRadius.md,
    padding: Layout.spacing.md,
    fontSize: Layout.fontSize.md,
    color: Colors.text,
    marginBottom: Layout.spacing.sm,
  },
  inputHint: {
    fontSize: Layout.fontSize.sm,
    color: Colors.textSecondary,
  },
  buttonContainer: {
    marginBottom: Layout.spacing.lg,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.lg,
    borderRadius: Layout.borderRadius.md,
    marginBottom: Layout.spacing.md,
    backgroundColor: Colors.primary, // Default button color
  },
  liveButton: {
    backgroundColor: Colors.coral, // Specific color for live payment test
  },
  testButtonText: {
    color: Colors.white,
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
    marginLeft: Layout.spacing.sm,
  },
  resultsContainer: {
    backgroundColor: Colors.white,
    borderRadius: Layout.borderRadius.lg,
    padding: Layout.spacing.lg,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultsTitle: {
    fontSize: Layout.fontSize.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Layout.spacing.md,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Layout.spacing.xs,
  },
  resultIcon: {
    fontSize: Layout.fontSize.md,
    marginRight: Layout.spacing.sm,
  },
  resultContent: {
    flex: 1,
  },
  resultMessage: {
    fontSize: Layout.fontSize.sm,
    fontFamily: 'monospace',
  },
  resultTimestamp: {
    fontSize: Layout.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: Layout.spacing.xs,
  },
  noResults: {
    fontSize: Layout.fontSize.sm,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: Layout.spacing.lg,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 1,
  },
  loadingText: {
    marginTop: Layout.spacing.sm,
    color: Colors.white,
    fontSize: Layout.fontSize.md,
  },
});
