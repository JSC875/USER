import { config } from '../config/environment';
import { NotificationToken, NotificationData } from './notificationService';

export interface PushNotificationPayload {
  to: string | string[]; // Expo push token(s)
  title: string;
  body: string;
  data?: NotificationData;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string;
  categoryId?: string;
  mutableContent?: boolean;
  priority?: 'default' | 'normal' | 'high';
  subtitle?: string;
  ttl?: number;
}

export interface NotificationTemplate {
  id: string;
  title: string;
  body: string;
  data?: NotificationData;
}

class NotificationApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.api.baseUrl;
  }

  /**
   * Register a device token with the server
   */
  async registerDeviceToken(token: NotificationToken): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/notifications/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
        body: JSON.stringify(token),
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error('Error registering device token:', error);
      return false;
    }
  }

  /**
   * Unregister a device token from the server
   */
  async unregisterDeviceToken(token: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/notifications/unregister`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error('Error unregistering device token:', error);
      return false;
    }
  }

  /**
   * Send push notification to specific user(s)
   */
  async sendPushNotification(
    userIds: string[],
    title: string,
    body: string,
    data?: NotificationData
  ): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/notifications/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
        body: JSON.stringify({
          userIds,
          title,
          body,
          data,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error('Error sending push notification:', error);
      return false;
    }
  }

  /**
   * Send push notification using Expo's push service directly
   */
  async sendExpoPushNotification(payload: PushNotificationPayload): Promise<boolean> {
    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Expo push service responded with ${response.status}`);
      }

      const result = await response.json();
      
      // Check if there were any errors
      if (result.errors && result.errors.length > 0) {
        console.error('Expo push notification errors:', result.errors);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error sending Expo push notification:', error);
      return false;
    }
  }

  /**
   * Get notification templates
   */
  async getNotificationTemplates(): Promise<NotificationTemplate[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/notifications/templates`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching notification templates:', error);
      return [];
    }
  }

  /**
   * Send ride-specific notifications
   */
  async sendRideNotification(
    rideId: string,
    type: 'ride_request' | 'ride_accepted' | 'ride_started' | 'ride_completed',
    userId: string,
    additionalData?: any
  ): Promise<boolean> {
    const templates = {
      ride_request: {
        title: 'New Ride Request',
        body: 'You have a new ride request',
      },
      ride_accepted: {
        title: 'Ride Accepted!',
        body: 'Your ride has been accepted by a driver',
      },
      ride_started: {
        title: 'Ride Started',
        body: 'Your ride has started. Enjoy your journey!',
      },
      ride_completed: {
        title: 'Ride Completed',
        body: 'Your ride has been completed. Please rate your driver.',
      },
    };

    const template = templates[type];
    const data: NotificationData = {
      type,
      rideId,
      title: template.title,
      message: template.body,
      ...additionalData,
    };

    return await this.sendPushNotification([userId], template.title, template.body, data);
  }

  /**
   * Send payment notification
   */
  async sendPaymentNotification(
    userId: string,
    amount: number,
    status: 'success' | 'failed' | 'pending'
  ): Promise<boolean> {
    const templates = {
      success: {
        title: 'Payment Successful',
        body: `Your payment of $${amount.toFixed(2)} has been processed successfully`,
      },
      failed: {
        title: 'Payment Failed',
        body: `Your payment of $${amount.toFixed(2)} has failed. Please try again.`,
      },
      pending: {
        title: 'Payment Pending',
        body: `Your payment of $${amount.toFixed(2)} is being processed.`,
      },
    };

    const template = templates[status];
    const data: NotificationData = {
      type: 'payment',
      amount,
      title: template.title,
      message: template.body,
    };

    return await this.sendPushNotification([userId], template.title, template.body, data);
  }

  /**
   * Send promotional notification
   */
  async sendPromoNotification(
    userIds: string[],
    title: string,
    body: string,
    promoCode?: string
  ): Promise<boolean> {
    const data: NotificationData = {
      type: 'promo',
      title,
      message: body,
    };

    return await this.sendPushNotification(userIds, title, body, data);
  }

  /**
   * Get user's notification preferences
   */
  async getNotificationPreferences(userId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/notifications/preferences/${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      return null;
    }
  }

  /**
   * Update user's notification preferences
   */
  async updateNotificationPreferences(
    userId: string,
    preferences: any
  ): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/notifications/preferences/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      return false;
    }
  }

  /**
   * Get authentication token (implement based on your auth system)
   */
  private async getAuthToken(): Promise<string> {
    // This should be implemented based on your authentication system
    // For example, if using Clerk:
    // const { getToken } = useAuth();
    // return await getToken();
    
    // For now, return empty string
    return '';
  }
}

export default NotificationApiService;
