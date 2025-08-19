#!/usr/bin/env node

/**
 * Push Notification Testing Script
 * 
 * This script allows you to test push notifications by sending them directly
 * to Expo's push service. You can use this to test notifications from your backend
 * or to manually trigger notifications during development.
 * 
 * Usage:
 * node scripts/test-push-notifications.js <push-token> [notification-type]
 * 
 * Examples:
 * node scripts/test-push-notifications.js ExpoPushToken[xxxxxxxxxxxxxxxxxxxxxx] ride_accepted
 * node scripts/test-push-notifications.js ExpoPushToken[xxxxxxxxxxxxxxxxxxxxxx] payment
 * node scripts/test-push-notifications.js ExpoPushToken[xxxxxxxxxxxxxxxxxxxxxx] promo
 */

const https = require('https');

// Configuration
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

// Notification templates
const NOTIFICATION_TEMPLATES = {
  ride_request: {
    title: 'New Ride Request',
    body: 'You have a new ride request from pickup to destination',
    data: {
      type: 'ride_request',
      rideId: 'test-ride-123',
      pickup: '123 Main St',
      destination: '456 Oak Ave',
      timestamp: Date.now()
    }
  },
  
  ride_accepted: {
    title: 'Ride Accepted!',
    body: 'Your ride has been accepted by John D. ETA: 5 minutes',
    data: {
      type: 'ride_accepted',
      rideId: 'test-ride-123',
      driverId: 'driver-456',
      driverName: 'John D.',
      eta: '5 minutes',
      timestamp: Date.now()
    }
  },
  
  ride_arrived: {
    title: 'Pilot Arrived!',
    body: 'John D. has arrived at your pickup location. Please come outside.',
    data: {
      type: 'ride_arrived',
      rideId: 'test-ride-123',
      driverId: 'driver-456',
      driverName: 'John D.',
      pickupLocation: '123 Main St',
      timestamp: Date.now()
    }
  },
  
  ride_started: {
    title: 'Ride Started',
    body: 'Your ride is now in progress. Enjoy your trip!',
    data: {
      type: 'ride_started',
      rideId: 'test-ride-123',
      driverId: 'driver-456',
      timestamp: Date.now()
    }
  },
  
  ride_completed: {
    title: 'Ride Completed',
    body: 'Your ride has been completed. Rate your driver!',
    data: {
      type: 'ride_completed',
      rideId: 'test-ride-123',
      driverId: 'driver-456',
      amount: 15.50,
      timestamp: Date.now()
    }
  },
  
  payment: {
    title: 'Payment Successful',
    body: 'Your payment of $15.50 has been processed successfully',
    data: {
      type: 'payment',
      amount: 15.50,
      currency: 'USD',
      transactionId: 'txn-123456',
      timestamp: Date.now()
    }
  },
  
  payment_failed: {
    title: 'Payment Failed',
    body: 'Your payment could not be processed. Please try again.',
    data: {
      type: 'payment_failed',
      amount: 15.50,
      currency: 'USD',
      reason: 'Insufficient funds',
      timestamp: Date.now()
    }
  },
  
  promo: {
    title: 'Special Offer!',
    body: 'Use code SAVE20 for 20% off your next ride',
    data: {
      type: 'promo',
      promoCode: 'SAVE20',
      discount: '20%',
      validUntil: '2024-12-31',
      timestamp: Date.now()
    }
  },
  
  chat: {
    title: 'New message from John D.',
    body: 'I\'m 5 minutes away from your pickup location. Please be ready!',
    data: {
      type: 'chat',
      rideId: 'test-ride-123',
      senderId: 'driver-456',
      senderName: 'John D.',
      message: 'I\'m 5 minutes away from your pickup location. Please be ready!',
      messageType: 'text',
      timestamp: Date.now()
    }
  },
  
  general: {
    title: 'Test Notification',
    body: 'This is a test notification from your ride-sharing app!',
    data: {
      type: 'general',
      message: 'Test notification sent successfully',
      timestamp: Date.now()
    }
  }
};

