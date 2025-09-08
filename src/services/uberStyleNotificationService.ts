import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { config } from '../config/environment';

// Configure notification behavior for rich notifications
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data as any;
    
    // Handle different notification types
    if (data?.type === 'ride_progress') {
      return {
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      };
    }
    
    if (data?.type === 'pin_confirmation') {
      return {
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      };
    }
    
    return {
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    };
  },
});

export interface DriverInfo {
  id: string;
  name: string;
  phone: string;
  bikeNumber: string;
  bikeModel: string;
  bikeImage?: string;
  rating: number;
  profileImage?: string;
}

export interface RideProgressData {
  rideId: string;
  driverInfo: DriverInfo;
  pickupLocation: string;
  dropoffLocation: string;
  eta: string; // e.g., "2 min", "Arriving now"
  distance: string; // e.g., "0.5 km away"
  progress: number; // 0-100 percentage
  status: 'accepted' | 'en_route' | 'arrived' | 'pickup_complete' | 'in_progress' | 'completed';
  pinCode?: string;
  fare?: number;
}

export interface NotificationAction {
  type: 'call' | 'cancel' | 'message' | 'share_location' | 'confirm_pin';
  label: string;
  icon?: string;
  action?: () => void;
}

export interface RichNotificationData {
  type: 'ride_progress' | 'pin_confirmation' | 'ride_completed' | 'payment' | 'general';
  rideProgress?: RideProgressData;
  actions?: NotificationAction[];
  image?: string;
  sound?: string;
  priority?: 'high' | 'normal' | 'low';
  category?: string;
  threadId?: string;
}

export interface NotificationToken {
  token: string;
  platform: 'ios' | 'android' | 'web';
  deviceId: string;
  userId?: string;
  timestamp: number;
}

class UberStyleNotificationService {
  private static instance: UberStyleNotificationService;
  private isInitialized = false;
  private tokenRefreshInterval?: NodeJS.Timeout;
  private notificationListener?: Notifications.Subscription;
  private responseListener?: Notifications.Subscription;
  private activeRideNotifications: Map<string, string> = new Map(); // rideId -> notificationId
  private notificationCallbacks: Map<string, (data: any) => void> = new Map();

  private constructor() {}

  static getInstance(): UberStyleNotificationService {
    if (!UberStyleNotificationService.instance) {
      UberStyleNotificationService.instance = new UberStyleNotificationService();
    }
    return UberStyleNotificationService.instance;
  }

