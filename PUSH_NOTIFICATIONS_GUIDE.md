# Push Notifications Implementation Guide

This guide explains how push notifications are implemented in the Roqet ride-sharing application.

## Overview

The push notification system is built using Expo's notification service and includes:

- **Local Notifications**: Scheduled within the app
- **Push Notifications**: Sent from the server
- **Permission Management**: Automatic permission requests
- **Token Management**: Secure storage and server registration
- **Navigation Integration**: Deep linking when notifications are tapped

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   App (Client)  │    │   Expo Push      │    │   Your Server   │
│                 │    │   Service        │    │                 │
├─────────────────┤    ├──────────────────┤    ├─────────────────┤
│ Notification    │◄──►│ expo-notifications│◄──►│ Notification    │
│ Service         │    │                  │    │ API Service     │
├─────────────────┤    ├──────────────────┤    ├─────────────────┤
│ Notification    │    │ Token Management │    │ User Database   │
│ Context         │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Key Components

### 1. NotificationService (`src/services/notificationService.ts`)
- Singleton service for managing notifications
- Handles permissions, token management, and local notifications
- Processes incoming notifications and routes them appropriately

### 2. NotificationContext (`src/store/NotificationContext.tsx`)
- React context for notification state management
- Handles navigation when notifications are tapped
- Provides hooks for components to interact with notifications

### 3. NotificationApiService (`src/services/notificationApiService.ts`)
- Server communication for push notifications
- Handles token registration/unregistration
- Sends notifications to specific users

## Setup Instructions

### 1. Dependencies
The following packages are already installed:
```json
{
  "expo-notifications": "^0.31.4",
  "expo-device": "^7.1.4"
}
```

### 2. Configuration
The app is configured with:
- Notification permissions in `app.json`
- Expo notifications plugin
- Proper Android permissions

### 3. Integration
The notification system is integrated into the app through:
- `App.tsx`: Wraps the app with NotificationProvider
- `AppNavigator.tsx`: Removed NavigationContainer (moved to App.tsx)

## Usage Examples

### Initializing Notifications
```typescript
import { useNotifications } from '../store/NotificationContext';

const MyComponent = () => {
  const { initializeNotifications } = useNotifications();

  useEffect(() => {
    initializeNotifications();
  }, []);
};
```

### Scheduling Local Notifications
```typescript
import { useNotifications } from '../store/NotificationContext';

const MyComponent = () => {
  const { scheduleLocalNotification } = useNotifications();

  const handleScheduleNotification = async () => {
    await scheduleLocalNotification(
      'Ride Accepted!',
      'Your ride has been accepted by John D.',
      {
        type: 'ride_accepted',
        rideId: 'ride-123',
        driverId: 'driver-456'
      }
    );
  };
};
```

### Sending Server Notifications
```typescript
import NotificationApiService from '../services/notificationApiService';

const notificationService = new NotificationApiService();

// Send ride notification
await notificationService.sendRideNotification(
  'ride-123',
  'ride_accepted',
  'user-456',
  { driverName: 'John D.', eta: '5 minutes' }
);

// Send payment notification
await notificationService.sendPaymentNotification(
  'user-456',
  15.50,
  'success'
);
```

## Notification Types

### 1. Ride Notifications
- `ride_request`: New ride request received
- `ride_accepted`: Driver accepted the ride
- `ride_started`: Ride has started
- `ride_completed`: Ride completed, rate driver

### 2. Payment Notifications
- Payment success/failure/pending
- Includes amount and status

### 3. Promotional Notifications
- Special offers and discounts
- Promo codes and deals

### 4. General Notifications
- App updates, maintenance, etc.

## Server-Side Implementation

### Required API Endpoints

#### 1. Register Device Token
```http
POST /api/notifications/register
Content-Type: application/json
Authorization: Bearer <token>

{
  "token": "ExponentPushToken[...]",
  "platform": "ios",
  "deviceId": "device-123",
  "userId": "user-456",
  "timestamp": 1640995200000
}
```

#### 2. Send Push Notification
```http
POST /api/notifications/send
Content-Type: application/json
Authorization: Bearer <token>

{
  "userIds": ["user-123", "user-456"],
  "title": "Ride Accepted!",
  "body": "Your ride has been accepted",
  "data": {
    "type": "ride_accepted",
    "rideId": "ride-123"
  }
}
```

