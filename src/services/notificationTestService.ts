import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import NotificationService from './notificationService';
import { NotificationData } from './notificationService';

export interface TestNotificationResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

class NotificationTestService {
  private static instance: NotificationTestService;
  private notificationService: NotificationService;

  private constructor() {
    this.notificationService = NotificationService.getInstance();
  }

  public static getInstance(): NotificationTestService {
    if (!NotificationTestService.instance) {
      NotificationTestService.instance = new NotificationTestService();
    }
    return NotificationTestService.instance;
  }

  /**
   * Test notification permissions
   */
  async testPermissions(): Promise<TestNotificationResult> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      const { status } = await Notifications.requestPermissionsAsync();
      
      return {
        success: status === 'granted',
        message: `Permission status: ${status}`,
        data: {
          previousStatus: existingStatus,
          currentStatus: status,
          platform: Platform.OS
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to check permissions',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test getting push token
   */
  async testPushToken(): Promise<TestNotificationResult> {
    try {
      const token = await this.notificationService.getAndStorePushToken();
      
      return {
        success: !!token,
        message: token ? 'Push token obtained successfully' : 'Failed to get push token',
        data: {
          token: token,
          platform: Platform.OS
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to get push token',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test local notification scheduling
   */
  async testLocalNotification(
    title: string = 'Test Notification',
    body: string = 'This is a test notification',
    data?: NotificationData
  ): Promise<TestNotificationResult> {
    try {
      const notificationId = await this.notificationService.scheduleLocalNotification(
        title,
        body,
        data
      );
      
      return {
        success: !!notificationId,
        message: 'Local notification scheduled successfully',
        data: {
          notificationId,
          title,
          body,
          data
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to schedule local notification',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test immediate local notification
   */
  async testImmediateNotification(
    title: string = 'Immediate Test',
    body: string = 'This notification appears immediately'
  ): Promise<TestNotificationResult> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { type: 'test', timestamp: Date.now() }
        },
        trigger: null // null means immediate
      });
      
      return {
        success: true,
        message: 'Immediate notification sent successfully',
        data: { title, body }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to send immediate notification',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test delayed notification (5 seconds)
   */
  async testDelayedNotification(
    title: string = 'Delayed Test',
    body: string = 'This notification appears after 5 seconds'
  ): Promise<TestNotificationResult> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { type: 'delayed_test', timestamp: Date.now() }
        },
        trigger: {
          seconds: 5
        }
      });
      
      return {
        success: !!notificationId,
        message: 'Delayed notification scheduled successfully (5 seconds)',
        data: { notificationId, title, body }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to schedule delayed notification',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test ride-related notifications
   */
  async testRideNotifications(): Promise<TestNotificationResult[]> {
    const results: TestNotificationResult[] = [];
    
    // Test ride request
    results.push(await this.testLocalNotification(
      'New Ride Request',
      'You have a new ride request from pickup to destination',
      {
        type: 'ride_request',
        title: 'New Ride Request',
        message: 'You have a new ride request',
        rideId: 'test-ride-123',
        pickup: '123 Main St',
        destination: '456 Oak Ave'
      }
    ));

    // Test ride accepted
    results.push(await this.testLocalNotification(
      'Ride Accepted!',
      'Your ride has been accepted by John D. ETA: 5 minutes',
      {
        type: 'ride_accepted',
        title: 'Ride Accepted!',
        message: 'Your ride has been accepted',
        rideId: 'test-ride-123',
        driverId: 'driver-456',
        driverName: 'John D.',
        eta: '5 minutes'
      }
    ));

    // Test ride started
    results.push(await this.testLocalNotification(
      'Ride Started',
      'Your ride is now in progress. Enjoy your trip!',
      {
        type: 'ride_started',
        title: 'Ride Started',
        message: 'Your ride is now in progress',
        rideId: 'test-ride-123',
        driverId: 'driver-456'
      }
    ));

    return results;
  }

  /**
   * Test payment notifications
   */
  async testPaymentNotifications(): Promise<TestNotificationResult[]> {
    const results: TestNotificationResult[] = [];
    
    // Test payment successful
    results.push(await this.testLocalNotification(
      'Payment Successful',
      'Your payment of $15.50 has been processed successfully',
      {
        type: 'payment',
        title: 'Payment Successful',
        message: 'Payment processed successfully',
        amount: 15.50,
        currency: 'USD',
        transactionId: 'txn-123456'
      }
    ));

    // Test payment failed
    results.push(await this.testLocalNotification(
      'Payment Failed',
      'Your payment could not be processed. Please try again.',
      {
        type: 'payment_failed',
        title: 'Payment Failed',
        message: 'Payment could not be processed',
        amount: 15.50,
        currency: 'USD',
        reason: 'Insufficient funds'
      }
    ));

    return results;
  }

  /**
   * Test promotional notifications
   */
  async testPromoNotifications(): Promise<TestNotificationResult[]> {
    const results: TestNotificationResult[] = [];
    
    // Test promo code
    results.push(await this.testLocalNotification(
      'Special Offer!',
      'Use code SAVE20 for 20% off your next ride',
      {
        type: 'promo',
        title: 'Special Offer!',
        message: 'Use code SAVE20 for 20% off',
        promoCode: 'SAVE20',
        discount: '20%',
        validUntil: '2024-12-31'
      }
    ));

    // Test new feature
    results.push(await this.testLocalNotification(
      'New Feature Available',
      'Try our new ride scheduling feature!',
      {
        type: 'feature_update',
        title: 'New Feature Available',
        message: 'Try our new ride scheduling feature',
        feature: 'ride_scheduling',
        description: 'Schedule rides up to 24 hours in advance'
      }
    ));

    return results;
  }

  /**
   * Test chat notifications
   */
  async testChatNotifications(): Promise<TestNotificationResult[]> {
    const results: TestNotificationResult[] = [];
    
         // Test text message
     results.push(await this.testLocalNotification(
       'New message from John D.',
       'I\'m 5 minutes away from your pickup location. Please be ready!',
       {
         type: 'chat',
         title: 'New message from John D.',
         message: 'I\'m 5 minutes away from your pickup location. Please be ready!',
         rideId: 'test-ride-123',
         senderId: 'driver-456',
         senderName: 'John D.',
         messageType: 'text'
       }
     ));

    // Test image message
    results.push(await this.testLocalNotification(
      'New message from John D.',
      '📷 Sent you a photo',
      {
        type: 'chat',
        title: 'New message from John D.',
        message: '📷 Sent you a photo',
        rideId: 'test-ride-123',
        senderId: 'driver-456',
        senderName: 'John D.',
        messageType: 'image'
      }
    ));

    return results;
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<TestNotificationResult> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      
      return {
        success: true,
        message: 'All scheduled notifications cancelled successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to cancel notifications',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get all scheduled notifications
   */
  async getScheduledNotifications(): Promise<TestNotificationResult> {
    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      
      return {
        success: true,
        message: `Found ${notifications.length} scheduled notifications`,
        data: {
          count: notifications.length,
          notifications: notifications
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to get scheduled notifications',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Comprehensive test suite
   */
  async runFullTestSuite(): Promise<{
    permissions: TestNotificationResult;
    pushToken: TestNotificationResult;
    immediate: TestNotificationResult;
    delayed: TestNotificationResult;
    rideNotifications: TestNotificationResult[];
    paymentNotifications: TestNotificationResult[];
    promoNotifications: TestNotificationResult[];
    chatNotifications: TestNotificationResult[];
  }> {
    console.log('🧪 Starting comprehensive notification test suite...');
    
    const permissions = await this.testPermissions();
    const pushToken = await this.testPushToken();
    const immediate = await this.testImmediateNotification();
    const delayed = await this.testDelayedNotification();
    const rideNotifications = await this.testRideNotifications();
    const paymentNotifications = await this.testPaymentNotifications();
    const promoNotifications = await this.testPromoNotifications();
    const chatNotifications = await this.testChatNotifications();

    console.log('🧪 Test suite completed!');
    
    return {
      permissions,
      pushToken,
      immediate,
      delayed,
      rideNotifications,
      paymentNotifications,
      promoNotifications,
      chatNotifications
    };
  }
}

export default NotificationTestService;
