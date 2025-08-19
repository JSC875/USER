import { config } from '../config/environment';

export interface PushNotificationPayload {
  to: string;
  title: string;
  body: string;
  data?: any;
  sound?: 'default' | 'none';
  priority?: 'default' | 'normal' | 'high';
  channelId?: string;
}

export interface BackendNotificationData {
  type: 'ride_request' | 'ride_accepted' | 'ride_arrived' | 'ride_started' | 'ride_completed' | 'payment' | 'payment_failed' | 'promo' | 'chat' | 'general';
  rideId?: string;
  driverId?: string;
  amount?: number;
  message: string;
  title: string;
  [key: string]: any;
}

class BackendNotificationService {
  private static instance: BackendNotificationService;
  private expoPushUrl = 'https://exp.host/--/api/v2/push/send';

  private constructor() {}

  static getInstance(): BackendNotificationService {
    if (!BackendNotificationService.instance) {
      BackendNotificationService.instance = new BackendNotificationService();
    }
    return BackendNotificationService.instance;
  }

  /**
   * Send push notification to a single device
   */
  async sendPushNotification(pushToken: string, notification: BackendNotificationData): Promise<boolean> {
    try {
      const payload: PushNotificationPayload = {
        to: pushToken,
        title: notification.title,
        body: notification.message,
        data: notification,
        sound: 'default',
        priority: 'high',
        channelId: 'default'
      };

      const response = await fetch(this.expoPushUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate'
        },
        body: JSON.stringify([payload])
      });

      const result = await response.json();
      
