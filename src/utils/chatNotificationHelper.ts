import BackendNotificationService from '../services/backendNotificationService';
import { useNotifications } from '../store/NotificationContext';

/**
 * Send chat notification to a user
 * This function can be used in your chat system to send push notifications
 */
export const sendChatNotification = async (
  recipientToken: string,
  chatData: {
    rideId: string;
    senderId: string;
    senderName: string;
    message: string;
    messageType?: 'text' | 'image' | 'location';
    priority?: 'high' | 'normal' | 'low';
    sound?: string;
    badge?: number;
  }
): Promise<boolean> => {
  try {
    console.log('🚀 Sending high-priority chat notification...');
    const backendService = BackendNotificationService.getInstance();
    
    // Always use high priority for chat notifications
    const enhancedChatData = {
      ...chatData,
      priority: 'high' as const,
      sound: 'default',
      badge: chatData.badge || 1
    };
    
    const success = await backendService.sendChatNotification(recipientToken, enhancedChatData);
    
    if (success) {
      console.log('✅ High-priority chat notification sent successfully');
    } else {
      console.log('❌ Failed to send high-priority chat notification');
    }
    
    return success;
  } catch (error) {
    console.error('❌ Error sending high-priority chat notification:', error);
    return false;
  }
};

/**
 * Hook for sending chat notifications
 * Use this in your chat components
 */
export const useChatNotifications = () => {
  const { getStoredToken } = useNotifications();

  const sendChatNotificationToCurrentUser = async (
    chatData: {
      rideId: string;
      senderId: string;
      senderName: string;
      message: string;
      messageType?: 'text' | 'image' | 'location';
      priority?: 'high' | 'normal' | 'low';
      sound?: string;
      badge?: number;
    }
  ): Promise<boolean> => {
    try {
      console.log('🚀 Getting token for high-priority chat notification...');
      const tokenData = await getStoredToken();
      if (!tokenData?.token) {
        console.log('⚠️ No push token available for high-priority chat notification');
        return false;
      }

      // Always use high priority for chat notifications
      const enhancedChatData = {
        ...chatData,
        priority: 'high' as const,
        sound: 'default',
        badge: chatData.badge || 1
      };

      console.log('🚀 Sending high-priority chat notification to current user...');
      return await sendChatNotification(tokenData.token, enhancedChatData);
    } catch (error) {
      console.error('❌ Error sending high-priority chat notification to current user:', error);
      return false;
    }
  };

  return {
    sendChatNotificationToCurrentUser,
    sendChatNotification
  };
};

/**
 * Example usage in your chat system:
 * 
 * // When receiving a message from driver (this happens automatically in ChatScreen)
 * const { sendChatNotificationToCurrentUser } = useChatNotifications();
 * 
 * await sendChatNotificationToCurrentUser({
 *   rideId: 'ride-123',
 *   senderId: 'driver-456',
 *   senderName: 'John D.',
 *   message: 'I\'m 5 minutes away',
 *   messageType: 'text'
 * });
 * 
 * // When sending message to driver (if you have driver's token)
 * await sendChatNotification(driverToken, {
 *   rideId: 'ride-123',
 *   senderId: 'user-789',
 *   senderName: 'Sarah',
 *   message: 'I\'ll be there in 2 minutes',
 *   messageType: 'text'
 * });
 * 
 * // REAL USAGE:
 * // Chat notifications are automatically sent when:
 * // 1. A message is received via Socket.IO in ChatScreen
 * // 2. A message is received via Socket.IO in ChatContext (global)
 * // 3. The test button is pressed in ChatScreen (for testing)
 * 
 * // The notification will show:
 * // Title: "New message from [Driver Name]"
 * // Body: [Actual message content from the driver]
 */
