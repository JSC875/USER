import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import NotificationService from '../../services/notificationService';

interface NotificationTestButtonProps {
  title?: string;
  style?: any;
}

const NotificationTestButton: React.FC<NotificationTestButtonProps> = ({
  title = 'Test Notification',
  style,
}) => {
  const notificationService = NotificationService.getInstance();

  const handleTestNotification = async () => {
    try {
      // Check if notifications are enabled
      const preferences = await notificationService.getNotificationPreferences();
      
      if (!preferences.pushNotifications) {
        Alert.alert(
          'Notifications Disabled',
          'Push notifications are currently disabled. Please enable them in settings to test notifications.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Schedule a test notification
      const identifier = await notificationService.scheduleLocalNotification(
        'Test Notification',
        'This is a test notification to verify that push notifications are working correctly.',
        {
          type: 'general',
          message: 'Test notification',
          title: 'Test Notification',
        },
        null, // Trigger immediately
        'normal'
      );

      if (identifier) {
        Alert.alert(
          'Test Notification Sent',
          'A test notification has been scheduled. You should receive it shortly.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Notification Not Sent',
          'The notification was not sent. This might be because notifications are disabled or there was an error.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error testing notification:', error);
      Alert.alert(
        'Error',
        'Failed to send test notification. Please check your notification settings.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <TouchableOpacity style={[styles.button, style]} onPress={handleTestNotification}>
      <Text style={styles.buttonText}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: Colors.white,
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
  },
});

export default NotificationTestButton;