#### 3. Unregister Device Token
```http
POST /api/notifications/unregister
Content-Type: application/json
Authorization: Bearer <token>

{
  "token": "ExponentPushToken[...]"
}
```

### Server Implementation Example (Node.js/Express)

```javascript
const express = require('express');
const { Expo } = require('expo-server-sdk');

const app = express();
const expo = new Expo();

// Register device token
app.post('/api/notifications/register', async (req, res) => {
  try {
    const { token, userId, platform, deviceId } = req.body;
    
    // Store token in database
    await db.notificationTokens.create({
      token,
      userId,
      platform,
      deviceId,
      createdAt: new Date()
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send push notification
app.post('/api/notifications/send', async (req, res) => {
  try {
    const { userIds, title, body, data } = req.body;
    
    // Get tokens for users
    const tokens = await db.notificationTokens.findAll({
      where: { userId: userIds }
    });
    
    // Create messages
    const messages = tokens.map(token => ({
      to: token.token,
      sound: 'default',
      title,
      body,
      data
    }));
    
    // Send notifications
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];
    
    for (let chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('Error sending chunk:', error);
      }
    }
    
    res.json({ success: true, tickets });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Testing

### Local Testing
Use the `NotificationTest` component to test notifications:

```typescript
import NotificationTest from '../components/common/NotificationTest';

// Add to any screen for testing
<NotificationTest />
```

### Testing Push Notifications
1. Use Expo's push notification tool: https://expo.dev/notifications
2. Send test notifications using the Expo push service directly
3. Test on physical devices (not simulators)

## Best Practices

### 1. Permission Handling
- Always request permissions gracefully
- Provide clear explanations for why notifications are needed
- Handle permission denial gracefully

### 2. Token Management
- Store tokens securely
- Refresh tokens periodically
- Handle token invalidation

### 3. Notification Content
- Keep titles short and descriptive
- Use clear, actionable body text
- Include relevant data for deep linking

### 4. Error Handling
- Handle network errors gracefully
- Log notification failures
- Implement retry mechanisms

### 5. User Experience
- Don't spam users with notifications
- Allow users to customize notification preferences
- Provide clear opt-out options

## Troubleshooting

### Common Issues

#### 1. Notifications not showing
- Check if permissions are granted
- Verify device is not in Do Not Disturb mode
- Ensure app is not in background (for local notifications)

#### 2. Push tokens not working
- Verify Expo project ID is correct
- Check if token is valid and not expired
- Ensure server is sending to correct Expo push service

#### 3. Navigation not working
- Verify notification data includes correct screen names
- Check if navigation ref is properly set up
- Ensure screen names match those in navigator

### Debug Commands
```bash
# Check notification permissions
expo notifications:permissions

# Test push notification
expo notifications:send --to ExponentPushToken[...] --title "Test" --body "Test message"

# View notification logs
expo logs
```

## Security Considerations

1. **Token Security**: Store push tokens securely on the server
2. **Authentication**: Always verify user identity before sending notifications
3. **Rate Limiting**: Implement rate limiting to prevent abuse
4. **Data Privacy**: Only send necessary data in notifications
5. **User Consent**: Respect user notification preferences

## Performance Optimization

1. **Batch Notifications**: Send multiple notifications in batches
2. **Token Cleanup**: Regularly clean up invalid tokens
3. **Caching**: Cache notification templates and user preferences
4. **Background Processing**: Use background tasks for notification processing

## Future Enhancements

1. **Rich Notifications**: Add images and actions to notifications
2. **Silent Notifications**: Use silent notifications for data sync
3. **Notification Groups**: Group related notifications
4. **Custom Sounds**: Add custom notification sounds
5. **Analytics**: Track notification engagement and effectiveness

## Support

For issues or questions about push notifications:

1. Check Expo documentation: https://docs.expo.dev/versions/latest/sdk/notifications/
2. Review Expo push service documentation: https://docs.expo.dev/push-notifications/overview/
3. Check server-side implementation examples
4. Test with Expo's notification tools

---

This implementation provides a robust, scalable push notification system for the Roqet ride-sharing application.
