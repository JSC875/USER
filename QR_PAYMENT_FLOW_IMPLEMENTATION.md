# QR-Based Razorpay Payment Flow Implementation

## Overview

This document describes the complete implementation of a QR-based payment flow for the bike taxi app, where drivers generate QR codes with payment links and customers scan them to complete payments via Razorpay WebView.

## Architecture Flow

```
[Driver App] → Generate QR Code → [Customer App] → Scan QR → WebView Payment → Backend Verification → Socket Notification
```

### Detailed Flow:

1. **Driver App**: Calls `/api/payments/create-order` to generate Razorpay order
2. **Driver App**: Displays QR code containing payment link with order ID
3. **Customer App**: Scans QR code using camera
4. **Customer App**: Opens Razorpay WebView with extracted order ID
5. **Customer App**: Completes payment and sends verification to `/api/payments/verify`
6. **Backend**: Verifies payment and emits `payment_success` socket event
7. **Driver App**: Receives payment success notification via socket

## Files Created/Modified

### Driver App (`ridersony/`)

#### New Files:
- `src/services/paymentService.ts` - Payment service for QR generation
- `src/screens/ride/QRPaymentScreen.tsx` - QR code display screen

#### Modified Files:
- `src/screens/ride/EndRideScreen.tsx` - Added QR payment button
- `src/navigation/AppNavigator.tsx` - Added QRPayment screen to navigation

### Customer App (`testinguser/`)

#### New Files:
- `src/screens/ride/QRScannerScreen.tsx` - QR code scanning screen

#### Modified Files:
- `src/screens/ride/WebViewPaymentScreen.tsx` - Enhanced to handle QR-based payments
- `src/screens/ride/RideSummaryScreen.tsx` - Added QR scanning button
- `src/navigation/AppNavigator.tsx` - Added QRScanner screen to navigation
- `src/utils/socket.ts` - Added QR payment socket events

## Implementation Details

### 1. Driver App - QR Code Generation

#### Payment Service (`ridersony/src/services/paymentService.ts`)

```typescript
// Create payment order for QR code generation
async createPaymentOrder(
  rideId: string,
  amount: number,
  getToken: () => Promise<string | null>
): Promise<PaymentResponse>

// Generate QR code data
generateQRCodeData(
  orderId: string,
  amount: number,
  currency: string,
  paymentLink: string,
  rideId: string
): QRCodeData
```

#### QR Payment Screen (`ridersony/src/screens/ride/QRPaymentScreen.tsx`)

Features:
- Generates QR code with payment link
- Real-time payment status monitoring
- Timer display
- Socket event listeners for payment success/failure
- Refresh functionality

Key Functions:
```typescript
// Generate QR code
const generateQRCode = async () => {
  const response = await paymentService.createPaymentOrder(rideId, amount, getToken);
  // Create QR data and display
}

// Socket listeners
const setupSocketListeners = () => {
  onPaymentSuccess((data) => {
    // Handle payment success
  });
  
  onPaymentFailed((data) => {
    // Handle payment failure
  });
}
```

### 2. Customer App - QR Code Scanning

#### QR Scanner Screen (`src/screens/ride/QRScannerScreen.tsx`)

Features:
- Camera permission handling
- QR code scanning with visual overlay
- QR data parsing (JSON and URL formats)
- Navigation to WebView payment
- Error handling and retry functionality

Key Functions:
```typescript
// Handle QR code scan
const handleQRCodeScanned = async ({ data }: { data: string }) => {
  const qrData = parseQRCodeData(data);
  // Navigate to WebView payment
  navigation.navigate('WebViewPayment', {
    orderId: qrData.orderId,
    paymentLink: qrData.paymentLink,
    fromQR: true
  });
}

// Parse QR data
const parseQRCodeData = (data: string) => {
  // Try JSON first, then URL parsing
}
```

### 3. Enhanced WebView Payment

#### WebView Payment Screen (`src/screens/ride/WebViewPaymentScreen.tsx`)

Enhanced to handle both regular and QR-based payments:

```typescript
// Handle QR-based payment
if (fromQR && orderId && paymentLink) {
  // Use existing order data from QR
  orderResponse = {
    success: true,
    data: {
      orderId,
      keyId: 'rzp_test_YOUR_KEY',
      amount,
      currency,
      // ... other data
    }
  };
} else {
  // Regular payment flow - create new order
  orderResponse = await paymentService.processPaymentWithWebView(...);
}
```

### 4. Socket Events

#### New Socket Events Added:

```typescript
// QR Payment Events
export const onQRPaymentReady = (callback: QRPaymentReadyCallback) => void;
export const onQRCodeScanned = (callback: QRCodeScannedCallback) => void;
export const onPaymentCompleted = (callback: PaymentCompletedCallback) => void;

// Event Types
export type QRPaymentReadyCallback = (data: {
  rideId: string;
  orderId: string;
  amount: number;
  currency: string;
  timestamp: number;
}) => void;

export type QRCodeScannedCallback = (data: {
  rideId: string;
  orderId: string;
  amount: number;
  timestamp: number;
}) => void;

export type PaymentCompletedCallback = (data: {
  rideId: string;
  orderId: string;
  paymentId: string;
  amount: number;
  currency: string;
  timestamp: number;
}) => void;
```

#### Socket Event Listeners:

```typescript
// Add QR payment event listeners
const addQRPaymentEventListeners = () => {
  socket.on("qr_payment_ready", (data) => {
    onQRPaymentReadyCallback?.(data);
  });

  socket.on("qr_code_scanned", (data) => {
    onQRCodeScannedCallback?.(data);
  });

  socket.on("payment_completed", (data) => {
    onPaymentCompletedCallback?.(data);
  });

  socket.on("payment_success", (data) => {
    onPaymentSuccessCallback?.(data);
  });

  socket.on("payment_failed", (data) => {
    onPaymentFailedCallback?.(data);
  });
};
```

## Backend API Requirements

### 1. Create Payment Order (`POST /api/payments/create-order`)

Request:
```json
{
  "rideId": "string",
  "amount": number, // in INR
  "generateQR": true
}
```

Response:
```json
{
  "success": true,
  "data": {
    "orderId": "order_xxx",
    "keyId": "rzp_test_xxx",
    "amount": 100,
    "currency": "INR",
    "paymentLink": "https://pay.razorpay.com/order_xxx"
  }
}
```

### 2. Verify Payment (`POST /api/payments/verify`)

Request:
```json
{
  "rideId": "string",
  "paymentId": "pay_xxx",
  "signature": "xxx",
  "orderId": "order_xxx"
}
```

Response:
```json
{
  "success": true,
  "message": "Payment verified successfully"
}
```

### 3. Socket Events to Emit

Backend should emit these events:

```javascript
// When QR payment is ready
io.to(`driver:${driverId}`).emit("qr_payment_ready", {
  rideId,
  orderId,
  amount,
  currency,
  timestamp
});

// When QR code is scanned
io.to(`driver:${driverId}`).emit("qr_code_scanned", {
  rideId,
  orderId,
  amount,
  timestamp
});

// When payment is completed
io.to(`driver:${driverId}`).emit("payment_success", {
  rideId,
  orderId,
  paymentId,
  amount,
  currency,
  timestamp
});

io.to(`user:${userId}`).emit("payment_success", {
  rideId,
  orderId,
  paymentId,
  amount,
  currency,
  timestamp
});
```

## Usage Instructions

### For Drivers:

1. **End Ride**: After completing a ride, tap "End Ride" in the RideInProgressScreen
2. **Generate QR**: In the EndRideScreen, tap "Generate Payment QR Code"
3. **Display QR**: Show the QR code to the customer
4. **Wait for Payment**: Monitor payment status in real-time
5. **Payment Complete**: Receive notification when payment is successful

### For Customers:

1. **Complete Ride**: After ride completion, go to RideSummaryScreen
2. **Scan QR**: Tap "Scan QR Code to Pay" button
3. **Camera Permission**: Grant camera permission if prompted
4. **Scan QR Code**: Point camera at driver's QR code
5. **Complete Payment**: Follow Razorpay payment flow in WebView
6. **Payment Success**: Receive confirmation of successful payment

## QR Code Format

The QR code contains either JSON data or a URL with query parameters:

### JSON Format:
```json
{
  "orderId": "order_xxx",
  "paymentLink": "https://pay.razorpay.com/order_xxx",
  "amount": 100,
  "currency": "INR",
  "rideId": "ride_xxx",
  "timestamp": 1234567890
}
```

### URL Format:
```
https://pay.razorpay.com/order_xxx?orderId=order_xxx&amount=100&currency=INR&rideId=ride_xxx&timestamp=1234567890
```

## Error Handling

### Common Error Scenarios:

1. **Camera Permission Denied**: Shows permission request screen with retry option
2. **Invalid QR Code**: Displays error message with option to scan again
3. **Payment Failure**: Shows error message with retry option
4. **Network Issues**: Displays network error with retry functionality
5. **Socket Disconnection**: Automatic reconnection with fallback

### Error Recovery:

- **QR Generation Failed**: Retry button in QRPaymentScreen
- **QR Scan Failed**: Retry button in QRScannerScreen
- **Payment Failed**: Retry option in WebViewPaymentScreen
- **Socket Issues**: Automatic reconnection with manual retry option

## Security Considerations

1. **QR Code Validation**: Backend validates order ID and amount
2. **Payment Verification**: Server-side signature verification
3. **Socket Authentication**: JWT-based socket authentication
4. **Order Expiry**: QR codes have time-based expiration
5. **Amount Validation**: Server validates payment amount matches order

## Testing

### Test Scenarios:

1. **Happy Path**: Complete QR payment flow end-to-end
2. **QR Generation**: Test QR code generation with different amounts
3. **QR Scanning**: Test scanning with various QR formats
4. **Payment Success**: Test successful payment completion
5. **Payment Failure**: Test payment failure scenarios
6. **Socket Events**: Test real-time payment status updates
7. **Error Handling**: Test various error scenarios
8. **Network Issues**: Test behavior with poor connectivity

### Test Data:

```typescript
// Test ride data
const testRide = {
  rideId: "test_ride_123",
  price: "150",
  pickupAddress: "Test Pickup",
  dropoffAddress: "Test Dropoff"
};

// Test payment data
const testPayment = {
  orderId: "order_test_123",
  amount: 15000, // in paise
  currency: "INR"
};
```

## Performance Considerations

1. **QR Code Size**: Optimized QR code size for better scanning
2. **Socket Efficiency**: Efficient socket event handling
3. **Camera Performance**: Optimized camera settings for QR scanning
4. **Memory Management**: Proper cleanup of camera and socket resources
5. **Battery Optimization**: Efficient location and camera usage

## Future Enhancements

1. **Offline Support**: Cache QR codes for offline usage
2. **Multiple Payment Methods**: Support for other payment gateways
3. **Payment History**: Track QR payment history
4. **Analytics**: Payment flow analytics and insights
5. **Customization**: Customizable QR code appearance
6. **Batch Payments**: Support for multiple ride payments
7. **Split Payments**: Support for split payment scenarios

## Troubleshooting

### Common Issues:

1. **QR Code Not Scanning**: Check QR code size and contrast
2. **Payment Not Completing**: Verify network connectivity
3. **Socket Not Connecting**: Check socket server status
4. **Camera Not Working**: Verify camera permissions
5. **Payment Verification Failing**: Check backend API status

### Debug Information:

Enable debug logging by setting environment to development:
```typescript
// Debug logs will show:
- QR code generation process
- Socket connection status
- Payment flow steps
- Error details
```

## Conclusion

This QR-based payment flow provides a seamless payment experience for both drivers and customers, leveraging existing Razorpay infrastructure while adding real-time communication through Socket.IO. The implementation is robust, secure, and provides excellent user experience with proper error handling and recovery mechanisms. 