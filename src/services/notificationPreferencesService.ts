import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { logger } from '../utils/logger';

export interface NotificationPreferences {
  pushNotifications: boolean;
  locationServices: boolean;
  autoPayment: boolean;
  shareData: boolean;
  lastUpdated: number;
}

class NotificationPreferencesService {
  private static instance: NotificationPreferencesService;
  private static readonly STORAGE_KEY = 'notification_preferences';
  private static readonly DEFAULT_PREFERENCES: NotificationPreferences = {
    pushNotifications: true, // Default to enabled
    locationServices: true,
    autoPayment: false,
    shareData: true,
    lastUpdated: Date.now(),
  };

  private constructor() {}

  static getInstance(): NotificationPreferencesService {
    if (!NotificationPreferencesService.instance) {
      NotificationPreferencesService.instance = new NotificationPreferencesService();
    }
    return NotificationPreferencesService.instance;
  }

  /**
   * Get current notification preferences
   */
  async getPreferences(): Promise<NotificationPreferences> {
    try {
      const stored = await AsyncStorage.getItem(NotificationPreferencesService.STORAGE_KEY);
      if (stored) {
        const preferences = JSON.parse(stored) as NotificationPreferences;
        return {
          ...NotificationPreferencesService.DEFAULT_PREFERENCES,
          ...preferences,
        };
      }
      return { ...NotificationPreferencesService.DEFAULT_PREFERENCES };
    } catch (error) {
      console.error('Error getting notification preferences:', error);
      return { ...NotificationPreferencesService.DEFAULT_PREFERENCES };
    }
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(updates: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    try {
      const currentPreferences = await this.getPreferences();
      const newPreferences: NotificationPreferences = {
        ...currentPreferences,
        ...updates,
        lastUpdated: Date.now(),
      };

      await AsyncStorage.setItem(
        NotificationPreferencesService.STORAGE_KEY,
        JSON.stringify(newPreferences)
      );

      // Apply notification settings immediately
      await this.applyNotificationSettings(newPreferences);

      logger.debug('✅ Notification preferences updated:', newPreferences);
      return newPreferences;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  }

  /**
   * Update a specific preference
   */
  async updatePreference<K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ): Promise<NotificationPreferences> {
    return this.updatePreferences({ [key]: value });
  }

  /**
   * Apply notification settings to the system
   */
  private async applyNotificationSettings(preferences: NotificationPreferences): Promise<void> {
    try {
      if (preferences.pushNotifications) {
        // Enable notifications
        await this.enableNotifications();
      } else {
        // Disable notifications
        await this.disableNotifications();
      }
    } catch (error) {
      console.error('Error applying notification settings:', error);
    }
  }

  /**
   * Enable notifications
   */
  private async enableNotifications(): Promise<void> {
    try {
      // Request permissions if not already granted
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        if (newStatus !== 'granted') {
          console.warn('Notification permissions not granted');
          return;
        }
      }

      // Set notification handler to show notifications
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });

      logger.debug('✅ Notifications enabled');
    } catch (error) {
      console.error('Error enabling notifications:', error);
    }
  }

  /**
   * Disable notifications
   */
  private async disableNotifications(): Promise<void> {
    try {
      // Set notification handler to not show notifications
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: false,
          shouldShowList: false,
          shouldPlaySound: false,
          shouldSetBadge: false,
        }),
      });

      // Cancel all scheduled notifications
      await Notifications.cancelAllScheduledNotificationsAsync();

      logger.debug('✅ Notifications disabled');
    } catch (error) {
      console.error('Error disabling notifications:', error);
    }
  }

  /**
   * Check if notifications are enabled
   */
  async areNotificationsEnabled(): Promise<boolean> {
    try {
      const preferences = await this.getPreferences();
      return preferences.pushNotifications;
    } catch (error) {
      console.error('Error checking notification status:', error);
      return true; // Default to enabled
    }
  }

  /**
   * Reset to default preferences
   */
  async resetToDefaults(): Promise<NotificationPreferences> {
    try {
      await AsyncStorage.removeItem(NotificationPreferencesService.STORAGE_KEY);
      const defaultPreferences = { ...NotificationPreferencesService.DEFAULT_PREFERENCES };
      await this.applyNotificationSettings(defaultPreferences);
      return defaultPreferences;
    } catch (error) {
      console.error('Error resetting preferences:', error);
      throw error;
    }
  }

  /**
   * Initialize preferences on app start
   */
  async initialize(): Promise<void> {
    try {
      const preferences = await this.getPreferences();
      await this.applyNotificationSettings(preferences);
      logger.debug('✅ Notification preferences initialized');
    } catch (error) {
      console.error('Error initializing notification preferences:', error);
    }
  }
}

export default NotificationPreferencesService;
