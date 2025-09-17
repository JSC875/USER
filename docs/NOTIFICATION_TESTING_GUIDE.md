# 🔔 Push Notification Testing Guide

This guide covers all the different ways to test push notifications in your React Native app.

## 📱 **Testing Methods Overview**

### 1. **In-App Testing (Recommended for Development)**
- Use the enhanced `NotificationTest` component in your debug screen
- Test local notifications immediately
- Verify permissions and push tokens
- Run comprehensive test suites

### 2. **Push Notification Testing (Production-like)**
- Use the Node.js script to send real push notifications
- Test from your backend or manually
- Verify end-to-end notification delivery

### 3. **Backend Integration Testing**
- Test your server's notification sending capabilities
- Verify token storage and management
- Test different notification types

---

## 🧪 **Method 1: In-App Testing**

### **Access the Test Interface**

1. **Open your app** and navigate to the debug screen
2. **Find the "Notification Test" section** at the bottom
3. **Use the various test buttons** to test different aspects

### **Available Tests**

#### **Basic Tests**
- **Initialize Notifications**: Set up the notification system
- **Test Permissions**: Check and request notification permissions
- **Test Push Token**: Get and display your push token

#### **Local Notifications**
- **Immediate Notification**: Send a notification that appears instantly
- **Delayed Notification**: Schedule a notification for 5 seconds later

#### **App-Specific Tests**
- **Test Ride Notifications**: Send ride-related notifications (request, accepted, started)
- **Test Payment Notifications**: Send payment success/failure notifications
- **Test Promo Notifications**: Send promotional and feature update notifications

#### **Management**
- **Get Scheduled Notifications**: View all pending notifications
- **Cancel All Notifications**: Clear all scheduled notifications

#### **Comprehensive Testing**
- **Run Full Test Suite**: Execute all tests at once and see results

### **How to Use**

1. **Start with Basic Tests**:
   ```
   1. Click "Initialize Notifications"
   2. Click "Test Permissions" (grant permission if prompted)
   3. Click "Test Push Token" (copy the token for later use)
   ```

2. **Test Local Notifications**:
   ```
   1. Click "Immediate Notification" - should appear instantly
   2. Click "Delayed Notification" - should appear in 5 seconds
   ```

3. **Test App-Specific Scenarios**:
   ```
   1. Click "Test Ride Notifications" - sends 3 ride-related notifications
   2. Click "Test Payment Notifications" - sends 2 payment notifications
   3. Click "Test Promo Notifications" - sends 2 promotional notifications
   ```

4. **Run Full Test Suite**:
   ```
   1. Click "Run Full Test Suite" - runs all tests
   2. Check the results section for pass/fail status
   ```

---

## 🚀 **Method 2: Push Notification Testing**

### **Using the Node.js Script**

The script `scripts/test-push-notifications.js` allows you to send real push notifications to your device.

#### **Prerequisites**
1. **Get your push token** from the in-app test (Test Push Token button)
2. **Make sure your app is running** (development or production build)

#### **Usage**

```bash
# Basic usage
node scripts/test-push-notifications.js <push-token> [notification-type]

# Examples
node scripts/test-push-notifications.js ExpoPushToken[xxxxxxxxxxxxxxxxxxxxxx] ride_accepted
node scripts/test-push-notifications.js ExpoPushToken[xxxxxxxxxxxxxxxxxxxxxx] payment
node scripts/test-push-notifications.js ExpoPushToken[xxxxxxxxxxxxxxxxxxxxxx] promo
```

#### **Available Notification Types**
- `ride_request` - New ride request notification
- `ride_accepted` - Ride accepted by driver
- `ride_started` - Ride started notification
- `ride_completed` - Ride completed notification
- `payment` - Payment successful
- `payment_failed` - Payment failed
- `promo` - Promotional offer
- `general` - General test notification

#### **Step-by-Step Process**

1. **Get Your Push Token**:
   ```
   1. Open your app
   2. Go to debug screen
   3. Click "Test Push Token"
   4. Copy the token (starts with ExpoPushToken[...])
   ```

2. **Send a Test Notification**:
   ```bash
   node scripts/test-push-notifications.js ExpoPushToken[your-token-here] ride_accepted
   ```

3. **Verify the Notification**:
   - Check your device for the notification
   - Tap the notification to test deep linking
   - Verify it navigates to the correct screen

---

