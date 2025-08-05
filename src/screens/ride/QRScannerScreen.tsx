import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@clerk/clerk-expo';
import { paymentService } from '../../services/paymentService';
import { emitEvent } from '../../utils/socket';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';

interface QRScannerScreenProps {
  navigation: any;
  route: {
    params: {
      rideId?: string;
      amount?: number;
    };
  };
}

const { width, height } = Dimensions.get('window');

export default function QRScannerScreen({ navigation, route }: QRScannerScreenProps) {
  const { rideId, amount } = route.params;
  const { getToken } = useAuth();
  
  console.log('📱 QRScannerScreen mounted with params:', { rideId, amount });
  
  const [isScanning, setIsScanning] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [nativeModuleAvailable, setNativeModuleAvailable] = useState<boolean>(false);
  
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    checkNativeModule();
    checkCameraPermission();
  }, []);

  const checkNativeModule = async () => {
    try {
      // Try to import the barcode scanner
      const { BarCodeScanner } = await import('expo-barcode-scanner');
      setNativeModuleAvailable(true);
      console.log('✅ BarCodeScanner native module is available');
    } catch (error) {
      console.error('❌ BarCodeScanner native module not available:', error);
      setNativeModuleAvailable(false);
    }
  };

  const checkCameraPermission = async () => {
    try {
      if (nativeModuleAvailable) {
        const { BarCodeScanner } = await import('expo-barcode-scanner');
        const { status } = await BarCodeScanner.requestPermissionsAsync();
        setHasPermission(status === 'granted');
      } else {
        // Fallback: assume permission granted for demo
        setHasPermission(true);
      }
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      setHasPermission(false);
    }
  };

  const handleQRCodeScanned = async ({ data }: { data: string }) => {
    if (!isScanning || isProcessing) return;

    console.log('📱 QR Code scanned:', data);
    setScannedData(data);
    setIsScanning(false);
    setIsProcessing(true);

    try {
      // Parse the QR code data
      const qrData = parseQRCodeData(data);
      if (!qrData) {
        throw new Error('Invalid QR code format');
      }

      console.log('🔍 Parsed QR data:', qrData);

      // Validate the QR data
      if (!qrData.orderId || !qrData.paymentLink) {
        throw new Error('Missing payment information in QR code');
      }

      // Emit event to notify that QR code was scanned
      emitEvent('qr_code_scanned', {
        rideId: qrData.rideId,
        orderId: qrData.orderId,
        amount: qrData.amount,
        timestamp: Date.now()
      });

      // Navigate to WebView payment screen
      navigation.navigate('WebViewPayment', {
        orderId: qrData.orderId,
        paymentLink: qrData.paymentLink,
        amount: qrData.amount,
        currency: qrData.currency,
        rideId: qrData.rideId,
        fromQR: true
      });

    } catch (error) {
      console.error('❌ Error processing QR code:', error);
      Alert.alert(
        'Invalid QR Code',
        'The scanned QR code is not valid for payment. Please try again.',
        [
          {
            text: 'Scan Again',
            onPress: () => {
              setIsScanning(true);
              setIsProcessing(false);
              setScannedData(null);
            }
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const parseQRCodeData = (data: string) => {
    try {
      // Try to parse as JSON first
      const jsonData = JSON.parse(data);
      return {
        orderId: jsonData.orderId,
        paymentLink: jsonData.paymentLink,
        amount: jsonData.amount,
        currency: jsonData.currency || 'INR',
        rideId: jsonData.rideId,
        timestamp: jsonData.timestamp
      };
    } catch (error) {
      // If not JSON, try to parse as URL with query parameters
      try {
        const url = new URL(data);
        const params = new URLSearchParams(url.search);
        
        return {
          orderId: params.get('orderId') || params.get('order_id'),
          paymentLink: data,
          amount: parseInt(params.get('amount') || '0'),
          currency: params.get('currency') || 'INR',
          rideId: params.get('rideId') || params.get('ride_id'),
          timestamp: parseInt(params.get('timestamp') || '0')
        };
      } catch (urlError) {
        console.error('Failed to parse QR data as URL:', urlError);
        return null;
      }
    }
  };

  const handleBack = () => {
    Alert.alert(
      'Cancel Scanning',
      'Are you sure you want to cancel QR scanning?',
      [
        {
          text: 'No',
          style: 'cancel'
        },
        {
          text: 'Yes',
          onPress: () => navigation.goBack()
        }
      ]
    );
  };

  const handleRetry = () => {
    setIsScanning(true);
    setIsProcessing(false);
    setScannedData(null);
  };

  const handleTestQRCode = () => {
    // Simulate scanning a test QR code
    const testData = JSON.stringify({
      orderId: "order_test_123456",
      paymentLink: "https://razorpay.com/pay/test_order_123456",
      amount: 5000,
      currency: "INR",
      rideId: "ride_test_789"
    });
    handleQRCodeScanned({ data: testData });
  };

  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Requesting camera permission...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color={Colors.gray400} />
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            This app needs camera access to scan QR codes for payment.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={checkCameraPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Show fallback UI if native module is not available
  if (!nativeModuleAvailable) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scan Payment QR Code</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.fallbackContainer}>
          <Ionicons name="qr-code-outline" size={120} color={Colors.gray400} />
          <Text style={styles.fallbackTitle}>QR Scanner Unavailable</Text>
          <Text style={styles.fallbackText}>
            The QR scanner native module is not available. Please rebuild the app or use the test button below.
          </Text>
          
          <TouchableOpacity style={styles.testButton} onPress={handleTestQRCode}>
            <Ionicons name="play" size={20} color={Colors.white} />
            <Text style={styles.testButtonText}>Test QR Code Payment</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.retryButton} onPress={checkNativeModule}>
            <Text style={styles.retryButtonText}>Retry Loading Scanner</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Use the test button to simulate QR code scanning for development
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan Payment QR Code</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.cameraContainer}>
        {isScanning && !isProcessing ? (
          <View style={styles.cameraPlaceholder}>
            <Ionicons name="camera" size={80} color={Colors.gray400} />
            <Text style={styles.cameraPlaceholderText}>Camera View</Text>
            <Text style={styles.cameraPlaceholderSubtext}>
              Point your camera at the payment QR code
            </Text>
            
            {/* Test button for development */}
            <TouchableOpacity style={styles.testButton} onPress={handleTestQRCode}>
              <Ionicons name="play" size={20} color={Colors.white} />
              <Text style={styles.testButtonText}>Test QR Code</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.processingText}>
              {isProcessing ? 'Processing QR Code...' : 'QR Code Scanned'}
            </Text>
            {scannedData && (
              <Text style={styles.scannedData} numberOfLines={2}>
                {scannedData.substring(0, 50)}...
              </Text>
            )}
            {!isProcessing && (
              <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
                <Text style={styles.retryButtonText}>Scan Again</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Point your camera at the payment QR code displayed by the driver
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    backgroundColor: Colors.black,
  },
  backButton: {
    padding: Layout.spacing.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.white,
  },
  placeholder: {
    width: 40,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  cameraPlaceholder: {
    flex: 1,
    backgroundColor: Colors.black,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Layout.spacing.xl,
  },
  cameraPlaceholderText: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: '600',
    marginTop: Layout.spacing.lg,
  },
  cameraPlaceholderSubtext: {
    color: Colors.gray400,
    fontSize: 16,
    textAlign: 'center',
    marginTop: Layout.spacing.sm,
    marginBottom: Layout.spacing.xl,
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Layout.spacing.xl,
    backgroundColor: Colors.black,
  },
  fallbackTitle: {
    color: Colors.white,
    fontSize: 24,
    fontWeight: '600',
    marginTop: Layout.spacing.lg,
    textAlign: 'center',
  },
  fallbackText: {
    color: Colors.gray400,
    fontSize: 16,
    textAlign: 'center',
    marginTop: Layout.spacing.md,
    marginBottom: Layout.spacing.xl,
    lineHeight: 24,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Layout.spacing.xl,
    paddingVertical: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    marginBottom: Layout.spacing.md,
  },
  testButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: Layout.spacing.sm,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: width * 0.7,
    height: width * 0.7,
    position: 'relative',
  },
  cornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 30,
    height: 30,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: Colors.primary,
  },
  cornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 30,
    height: 30,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: Colors.primary,
  },
  cornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: Colors.primary,
  },
  cornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: Colors.primary,
  },
  scanInstructions: {
    color: Colors.white,
    fontSize: 16,
    textAlign: 'center',
    marginTop: Layout.spacing.xl,
    paddingHorizontal: Layout.spacing.lg,
  },
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.black,
  },
  processingText: {
    color: Colors.white,
    fontSize: 18,
    marginTop: Layout.spacing.lg,
    textAlign: 'center',
  },
  scannedData: {
    color: Colors.gray400,
    fontSize: 12,
    marginTop: Layout.spacing.md,
    textAlign: 'center',
    paddingHorizontal: Layout.spacing.lg,
    fontFamily: 'monospace',
  },
  retryButton: {
    marginTop: Layout.spacing.xl,
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: Layout.borderRadius.md,
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    padding: Layout.spacing.lg,
    backgroundColor: Colors.black,
  },
  footerText: {
    color: Colors.gray400,
    fontSize: 14,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.black,
  },
  loadingText: {
    color: Colors.white,
    fontSize: 16,
    marginTop: Layout.spacing.md,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Layout.spacing.xl,
    backgroundColor: Colors.black,
  },
  permissionTitle: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: '600',
    marginTop: Layout.spacing.lg,
    textAlign: 'center',
  },
  permissionText: {
    color: Colors.gray400,
    fontSize: 16,
    textAlign: 'center',
    marginTop: Layout.spacing.md,
    lineHeight: 24,
  },
  permissionButton: {
    marginTop: Layout.spacing.xl,
    paddingHorizontal: Layout.spacing.xl,
    paddingVertical: Layout.spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: Layout.borderRadius.md,
  },
  permissionButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    marginTop: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.xl,
    paddingVertical: Layout.spacing.md,
  },
  cancelButtonText: {
    color: Colors.gray400,
    fontSize: 16,
  },
}); 