# Razorpay Integration Guide

This guide explains how to integrate Razorpay payment gateway into your React Native customer app for bike taxi rides.

## Overview

The Razorpay integration is designed to handle payments after ride completion, preserving all existing Socket.IO events and maintaining the current ride flow.

## Architecture

```
Ride Completion → Payment Screen → Razorpay Gateway → Payment Verification → Ride Summary
```

## Files Created/Modified

### New Files
- `src/services/paymentService.ts` - Payment API service
- `src/utils/razorpay.ts` - Razorpay utility functions
- `src/config/razorpay.ts` - Razorpay configuration
- `src/screens/ride/PaymentScreen.tsx` - Payment UI screen

### Modified Files
- `src/screens/ride/RideInProgressScreen.tsx` - Updated to navigate to payment
- `src/screens/ride/RideSummaryScreen.tsx` - Added payment status display
- `src/navigation/AppNavigator.tsx` - Added PaymentScreen to navigation
- `src/utils/socket.ts` - Added payment-related socket events

## Setup Instructions

### 1. Configure Razorpay Keys

Update `src/config/razorpay.ts` with your actual Razorpay keys:

```typescript
export const RAZORPAY_CONFIG = {
  test: {
    key: 'rzp_test_YOUR_ACTUAL_TEST_KEY',
    secret: 'YOUR_ACTUAL_TEST_SECRET',
  },
  production: {
    key: 'rzp_live_YOUR_ACTUAL_LIVE_KEY',
    secret: 'YOUR_ACTUAL_LIVE_SECRET',
  },
};
```

### 2. Backend API Endpoints

Ensure your backend has these endpoints implemented:

#### Create Payment Order
```
POST /api/payments/create-order
Content-Type: application/json
Authorization: Bearer <token>

{
  "rideId": "string",
  "amount": number, // in paise
  "currency": "INR",
  "receipt": "string"
}
```

#### Verify Payment
```
POST /api/payments/verify
Content-Type: application/json
Authorization: Bearer <token>

{
  "rideId": "string",
  "paymentId": "string",
  "signature": "string",
  "orderId": "string"
}
```

#### Get Payment Status
```
GET /api/payments/status/{rideId}
Authorization: Bearer <token>
```

### 3. Environment Configuration

The integration automatically uses test keys in development and production keys in production builds.

## Payment Flow

### 1. Ride Completion
When a ride is completed, the `RideInProgressScreen` navigates to the `PaymentScreen`.

### 2. Payment Processing
The `PaymentScreen`:
- Displays ride summary and payment details
- Creates a payment order via backend API
- Opens Razorpay checkout modal
- Handles payment success/failure
- Verifies payment with backend

### 3. Payment Verification
After successful payment:
- Payment is verified with backend
- User is navigated to `RideSummaryScreen`
- Payment status is displayed

## Socket.IO Events

The integration preserves existing Socket.IO events and adds new payment-related events:

### Existing Events (Preserved)
- `ride_completed`
- `ride_status_update`
- `driver_location_update`
- All chat events

### New Payment Events
- `payment_status` - Payment status updates
- `payment_failed` - Payment failure notifications

## Usage Examples

### Basic Payment Integration

```typescript
import { initializePayment } from '../utils/razorpay';

const handlePayment = async () => {
  const result = await initializePayment({
    rideId: 'ride_123',
    amount: 5000, // ₹50.00
    currency: 'INR',
    description: 'Payment for ride',
    userEmail: 'user@example.com',
    userPhone: '+919876543210',
    userName: 'John Doe',
    getToken: () => getToken(),
  });

  if (result.success) {
    console.log('Payment successful:', result.paymentId);
  } else {
    console.log('Payment failed:', result.error);
  }
};
```

### Payment Status Monitoring

```typescript
import { onPaymentStatus, onPaymentFailed } from '../utils/socket';

onPaymentStatus((data) => {
  console.log('Payment status:', data.status);
});

onPaymentFailed((data) => {
  console.log('Payment failed:', data.error);
});
```

## Error Handling

The integration includes comprehensive error handling:

### Common Errors
- `PAYMENT_CANCELLED` - User cancelled payment
- `NETWORK_ERROR` - Network connectivity issues
- `INVALID_PAYMENT_METHOD` - Unsupported payment method
- `VERIFICATION_FAILED` - Payment verification failed

### Error Recovery
- Automatic retry for network errors
- User-friendly error messages
- Fallback options for failed payments

## Testing

### Development Testing
1. Use test Razorpay keys
2. Test with small amounts (₹1-₹10)
3. Test all payment methods
4. Test error scenarios

### Test Cards
Use Razorpay's test cards for testing:
- Success: `4111 1111 1111 1111`
- Failure: `4000 0000 0000 0002`

## Security Considerations

### Client-Side Security
- Never expose Razorpay secret key in client code
- Always verify payments on backend
- Use HTTPS in production
- Validate payment amounts

### Backend Security
- Verify payment signatures
- Validate order amounts
- Implement proper authentication
- Log all payment activities

## Customization

### UI Customization
Modify `src/screens/ride/PaymentScreen.tsx` to customize:
- Payment screen layout
- Color scheme
- Payment methods display
- Error message styling

### Payment Flow Customization
Modify `src/utils/razorpay.ts` to customize:
- Payment options
- Error handling
- Success/failure flows

### Configuration Customization
Modify `src/config/razorpay.ts` to customize:
- Payment methods
- Theme colors
- Validation rules
- Error messages

## Troubleshooting

### Common Issues

#### Payment Modal Not Opening
- Check Razorpay key configuration
- Verify network connectivity
- Check for JavaScript errors

#### Payment Verification Failing
- Verify backend signature verification
- Check payment amount consistency
- Ensure proper error handling

#### Socket Events Not Working
- Check socket connection status
- Verify event listener registration
- Check for event name mismatches

### Debug Mode
Enable debug logging by setting `isDevelopment` to `true` in your environment configuration.

## Production Deployment

### Pre-deployment Checklist
- [ ] Replace test keys with production keys
- [ ] Test with real payment methods
- [ ] Verify backend API endpoints
- [ ] Test error scenarios
- [ ] Monitor payment success rates

### Monitoring
- Track payment success/failure rates
- Monitor API response times
- Log payment errors for debugging
- Set up alerts for payment failures

## Support

For issues related to:
- **Razorpay Integration**: Check this guide and Razorpay documentation
- **Backend API**: Contact your backend team
- **React Native**: Check React Native documentation
- **Socket.IO**: Check Socket.IO documentation

## Dependencies

- `react-native-razorpay`: ^2.3.0
- `@clerk/clerk-expo`: For authentication
- `socket.io-client`: For real-time communication

## Version History

- **v1.0.0**: Initial Razorpay integration
  - Basic payment flow
  - Socket.IO event preservation
  - Error handling
  - UI components 