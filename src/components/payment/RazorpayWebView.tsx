import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import { isDevelopment } from '../../config/environment';

interface RazorpayWebViewProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (paymentData: {
    paymentId: string;
    orderId: string;
    signature: string;
  }) => void;
  onFailure: (error: string) => void;
  orderData: {
    orderId: string;
    keyId: string;
    amount: number;
    currency: string;
    name: string;
    description: string;
    prefill: {
      email?: string;
      contact?: string;
      name?: string;
    };
  };
}

export default function RazorpayWebView({
  visible,
  onClose,
  onSuccess,
  onFailure,
  orderData,
}: RazorpayWebViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const webViewRef = useRef<WebView>(null);

  // Generate Razorpay HTML with secure configuration
  const generateRazorpayHTML = () => {
    const {
      orderId,
      keyId,
      amount,
      currency,
      name,
      description,
      prefill,
    } = orderData;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payment</title>
          <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 0;
              padding: 20px;
              background: #f5f5f5;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
            }
            .payment-container {
              background: white;
              border-radius: 12px;
              padding: 30px;
              box-shadow: 0 4px 20px rgba(0,0,0,0.1);
              max-width: 400px;
              width: 100%;
            }
            .payment-header {
              text-align: center;
              margin-bottom: 30px;
            }
            .payment-title {
              font-size: 24px;
              font-weight: 600;
              color: #333;
              margin-bottom: 8px;
            }
            .payment-subtitle {
              color: #666;
              font-size: 16px;
            }
            .payment-button {
              background: #007AFF;
              color: white;
              border: none;
              padding: 16px 32px;
              border-radius: 8px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              width: 100%;
              transition: background 0.2s;
            }
            .payment-button:hover {
              background: #0056CC;
            }
            .payment-button:disabled {
              background: #ccc;
              cursor: not-allowed;
            }
            .loading {
              text-align: center;
              color: #666;
            }
            .error {
              color: #FF3B30;
              text-align: center;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="payment-container">
            <div class="payment-header">
              <div class="payment-title">${name}</div>
              <div class="payment-subtitle">${description}</div>
            </div>
            
            <button id="pay-button" class="payment-button" onclick="initiatePayment()">
              Pay ₹${(amount / 100).toFixed(2)}
            </button>
            
            <div id="loading" class="loading" style="display: none;">
              Processing payment...
            </div>
            
            <div id="error" class="error" style="display: none;"></div>
          </div>

          <script>
            let paymentInProgress = false;
            
            function initiatePayment() {
              if (paymentInProgress) return;
              paymentInProgress = true;
              
              const button = document.getElementById('pay-button');
              const loading = document.getElementById('loading');
              const error = document.getElementById('error');
              
              button.disabled = true;
              button.textContent = 'Processing...';
              loading.style.display = 'block';
              error.style.display = 'none';
              
              const options = {
                key: '${keyId}',
                amount: ${amount},
                currency: '${currency}',
                name: '${name}',
                description: '${description}',
                order_id: '${orderId}',
                prefill: {
                  email: '${prefill.email || ''}',
                  contact: '${prefill.contact || ''}',
                  name: '${prefill.name || ''}'
                },
                theme: {
                  color: '#007AFF'
                },
                handler: function(response) {
                  // Send success data to React Native
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'PAYMENT_SUCCESS',
                    data: {
                      razorpay_payment_id: response.razorpay_payment_id,
                      razorpay_order_id: response.razorpay_order_id,
                      razorpay_signature: response.razorpay_signature
                    }
                  }));
                },
                modal: {
                  ondismiss: function() {
                    // Send dismiss event to React Native
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'PAYMENT_DISMISSED'
                    }));
                  }
                }
              };
              
              try {
                const rzp = new Razorpay(options);
                rzp.open();
              } catch (err) {
                console.error('Razorpay error:', err);
                error.textContent = 'Payment gateway error. Please try again.';
                error.style.display = 'block';
                button.disabled = false;
                button.textContent = 'Pay ₹${(amount / 100).toFixed(2)}';
                loading.style.display = 'none';
                paymentInProgress = false;
              }
            }
            
            // Handle page load
            window.addEventListener('load', function() {
              // Notify React Native that page is loaded
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'PAGE_LOADED'
              }));
            });
            
            // Handle errors
            window.addEventListener('error', function(e) {
              console.error('Page error:', e);
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'PAGE_ERROR',
                error: e.message
              }));
            });
          </script>
        </body>
      </html>
    `;
  };

  // Handle WebView messages
  const handleWebViewMessage = (event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      
      if (isDevelopment) {
        console.log('🔍 WebView message received:', message);
      }
      
      switch (message.type) {
        case 'PAGE_LOADED':
          setIsLoading(false);
          break;
          
        case 'PAYMENT_SUCCESS':
          const { data } = message;
          if (isDevelopment) {
            console.log('✅ Payment successful:', data);
          }
          onSuccess({
            paymentId: data.razorpay_payment_id,
            orderId: data.razorpay_order_id,
            signature: data.razorpay_signature,
          });
          break;
          
        case 'PAYMENT_DISMISSED':
          if (isDevelopment) {
            console.log('❌ Payment dismissed by user');
          }
          onFailure('Payment was cancelled');
          break;
          
        case 'PAGE_ERROR':
          if (isDevelopment) {
            console.error('❌ WebView error:', message.error);
          }
          setError('Payment page error. Please try again.');
          break;
          
        default:
          if (isDevelopment) {
            console.log('🔍 Unknown message type:', message.type);
          }
      }
    } catch (error) {
      if (isDevelopment) {
        console.error('❌ Error parsing WebView message:', error);
      }
      setError('Communication error. Please try again.');
    }
  };

  // Handle WebView errors
  const handleWebViewError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    if (isDevelopment) {
      console.error('❌ WebView error:', nativeEvent);
    }
    setError('Failed to load payment page. Please check your internet connection.');
  };

  // Handle WebView navigation state changes
  const handleNavigationStateChange = (navState: any) => {
    if (isDevelopment) {
      console.log('🔍 Navigation state changed:', navState.url);
    }
    
    // Check for Razorpay success/failure URLs
    if (navState.url.includes('razorpay.com/payment/success')) {
      // Handle success redirect
      if (isDevelopment) {
        console.log('✅ Detected Razorpay success URL');
      }
    } else if (navState.url.includes('razorpay.com/payment/failed')) {
      // Handle failure redirect
      if (isDevelopment) {
        console.log('❌ Detected Razorpay failure URL');
      }
      onFailure('Payment failed');
    }
  };

  // Reset state when modal opens/closes
  useEffect(() => {
    if (visible) {
      setIsLoading(true);
      setError(null);
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <Ionicons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Secure Payment</Text>
          <View style={styles.placeholder} />
        </View>

        {/* WebView Container */}
        <View style={styles.webViewContainer}>
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Loading payment gateway...</Text>
            </View>
          )}
          
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={48} color={Colors.error} />
              <Text style={styles.errorTitle}>Payment Error</Text>
              <Text style={styles.errorMessage}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => {
                  setError(null);
                  setIsLoading(true);
                  webViewRef.current?.reload();
                }}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}
          
          <WebView
            ref={webViewRef}
            source={{ html: generateRazorpayHTML() }}
            onMessage={handleWebViewMessage}
            onError={handleWebViewError}
            onNavigationStateChange={handleNavigationStateChange}
            style={styles.webView}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={false}
            scalesPageToFit={true}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            mixedContentMode="compatibility"
            allowsBackForwardNavigationGestures={false}
            onShouldStartLoadWithRequest={(request) => {
              // Allow only Razorpay domains and local content
              const allowedDomains = [
                'razorpay.com',
                'checkout.razorpay.com',
                'api.razorpay.com',
              ];
              
              const url = request.url.toLowerCase();
              const isAllowed = allowedDomains.some(domain => url.includes(domain)) || 
                               url.startsWith('data:') || 
                               url.startsWith('about:blank');
              
              if (isDevelopment) {
                console.log('🔍 WebView URL request:', url, 'Allowed:', isAllowed);
              }
              
              return isAllowed;
            }}
          />
        </View>
      </SafeAreaView>
    </Modal>
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
  closeButton: {
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
  webViewContainer: {
    flex: 1,
    position: 'relative',
  },
  webView: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: Layout.spacing.md,
    fontSize: Layout.fontSize.md,
    color: Colors.textSecondary,
  },
  errorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Layout.spacing.xl,
    zIndex: 1000,
  },
  errorTitle: {
    fontSize: Layout.fontSize.lg,
    fontWeight: '600',
    color: Colors.text,
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
}); 