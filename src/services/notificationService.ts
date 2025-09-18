import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { config } from '../config/environment';
import NotificationPreferencesService from './notificationPreferencesService';
import { logger } from '../utils/logger';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface NotificationData {
  type: 'ride_request' | 'ride_accepted' | 'ride_arrived' | 'ride_started' | 'ride_completed' | 'payment' | 'payment_failed' | 'promo' | 'chat' | 'general';
  rideId?: string;
  driverId?: string;
  amount?: number;
  message: string;
  title: string;
}

export interface NotificationToken {
  token: string;
  platform: 'ios' | 'android' | 'web';
  deviceId: string;
  userId?: string;
  timestamp: number;
}

class NotificationService {
  private static instance: NotificationService;
  private isInitialized = false;
  private tokenRefreshInterval?: NodeJS.Timeout;
  private notificationListener?: Notifications.Subscription;
  private responseListener?: Notifications.Subscription;
  private preferencesService: NotificationPreferencesService;

  private constructor() {
    this.preferencesService = NotificationPreferencesService.getInstance();
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Initialize the notification service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize preferences service first
      await this.preferencesService.initialize();
      
      // Check if notifications are enabled by user
      const notificationsEnabled = await this.preferencesService.areNotificationsEnabled();
      
      if (!notificationsEnabled) {
        logger.debug('📵 Notifications disabled by user preference');
        this.isInitialized = true;
        return;
      }

      // Set up notification channels for better performance
      await this.setupNotificationChannels();
      
      // Request permissions
      const hasPermission = await this.requestPermissions();
      
      if (hasPermission) {
        // Get and store the push token
        await this.getAndStorePushToken();
        
        // Set up notification listeners
        this.setupNotificationListeners();
        
        // Set up token refresh interval (refresh every 24 hours)
        this.setupTokenRefresh();
        
        this.isInitialized = true;
        logger.debug('✅ Notification service initialized successfully');
      } else {
        logger.debug('❌ Notification permissions not granted');
      }
    } catch (error) {
      console.error('❌ Failed to initialize notification service:', error);
    }
  }

  /**
   * Set up notification channels for better Android performance
   */
  private async setupNotificationChannels(): Promise<void> {
    try {
      // Set up high-priority chat channel
      await Notifications.setNotificationChannelAsync('chat', {
        name: 'Chat Messages',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });

      // Set up default channel
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });

      logger.debug('✅ Notification channels set up successfully');
    } catch (error) {
      console.error('❌ Error setting up notification channels:', error);
    }
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted') {
          Alert.alert(
            'Notification Permission',
            'Please enable notifications to receive ride updates and important alerts.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Settings', onPress: () => this.openAppSettings() }
            ]
          );
          return false;
        }

        // For iOS, we need to request additional permissions
        if (Platform.OS === 'ios') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
          });
        }

        return true;
      } else {
        logger.debug('Must use physical device for Push Notifications');
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  /**
   * Get and store push token
   */
  async getAndStorePushToken(): Promise<string | null> {
    try {
      // Get project ID from Expo configuration
      const projectId = (Constants.expoConfig as any)?.projectId || (Constants.expoConfig as any)?.extra?.eas?.projectId;
      
      logger.debug('🔍 Notification Service: Project ID from config:', projectId);
      logger.debug('🔍 Notification Service: Constants.expoConfig?.projectId:', (Constants.expoConfig as any)?.projectId);
      logger.debug('🔍 Notification Service: Constants.expoConfig?.extra?.eas?.projectId:', (Constants.expoConfig as any)?.extra?.eas?.projectId);
      
      if (!projectId) {
        throw new Error('Expo project ID not found in configuration');
      }
      
      logger.debug('🔍 Notification Service: Attempting to get push token with project ID:', projectId);
      
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      });

      if (token) {
        const notificationToken: NotificationToken = {
          token: token.data,
          platform: Platform.OS as 'ios' | 'android' | 'web',
          deviceId: Device.osInternalBuildId || Device.deviceName || 'unknown',
          timestamp: Date.now(),
        };

        // Store token locally
        await this.storeTokenLocally(notificationToken);
        
        // Send token to server
        await this.sendTokenToServer(notificationToken);
        
        logger.debug('✅ Push token obtained and stored:', token.data);
        return token.data;
      }
    } catch (error) {
      console.error('❌ Error getting push token:', error);
      if (error instanceof Error) {
        console.error('❌ Error message:', error.message);
        console.error('❌ Error stack:', error.stack);
      }
    }
    return null;
  }

  /**
   * Store token locally
   */
  private async storeTokenLocally(token: NotificationToken): Promise<void> {
    try {
      await AsyncStorage.setItem('pushNotificationToken', JSON.stringify(token));
    } catch (error) {
      console.error('Error storing token locally:', error);
    }
  }

  /**
   * Send token to server
   */
  private async sendTokenToServer(token: NotificationToken): Promise<void> {
    try {
      const response = await fetch(`${config.api.baseUrl}/api/notifications/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(token),
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      logger.debug('Token sent to server successfully');
    } catch (error) {
      console.error('Error sending token to server:', error);
    }
  }

  /**
   * Set up notification listeners
   */
  private setupNotificationListeners(): void {
    // Handle notification received while app is running
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      logger.debug('Notification received:', notification);
      this.handleNotificationReceived(notification);
    });

    // Handle notification tapped
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      logger.debug('Notification response:', response);
      this.handleNotificationResponse(response);
    });

    // Store listeners for cleanup
    this.notificationListener = notificationListener;
    this.responseListener = responseListener;
  }

  /**
   * Handle notification received
   */
  private handleNotificationReceived(notification: Notifications.Notification): void {
    const data = notification.request.content.data as unknown as NotificationData;
    
    // Handle different notification types
    switch (data.type) {
      case 'ride_request':
        this.handleRideRequestNotification(data);
        break;
      case 'ride_accepted':
        this.handleRideAcceptedNotification(data);
        break;
      case 'ride_arrived':
        this.handleDriverArrivedNotification(data);
        break;
      case 'ride_started':
        this.handleRideStartedNotification(data);
        break;
      case 'ride_completed':
        this.handleRideCompletedNotification(data);
        break;
      case 'payment':
        this.handlePaymentNotification(data);
        break;
      case 'promo':
        this.handlePromoNotification(data);
        break;
      case 'chat':
        this.handleChatNotification(data);
        break;
      default:
        this.handleGeneralNotification(data);
    }
  }

  /**
   * Handle notification response (when user taps notification)
   */
  private handleNotificationResponse(response: Notifications.NotificationResponse): void {
    const data = response.notification.request.content.data as unknown as NotificationData;
    
    // Navigate to appropriate screen based on notification type
    switch (data.type) {
      case 'ride_request':
        // Navigate to ride details
        break;
      case 'ride_accepted':
        // Navigate to live tracking
        break;
      case 'ride_completed':
        // Navigate to ride summary
        break;
      case 'payment':
        // Navigate to payment screen
        break;
      default:
        // Navigate to home or general screen
        break;
    }
  }

  /**
   * Handle ride request notification
   */
  private handleRideRequestNotification(data: NotificationData): void {
    // Play sound, show alert, update UI
    logger.debug('Ride request notification:', data);
  }

  /**
   * Handle ride accepted notification
   */
  private handleRideAcceptedNotification(data: NotificationData): void {
    logger.debug('Ride accepted notification:', data);
  }

  /**
   * Handle driver arrived notification
   */
  private handleDriverArrivedNotification(data: NotificationData): void {
    logger.debug('Driver arrived notification:', data);
  }

  /**
   * Handle ride started notification
   */
  private handleRideStartedNotification(data: NotificationData): void {
    logger.debug('Ride started notification:', data);
  }

  /**
   * Handle ride completed notification
   */
  private handleRideCompletedNotification(data: NotificationData): void {
    logger.debug('Ride completed notification:', data);
  }

  /**
   * Handle payment notification
   */
  private handlePaymentNotification(data: NotificationData): void {
    logger.debug('Payment notification:', data);
  }

  /**
   * Handle promo notification
   */
  private handlePromoNotification(data: NotificationData): void {
    logger.debug('Promo notification:', data);
  }

  /**
   * Handle chat notification
   */
  private handleChatNotification(data: NotificationData): void {
    logger.debug('Chat notification:', data);
  }

  /**
   * Handle general notification
   */
  private handleGeneralNotification(data: NotificationData): void {
    logger.debug('General notification:', data);
  }

  /**
   * Set up token refresh interval
   */
  private setupTokenRefresh(): void {
    // Refresh token every 24 hours
    this.tokenRefreshInterval = setInterval(async () => {
      await this.getAndStorePushToken();
    }, 24 * 60 * 60 * 1000) as unknown as NodeJS.Timeout;
  }

  /**
   * Schedule local notification
   */
  async scheduleLocalNotification(
    title: string,
    body: string,
    data?: NotificationData,
    trigger?: Notifications.NotificationTriggerInput,
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): Promise<string> {
    try {
      // Check if notifications are enabled by user
      const notificationsEnabled = await this.preferencesService.areNotificationsEnabled();
      
      if (!notificationsEnabled) {
        logger.debug('📵 Notification not scheduled - disabled by user preference');
        return '';
      }

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          ...(data && { data: data as unknown as Record<string, unknown> }),
          sound: true,
          priority: priority === 'high' ? Notifications.AndroidNotificationPriority.HIGH : Notifications.AndroidNotificationPriority.DEFAULT,
          // Add urgency for high priority notifications
          ...(priority === 'high' && {
            autoDismiss: false,
            sticky: true,
          }),
        },
        trigger: trigger || null,
      });
      
      logger.debug(`✅ ${priority} priority local notification scheduled:`, identifier);
      return identifier;
    } catch (error) {
      console.error(`❌ Error scheduling ${priority} priority local notification:`, error);
      throw error;
    }
  }

  /**
   * Cancel scheduled notification
   */
  async cancelScheduledNotification(identifier: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
      logger.debug('Scheduled notification cancelled:', identifier);
    } catch (error) {
      console.error('Error cancelling scheduled notification:', error);
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllScheduledNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      logger.debug('All scheduled notifications cancelled');
    } catch (error) {
      console.error('Error cancelling all scheduled notifications:', error);
    }
  }

  /**
   * Get stored token
   */
  async getStoredToken(): Promise<NotificationToken | null> {
    try {
      const tokenString = await AsyncStorage.getItem('pushNotificationToken');
      return tokenString ? JSON.parse(tokenString) : null;
    } catch (error) {
      console.error('Error getting stored token:', error);
      return null;
    }
  }

  /**
   * Update user ID for the token
   */
  async updateUserId(userId: string): Promise<void> {
    try {
      const token = await this.getStoredToken();
      if (token) {
        token.userId = userId;
        await this.storeTokenLocally(token);
        await this.sendTokenToServer(token);
      }
    } catch (error) {
      console.error('Error updating user ID:', error);
    }
  }

  /**
   * Open app settings
   */
  private openAppSettings(): void {
    // This would typically use Linking to open app settings
    // For now, we'll just log it
    logger.debug('Should open app settings');
  }

  /**
   * Handle notification preference changes
   */
  async onNotificationPreferenceChanged(enabled: boolean): Promise<void> {
    try {
      if (enabled) {
        // Re-initialize the service if notifications are enabled
        if (!this.isInitialized) {
          await this.initialize();
        }
      } else {
        // Cancel all scheduled notifications if disabled
        await this.cancelAllScheduledNotifications();
      }
    } catch (error) {
      console.error('Error handling notification preference change:', error);
    }
  }

  /**
   * Get notification preferences
   */
  async getNotificationPreferences() {
    return this.preferencesService.getPreferences();
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(updates: Partial<import('./notificationPreferencesService').NotificationPreferences>) {
    return this.preferencesService.updatePreferences(updates);
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval);
    }
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }
}

export default NotificationService;
