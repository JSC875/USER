# Test QR Code for Payment Scanner

## Sample QR Code Data

You can generate a QR code with this JSON data to test the scanner:

```json
{
  "orderId": "order_test_123456",
  "paymentLink": "https://razorpay.com/pay/test_order_123456",
  "amount": 5000,
  "currency": "INR",
  "rideId": "ride_test_789"
}
```

## How to Test

1. **Generate QR Code**: Use any online QR code generator (like qr-code-generator.com) and paste the JSON above
2. **Navigate to Ride Summary**: In the customer app, go to RideSummaryScreen
3. **Tap "Scan QR Code to Pay"**: The button should now be visible
4. **Scan the QR Code**: Point the camera at the generated QR code
5. **Verify Navigation**: Should navigate to WebViewPayment screen with the parsed data

## Expected Flow

1. QR code scanned → `qr_code_scanned` event emitted
2. Navigation to WebViewPayment with order data
3. Payment completion → `payment_completed` event emitted
4. Driver app receives `payment_success` event

## Troubleshooting

- **Camera not working**: Check if camera permissions are granted
- **QR not scanning**: Ensure the QR code contains valid JSON
- **Navigation not working**: Check if QRScannerScreen is properly registered in navigation
- **Button not visible**: The QR payment button should now always be visible in RideSummaryScreen

## Test QR Code Image

You can also save this as a QR code image for testing:
- Use a QR code generator
- Input the JSON data above
- Save as image
- Display on another device or print for testing 