## 🔧 **Method 3: Backend Integration Testing**

### **Test Your Server's Notification Sending**

If you have a backend server, you can test the complete flow:

#### **1. Token Registration Test**
```javascript
// Test registering a device token with your server
const response = await fetch('/api/notifications/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-123',
    pushToken: 'ExpoPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
    platform: 'android' // or 'ios'
  })
});
```

#### **2. Send Notification Test**
```javascript
// Test sending a notification from your server
const response = await fetch('/api/notifications/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-123',
    type: 'ride_accepted',
    title: 'Ride Accepted!',
    body: 'Your ride has been accepted by John D.',
    data: {
      rideId: 'ride-123',
      driverId: 'driver-456'
    }
  })
});
```

---

## 📋 **Testing Checklist**

### **Local Notifications**
- [ ] Permissions are granted
- [ ] Immediate notifications appear
- [ ] Delayed notifications work
- [ ] Notification sounds play
- [ ] Notification icons display correctly
- [ ] Deep linking works when tapping notifications

### **Push Notifications**
- [ ] Push token is generated and stored
- [ ] Token is sent to your server
- [ ] Push notifications are received
- [ ] Notifications appear when app is in background
- [ ] Notifications appear when app is closed
- [ ] Deep linking works from push notifications

### **App-Specific Features**
- [ ] Ride notifications navigate to correct screens
- [ ] Payment notifications show correct information
- [ ] Promotional notifications work
- [ ] Notification data is passed correctly
- [ ] Different notification types are handled properly

### **Error Handling**
- [ ] Permission denied scenarios
- [ ] Network errors when sending tokens
- [ ] Invalid push tokens
- [ ] Server errors
- [ ] App crashes don't break notifications

---

## 🐛 **Troubleshooting**

### **Common Issues**

#### **Notifications Not Appearing**
1. **Check permissions**: Make sure notifications are enabled in device settings
2. **Verify token**: Ensure push token is valid and properly formatted
3. **Check app state**: Test with app in foreground, background, and closed
4. **Network connectivity**: Ensure device has internet connection

#### **Deep Linking Not Working**
1. **Check navigation setup**: Verify `NotificationProvider` is properly configured
2. **Screen names**: Ensure screen names in navigation match notification data
3. **Navigation ref**: Verify `navigationRef` is passed to `NotificationProvider`

#### **Push Token Issues**
1. **Token format**: Should start with `ExpoPushToken[` and end with `]`
2. **Token generation**: Ensure `expo-notifications` is properly configured
3. **Token storage**: Check if token is being saved to AsyncStorage

#### **Permission Issues**
1. **Device settings**: Check if notifications are enabled in device settings
2. **App permissions**: Verify app has notification permission
3. **Permission request**: Ensure permission request is being called

### **Debug Commands**

```bash
# Check notification permissions
adb shell dumpsys notification

# View notification logs
adb logcat | grep -i notification

# Test push notification
node scripts/test-push-notifications.js <token> general
```

---

## 📊 **Testing Results**

### **Expected Outcomes**

#### **Successful Test Results**
- ✅ Permissions granted
- ✅ Push token generated
- ✅ Local notifications appear
- ✅ Push notifications received
- ✅ Deep linking works
- ✅ All notification types work

#### **Failed Test Results**
- ❌ Permission denied
- ❌ Token generation failed
- ❌ Notifications not appearing
- ❌ Deep linking broken
- ❌ Server errors

### **Performance Metrics**
- **Token generation time**: < 2 seconds
- **Local notification delay**: < 1 second
- **Push notification delay**: < 5 seconds
- **Deep linking response**: < 1 second

---

## 🎯 **Next Steps**

After successful testing:

1. **Integrate with your backend** to send real notifications
2. **Set up production push certificates** for iOS
3. **Configure notification channels** for Android
4. **Implement notification preferences** for users
5. **Add analytics** to track notification engagement
6. **Set up A/B testing** for notification content

---

## 📚 **Additional Resources**

- [Expo Notifications Documentation](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [React Navigation Deep Linking](https://reactnavigation.org/docs/deep-linking/)
- [Push Notification Best Practices](https://docs.expo.dev/push-notifications/overview/)
- [Android Notification Channels](https://developer.android.com/guide/topics/ui/notifiers/notifications#ManageChannels)
- [iOS Push Notifications](https://developer.apple.com/documentation/usernotifications)