      if (response.ok && result.data && result.data[0] && result.data[0].status === 'ok') {
        console.log('✅ Push notification sent successfully:', result.data[0].id);
        return true;
      } else {
        console.error('❌ Failed to send push notification:', result);
        return false;
      }
    } catch (error) {
      console.error('❌ Error sending push notification:', error);
      return false;
    }
  }

  /**
   * Send push notification to multiple devices
   */
  async sendPushNotificationToMultiple(pushTokens: string[], notification: BackendNotificationData): Promise<{ success: number; failed: number }> {
    const results = await Promise.allSettled(
      pushTokens.map(token => this.sendPushNotification(token, notification))
    );

    const success = results.filter(result => result.status === 'fulfilled' && result.value).length;
    const failed = results.length - success;

    return { success, failed };
  }

  /**
   * Send ride request notification
   */
  async sendRideRequestNotification(pushToken: string, rideData: {
    rideId: string;
    pickup: string;
    destination: string;
    estimatedPrice?: number;
  }): Promise<boolean> {
    const notification: BackendNotificationData = {
      type: 'ride_request',
      rideId: rideData.rideId,
      title: 'New Ride Request',
      message: `You have a new ride request from ${rideData.pickup} to ${rideData.destination}`,
      pickup: rideData.pickup,
      destination: rideData.destination,
      estimatedPrice: rideData.estimatedPrice,
      timestamp: Date.now()
    };

    return this.sendPushNotification(pushToken, notification);
  }

  /**
   * Send ride accepted notification
   */
  async sendRideAcceptedNotification(pushToken: string, rideData: {
    rideId: string;
    driverId: string;
    driverName: string;
    eta: string;
    vehicleInfo?: string;
  }): Promise<boolean> {
    const notification: BackendNotificationData = {
      type: 'ride_accepted',
      rideId: rideData.rideId,
      driverId: rideData.driverId,
      title: 'Ride Accepted!',
      message: `Your ride has been accepted by ${rideData.driverName}. ETA: ${rideData.eta}`,
      driverName: rideData.driverName,
      eta: rideData.eta,
      vehicleInfo: rideData.vehicleInfo,
      timestamp: Date.now()
    };

    return this.sendPushNotification(pushToken, notification);
  }

  /**
   * Send driver arrived at pickup notification
   */
  async sendDriverArrivedNotification(pushToken: string, rideData: {
    rideId: string;
    driverId: string;
    driverName: string;
    vehicleInfo?: string;
    pickupLocation?: string;
  }): Promise<boolean> {
    const notification: BackendNotificationData = {
      type: 'ride_arrived',
      rideId: rideData.rideId,
      driverId: rideData.driverId,
      title: 'Pilot Arrived!',
      message: `${rideData.driverName} has arrived at your pickup location${rideData.pickupLocation ? ` (${rideData.pickupLocation})` : ''}. Please come outside.`,
      driverName: rideData.driverName,
      vehicleInfo: rideData.vehicleInfo,
      pickupLocation: rideData.pickupLocation,
      timestamp: Date.now()
    };

    return this.sendPushNotification(pushToken, notification);
  }

  /**
   * Send ride started notification
   */
  async sendRideStartedNotification(pushToken: string, rideData: {
    rideId: string;
    driverId: string;
  }): Promise<boolean> {
    const notification: BackendNotificationData = {
      type: 'ride_started',
      rideId: rideData.rideId,
      driverId: rideData.driverId,
      title: 'Ride Started',
      message: 'Your ride is now in progress. Enjoy your trip!',
      timestamp: Date.now()
    };

    return this.sendPushNotification(pushToken, notification);
  }

  /**
   * Send ride completed notification
   */
  async sendRideCompletedNotification(pushToken: string, rideData: {
    rideId: string;
    driverId: string;
    amount: number;
    currency?: string;
  }): Promise<boolean> {
    const notification: BackendNotificationData = {
      type: 'ride_completed',
      rideId: rideData.rideId,
      driverId: rideData.driverId,
      amount: rideData.amount,
      title: 'Ride Completed',
      message: `Your ride has been completed. Amount: ${rideData.currency || '$'}${rideData.amount}`,
      currency: rideData.currency || 'USD',
      timestamp: Date.now()
    };

    return this.sendPushNotification(pushToken, notification);
  }

  /**
   * Send payment notification
   */
  async sendPaymentNotification(pushToken: string, paymentData: {
    type: 'success' | 'failed';
    amount: number;
    currency?: string;
    transactionId?: string;
    reason?: string;
  }): Promise<boolean> {
    const isSuccess = paymentData.type === 'success';
    
    const notification: BackendNotificationData = {
      type: isSuccess ? 'payment' : 'payment_failed',
      amount: paymentData.amount,
      title: isSuccess ? 'Payment Successful' : 'Payment Failed',
      message: isSuccess 
        ? `Your payment of ${paymentData.currency || '$'}${paymentData.amount} has been processed successfully`
        : `Your payment could not be processed. ${paymentData.reason || 'Please try again.'}`,
      currency: paymentData.currency || 'USD',
      transactionId: paymentData.transactionId,
      reason: paymentData.reason,
      timestamp: Date.now()
    };

    return this.sendPushNotification(pushToken, notification);
  }

  /**
   * Send promotional notification
   */
  async sendPromoNotification(pushToken: string, promoData: {
    promoCode: string;
    discount: string;
    validUntil: string;
    description?: string;
  }): Promise<boolean> {
    const notification: BackendNotificationData = {
      type: 'promo',
      title: 'Special Offer!',
      message: `Use code ${promoData.promoCode} for ${promoData.discount} off your next ride`,
      promoCode: promoData.promoCode,
      discount: promoData.discount,
      validUntil: promoData.validUntil,
      description: promoData.description,
      timestamp: Date.now()
    };

    return this.sendPushNotification(pushToken, notification);
  }

  /**
   * Send chat notification with high priority for faster delivery
   */
  async sendChatNotification(pushToken: string, chatData: {
    rideId: string;
    senderId: string;
    senderName: string;
    message: string;
    messageType?: 'text' | 'image' | 'location';
    priority?: 'high' | 'normal' | 'low';
    sound?: string;
    badge?: number;
  }): Promise<boolean> {
    const notification: BackendNotificationData = {
      type: 'chat',
      rideId: chatData.rideId,
      title: `New message from ${chatData.senderName}`,
      message: chatData.messageType === 'image' ? '📷 Sent you a photo' : 
               chatData.messageType === 'location' ? '📍 Sent you a location' : 
               chatData.message,
      senderId: chatData.senderId,
      senderName: chatData.senderName,
      messageType: chatData.messageType || 'text',
      priority: chatData.priority || 'high',
      sound: chatData.sound || 'default',
      badge: chatData.badge,
      timestamp: Date.now()
    };

    // Use high priority for chat notifications
    return this.sendPushNotificationWithPriority(pushToken, notification, 'high');
  }

  /**
   * Send push notification with specific priority for faster delivery
   */
  private async sendPushNotificationWithPriority(
    pushToken: string, 
    notification: BackendNotificationData, 
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): Promise<boolean> {
    try {
      console.log(`🚀 Sending ${priority} priority notification to:`, pushToken.substring(0, 20) + '...');
      
      const message = {
        to: pushToken,
        title: notification.title,
        body: notification.message,
        data: notification,
        sound: notification.sound || 'default',
        priority: priority,
        channelId: priority === 'high' ? 'chat' : 'default',
        badge: notification.badge,
        // Add urgency for high priority notifications
        ...(priority === 'high' && {
          _displayInForeground: true,
          _displayInBackground: true,
          _sound: 'default',
          _priority: 'high'
        })
      };

      console.log(`📤 Sending ${priority} priority message:`, {
        to: message.to.substring(0, 20) + '...',
        title: message.title,
        body: message.body,
        priority: message.priority,
        channelId: message.channelId
      });

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const result = await response.json();
      
      console.log(`📡 ${priority} priority notification response:`, {
        status: response.status,
        success: result.data?.[0]?.status === 'ok',
        result: result
      });

      return result.data?.[0]?.status === 'ok';
    } catch (error) {
      console.error(`❌ Error sending ${priority} priority notification:`, error);
      return false;
    }
  }
}

export default BackendNotificationService;