  /**
   * Initialize the notification service with Uber-style features
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Set up notification channels for rich notifications
      await this.setupRichNotificationChannels();
      
      // Request permissions
      const hasPermission = await this.requestPermissions();
      
      if (hasPermission) {
        // Get and store the push token
        await this.getAndStorePushToken();
        
        // Set up notification listeners
        this.setupNotificationListeners();
        
        // Set up token refresh interval
        this.setupTokenRefresh();
        
        this.isInitialized = true;
        console.log('✅ Uber-style notification service initialized successfully');
      } else {
        console.log('❌ Notification permissions not granted');
      }
    } catch (error) {
      console.error('❌ Failed to initialize Uber-style notification service:', error);
    }
  }

  /**
   * Set up rich notification channels for Android
   */
  private async setupRichNotificationChannels(): Promise<void> {
    if (Platform.OS !== 'android') return;

    try {
      // High-priority ride progress channel
      await Notifications.setNotificationChannelAsync('ride_progress', {
        name: 'Ride Progress Updates',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B35',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });

      // PIN confirmation channel
      await Notifications.setNotificationChannelAsync('pin_confirmation', {
        name: 'Ride PIN Confirmation',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: '#4CAF50',
        sound: 'default',
        enableVibrate: true,
        showBadge: false,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });

      // General notifications channel
      await Notifications.setNotificationChannelAsync('general', {
        name: 'General Notifications',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250],
        lightColor: '#2196F3',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });

      console.log('✅ Rich notification channels set up successfully');
    } catch (error) {
      console.error('❌ Failed to set up notification channels:', error);
    }
  }

  /**
   * Request notification permissions
   */
  private async requestPermissions(): Promise<boolean> {
    try {
      if (!Device.isDevice) {
        console.log('⚠️ Not running on a device, skipping permission request');
        return false;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowAnnouncements: true,
            allowCriticalAlerts: true,
            provideAppNotificationSettings: true,
          },
        });
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        Alert.alert(
          'Notification Permission Required',
          'Please enable notifications to receive ride updates and important alerts.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => Linking.openSettings() },
          ]
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Error requesting notification permissions:', error);
      return false;
    }
  }

  /**
   * Get and store push token
   */
  private async getAndStorePushToken(): Promise<void> {
    try {
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.EXPO_PROJECT_ID || process.env.EXPO_PROJECT_ID,
      });

      if (token) {
        const deviceId = Device.osInternalBuildId || Device.deviceName || 'unknown';
        const tokenData: NotificationToken = {
          token: token.data,
          platform: Platform.OS as 'ios' | 'android' | 'web',
          deviceId,
          timestamp: Date.now(),
        };

        await AsyncStorage.setItem('pushToken', JSON.stringify(tokenData));
        console.log('✅ Push token stored successfully:', token.data);
        
        // Send token to backend
        await this.sendTokenToBackend(tokenData);
      }
    } catch (error) {
      console.error('❌ Error getting push token:', error);
    }
  }

  /**
   * Send token to backend
   */
  private async sendTokenToBackend(tokenData: NotificationToken): Promise<void> {
    try {
      const response = await fetch(`${config.API_BASE_URL}/api/notifications/register-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
        body: JSON.stringify(tokenData),
      });

      if (response.ok) {
        console.log('✅ Token sent to backend successfully');
      } else {
        console.error('❌ Failed to send token to backend:', response.status);
      }
    } catch (error) {
      console.error('❌ Error sending token to backend:', error);
    }
  }

  /**
   * Get authentication token
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('authToken');
    } catch (error) {
      console.error('❌ Error getting auth token:', error);
      return null;
    }
  }

  /**
   * Set up notification listeners
   */
  private setupNotificationListeners(): void {
    // Listen for notifications received while app is in foreground
    this.notificationListener = Notifications.addNotificationReceivedListener(
      this.handleNotificationReceived.bind(this)
    );

    // Listen for notification responses (user taps notification)
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      this.handleNotificationResponse.bind(this)
    );

    console.log('✅ Notification listeners set up successfully');
  }

  /**
   * Handle notification received
   */
  private handleNotificationReceived(notification: Notifications.Notification): void {
    const data = notification.request.content.data as RichNotificationData;
    console.log('📱 Notification received:', data);

    // Handle different notification types
    switch (data.type) {
      case 'ride_progress':
        this.handleRideProgressNotification(data);
        break;
      case 'pin_confirmation':
        this.handlePinConfirmationNotification(data);
        break;
      case 'ride_completed':
        this.handleRideCompletedNotification(data);
        break;
      default:
        console.log('📱 General notification received:', data);
    }

    // Trigger callback if registered
    const callback = this.notificationCallbacks.get(data.type || 'general');
    if (callback) {
      callback(data);
    }
  }

  /**
   * Handle notification response (user interaction)
   */
  private handleNotificationResponse(response: Notifications.NotificationResponse): void {
    const data = response.notification.request.content.data as RichNotificationData;
    const actionIdentifier = response.actionIdentifier;

    console.log('👆 Notification response:', { data, actionIdentifier });

    // Handle action buttons
    if (actionIdentifier === 'call') {
      this.handleCallAction(data);
    } else if (actionIdentifier === 'cancel') {
      this.handleCancelAction(data);
    } else if (actionIdentifier === 'message') {
      this.handleMessageAction(data);
    } else if (actionIdentifier === 'confirm_pin') {
      this.handlePinConfirmationAction(data);
    } else {
      // Default tap action
      this.handleDefaultTapAction(data);
    }
  }

  /**
   * Handle ride progress notification
   */
  private handleRideProgressNotification(data: RichNotificationData): void {
    if (!data.rideProgress) return;

    const { rideProgress } = data;
    console.log('🚗 Ride progress notification:', rideProgress);

    // Update active ride notification
    this.activeRideNotifications.set(rideProgress.rideId, data.rideProgress.rideId);

    // Trigger ride progress callback
    const callback = this.notificationCallbacks.get('ride_progress');
    if (callback) {
      callback(rideProgress);
    }
  }

  /**
   * Handle PIN confirmation notification
   */
  private handlePinConfirmationNotification(data: RichNotificationData): void {
    if (!data.rideProgress?.pinCode) return;

    console.log('🔐 PIN confirmation notification:', data.rideProgress.pinCode);

    // Trigger PIN confirmation callback
    const callback = this.notificationCallbacks.get('pin_confirmation');
    if (callback) {
      callback(data.rideProgress);
    }
  }

  /**
   * Handle ride completed notification
   */
  private handleRideCompletedNotification(data: RichNotificationData): void {
    if (!data.rideProgress?.rideId) return;

    console.log('✅ Ride completed notification:', data.rideProgress.rideId);

    // Remove from active notifications
    this.activeRideNotifications.delete(data.rideProgress.rideId);

    // Trigger ride completed callback
    const callback = this.notificationCallbacks.get('ride_completed');
    if (callback) {
      callback(data.rideProgress);
    }
  }

  /**
   * Handle call action
   */
  private handleCallAction(data: RichNotificationData): void {
    if (!data.rideProgress?.driverInfo?.phone) return;

    const phoneNumber = data.rideProgress.driverInfo.phone;
    const url = Platform.OS === 'ios' ? `tel:${phoneNumber}` : `tel:${phoneNumber}`;
    
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        console.error('❌ Cannot open phone app');
      }
    });
  }

  /**
   * Handle cancel action
   */
  private handleCancelAction(data: RichNotificationData): void {
    if (!data.rideProgress?.rideId) return;

    console.log('❌ Cancel ride action triggered for:', data.rideProgress.rideId);

    // Trigger cancel callback
    const callback = this.notificationCallbacks.get('cancel_ride');
    if (callback) {
      callback(data.rideProgress);
    }
  }

  /**
   * Handle message action
   */
  private handleMessageAction(data: RichNotificationData): void {
    if (!data.rideProgress?.rideId) return;

    console.log('💬 Message action triggered for:', data.rideProgress.rideId);

    // Trigger message callback
    const callback = this.notificationCallbacks.get('message_driver');
    if (callback) {
      callback(data.rideProgress);
    }
  }

  /**
   * Handle PIN confirmation action
   */
  private handlePinConfirmationAction(data: RichNotificationData): void {
    if (!data.rideProgress?.pinCode) return;

    console.log('🔐 PIN confirmation action triggered:', data.rideProgress.pinCode);

    // Trigger PIN confirmation callback
    const callback = this.notificationCallbacks.get('confirm_pin');
    if (callback) {
      callback(data.rideProgress);
    }
  }

  /**
   * Handle default tap action
   */
  private handleDefaultTapAction(data: RichNotificationData): void {
    console.log('👆 Default tap action for:', data.type);

    // Trigger default tap callback
    const callback = this.notificationCallbacks.get('default_tap');
    if (callback) {
      callback(data);
    }
  }

  /**
   * Send rich ride progress notification
   */
  async sendRideProgressNotification(rideProgress: RideProgressData): Promise<string> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: this.generateRideProgressTitle(rideProgress),
          body: this.generateRideProgressBody(rideProgress),
          data: {
            type: 'ride_progress',
            rideProgress,
            actions: this.generateRideActions(rideProgress),
            category: 'ride_progress',
            threadId: rideProgress.rideId,
          } as RichNotificationData,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
          channelId: 'ride_progress',
          autoDismiss: false,
          sticky: true,
        },
        trigger: null, // Send immediately
      });

      // Store notification ID for updates
      this.activeRideNotifications.set(rideProgress.rideId, notificationId);

      console.log('✅ Ride progress notification sent:', notificationId);
      return notificationId;
    } catch (error) {
      console.error('❌ Error sending ride progress notification:', error);
      throw error;
    }
  }

  /**
   * Update existing ride progress notification
   */
  async updateRideProgressNotification(rideProgress: RideProgressData): Promise<void> {
    try {
      const existingNotificationId = this.activeRideNotifications.get(rideProgress.rideId);
      
      if (existingNotificationId) {
        // Cancel existing notification
        await Notifications.cancelScheduledNotificationAsync(existingNotificationId);
      }

      // Send updated notification
      await this.sendRideProgressNotification(rideProgress);
      
      console.log('✅ Ride progress notification updated for:', rideProgress.rideId);
    } catch (error) {
      console.error('❌ Error updating ride progress notification:', error);
    }
  }

  /**
   * Send PIN confirmation notification
   */
  async sendPinConfirmationNotification(rideProgress: RideProgressData): Promise<string> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Confirm Your Ride',
          body: `Enter PIN ${rideProgress.pinCode} to start your ride with ${rideProgress.driverInfo.name}`,
          data: {
            type: 'pin_confirmation',
            rideProgress,
            actions: [
              {
                type: 'confirm_pin',
                label: 'Confirm PIN',
                icon: 'checkmark-circle',
              },
              {
                type: 'call',
                label: 'Call Driver',
                icon: 'phone',
              },
            ],
            category: 'pin_confirmation',
            threadId: rideProgress.rideId,
          } as RichNotificationData,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
          channelId: 'pin_confirmation',
          autoDismiss: false,
          sticky: true,
        },
        trigger: null, // Send immediately
      });

      console.log('✅ PIN confirmation notification sent:', notificationId);
      return notificationId;
    } catch (error) {
      console.error('❌ Error sending PIN confirmation notification:', error);
      throw error;
    }
  }

  /**
   * Send ride completed notification
   */
  async sendRideCompletedNotification(rideProgress: RideProgressData): Promise<string> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Ride Completed!',
          body: `Your ride with ${rideProgress.driverInfo.name} has been completed. Fare: ₹${rideProgress.fare}`,
          data: {
            type: 'ride_completed',
            rideProgress,
            category: 'general',
            threadId: rideProgress.rideId,
          } as RichNotificationData,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.DEFAULT,
          channelId: 'general',
          autoDismiss: true,
        },
        trigger: null, // Send immediately
      });

      // Remove from active notifications
      this.activeRideNotifications.delete(rideProgress.rideId);

      console.log('✅ Ride completed notification sent:', notificationId);
      return notificationId;
    } catch (error) {
      console.error('❌ Error sending ride completed notification:', error);
      throw error;
    }
  }

  /**
   * Generate ride progress title
   */
  private generateRideProgressTitle(rideProgress: RideProgressData): string {
    switch (rideProgress.status) {
      case 'accepted':
        return `${rideProgress.driverInfo.name} accepted your ride`;
      case 'en_route':
        return `Pickup in ${rideProgress.eta}`;
      case 'arrived':
        return `${rideProgress.driverInfo.name} has arrived`;
      case 'pickup_complete':
        return 'Ride started';
      case 'in_progress':
        return `En route to destination`;
      case 'completed':
        return 'Ride completed';
      default:
        return 'Ride update';
    }
  }

  /**
   * Generate ride progress body
   */
  private generateRideProgressBody(rideProgress: RideProgressData): string {
    const { driverInfo, distance, bikeNumber, bikeModel } = rideProgress;
    
    switch (rideProgress.status) {
      case 'accepted':
        return `${driverInfo.name} • ${bikeNumber} • ${bikeModel}`;
      case 'en_route':
        return `${driverInfo.name} • ${distance} away • ${bikeNumber}`;
      case 'arrived':
        return `${driverInfo.name} is waiting at pickup location`;
      case 'pickup_complete':
        return `Ride started with ${driverInfo.name}`;
      case 'in_progress':
        return `En route with ${driverInfo.name}`;
      case 'completed':
        return `Ride completed with ${driverInfo.name}`;
      default:
        return `${driverInfo.name} • ${bikeNumber}`;
    }
  }

  /**
   * Generate ride actions
   */
  private generateRideActions(rideProgress: RideProgressData): NotificationAction[] {
    const actions: NotificationAction[] = [
      {
        type: 'call',
        label: 'Call',
        icon: 'phone',
      },
    ];

    // Add cancel action only if ride is not completed
    if (rideProgress.status !== 'completed') {
      actions.push({
        type: 'cancel',
        label: 'Cancel',
        icon: 'close',
      });
    }

    // Add message action for active rides
    if (['en_route', 'arrived', 'pickup_complete', 'in_progress'].includes(rideProgress.status)) {
      actions.push({
        type: 'message',
        label: 'Message',
        icon: 'chatbubble',
      });
    }

    return actions;
  }

  /**
   * Register notification callback
   */
  registerCallback(type: string, callback: (data: any) => void): void {
    this.notificationCallbacks.set(type, callback);
  }

  /**
   * Unregister notification callback
   */
  unregisterCallback(type: string): void {
    this.notificationCallbacks.delete(type);
  }

  /**
   * Trigger notification callback
   */
  triggerCallback(type: string, data: any): void {
    const callback = this.notificationCallbacks.get(type);
    if (callback) {
      try {
        callback(data);
      } catch (error) {
        console.error(`❌ Error in notification callback for ${type}:`, error);
      }
    }
  }

  /**
   * Set up token refresh interval
   */
  private setupTokenRefresh(): void {
    // Refresh token every 24 hours
    this.tokenRefreshInterval = setInterval(async () => {
      await this.getAndStorePushToken();
    }, 24 * 60 * 60 * 1000);
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval);
    }
    this.notificationCallbacks.clear();
    this.activeRideNotifications.clear();
  }

  /**
   * Get stored push token
   */
  async getStoredToken(): Promise<NotificationToken | null> {
    try {
      const tokenString = await AsyncStorage.getItem('pushToken');
      return tokenString ? JSON.parse(tokenString) : null;
    } catch (error) {
      console.error('❌ Error getting stored token:', error);
      return null;
    }
  }

  /**
   * Update user ID for notifications
   */
  async updateUserId(userId: string): Promise<void> {
    try {
      const tokenData = await this.getStoredToken();
      if (tokenData) {
        tokenData.userId = userId;
        await AsyncStorage.setItem('pushToken', JSON.stringify(tokenData));
        await this.sendTokenToBackend(tokenData);
      }
    } catch (error) {
      console.error('❌ Error updating user ID:', error);
    }
  }
}

export default UberStyleNotificationService;