/**
 * Send push notification to Expo
 */
function sendPushNotification(pushToken, notification) {
  return new Promise((resolve, reject) => {
    const message = {
      to: pushToken,
      title: notification.title,
      body: notification.body,
      data: notification.data,
      sound: 'default',
      priority: 'high',
      channelId: 'default'
    };
    
    const postData = JSON.stringify([message]);
    
    console.log('📤 Sending message:', JSON.stringify(message, null, 2));

    const options = {
      hostname: 'exp.host',
      port: 443,
      path: '/--/api/v2/push/send',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
             res.on('end', () => {
         try {
           console.log(`📡 Response status: ${res.statusCode}`);
           console.log(`📡 Response headers:`, res.headers);
           console.log(`📡 Response data:`, data);
           
           const response = JSON.parse(data);
           
                       if (res.statusCode === 200 && response.data && response.data[0] && response.data[0].status === 'ok') {
              resolve({
                success: true,
                message: 'Notification sent successfully',
                data: response
              });
            } else {
              reject({
                success: false,
                message: `Failed to send notification (Status: ${res.statusCode})`,
                statusCode: res.statusCode,
                data: response
              });
            }
         } catch (error) {
           reject({
             success: false,
             message: 'Invalid response from Expo',
             error: error.message,
             rawData: data
           });
         }
       });
    });

    req.on('error', (error) => {
      reject({
        success: false,
        message: 'Network error',
        error: error.message
      });
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('❌ Error: Push token is required');
    console.log('');
    console.log('Usage: node scripts/test-push-notifications.js <push-token> [notification-type]');
    console.log('');
    console.log('Available notification types:');
    Object.keys(NOTIFICATION_TEMPLATES).forEach(type => {
      console.log(`  - ${type}`);
    });
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/test-push-notifications.js ExpoPushToken[xxxxxxxxxxxxxxxxxxxxxx] ride_accepted');
    console.log('  node scripts/test-push-notifications.js ExpoPushToken[xxxxxxxxxxxxxxxxxxxxxx] payment');
    console.log('  node scripts/test-push-notifications.js ExpoPushToken[xxxxxxxxxxxxxxxxxxxxxx] promo');
    process.exit(1);
  }

  const pushToken = args[0];
  const notificationType = args[1] || 'general';

  // Validate push token format
  if (!pushToken.startsWith('ExpoPushToken[') && !pushToken.startsWith('ExponentPushToken[') || !pushToken.endsWith(']')) {
    console.log('❌ Error: Invalid push token format');
    console.log('Push token should start with "ExpoPushToken[" or "ExponentPushToken[" and end with "]"');
    process.exit(1);
  }

  // Validate notification type
  if (!NOTIFICATION_TEMPLATES[notificationType]) {
    console.log(`❌ Error: Unknown notification type "${notificationType}"`);
    console.log('');
    console.log('Available notification types:');
    Object.keys(NOTIFICATION_TEMPLATES).forEach(type => {
      console.log(`  - ${type}`);
    });
    process.exit(1);
  }

  const notification = NOTIFICATION_TEMPLATES[notificationType];

  console.log('🚀 Sending push notification...');
  console.log(`📱 Push Token: ${pushToken}`);
  console.log(`📋 Type: ${notificationType}`);
  console.log(`📝 Title: ${notification.title}`);
  console.log(`📄 Body: ${notification.body}`);
  console.log('');

  try {
    const result = await sendPushNotification(pushToken, notification);
    
    if (result.success) {
      console.log('✅ Notification sent successfully!');
      console.log('');
      console.log('Response details:');
      console.log(JSON.stringify(result.data, null, 2));
    } else {
      console.log('❌ Failed to send notification');
      console.log('');
      console.log('Error details:');
      console.log(JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.log('❌ Error sending notification:');
    console.log(error.message || error);
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  sendPushNotification,
  NOTIFICATION_TEMPLATES
};
