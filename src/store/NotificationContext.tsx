import React, { createContext, useContext, useEffect, useRef } from 'react';
import { NavigationContainerRef } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import NotificationService, { NotificationData } from '../services/notificationService';
import NotificationPreferencesService from '../services/notificationPreferencesService';

interface NotificationContextType {
  initializeNotifications: () => Promise<void>;
  scheduleLocalNotification: (
    title: string,
    body: string,
    data?: NotificationData
  ) => Promise<string>;
  updateUserId: (userId: string) => Promise<void>;
  getStoredToken: () => Promise<any>;
  getNotificationPreferences: () => Promise<any>;
  updateNotificationPreferences: (updates: any) => Promise<any>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: React.ReactNode;
  navigationRef: React.RefObject<NavigationContainerRef<any>>;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
  navigationRef,
}) => {
  const notificationService = useRef(NotificationService.getInstance());
  const preferencesService = useRef(NotificationPreferencesService.getInstance());
  const notificationListener = useRef<Notifications.Subscription | undefined>(undefined);
  const responseListener = useRef<Notifications.Subscription | undefined>(undefined);

  useEffect(() => {
    // Set up notification listeners
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received in context:', notification);
      handleNotificationReceived(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response in context:', response);
      handleNotificationResponse(response);
    });

    // Cleanup on unmount
    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
      notificationService.current.cleanup();
    };
  }, []);

  const handleNotificationReceived = (notification: Notifications.Notification) => {
    const data = notification.request.content.data as unknown as NotificationData;
    
    // You can add custom logic here for handling notifications
    // For example, updating global state, showing in-app alerts, etc.
    console.log('Handling notification received:', data);
  };

  const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
    const data = response.notification.request.content.data as unknown as NotificationData;
    
    // Navigate to appropriate screen based on notification type
    if (navigationRef.current) {
      switch (data.type) {
        case 'ride_request':
          navigationRef.current.navigate('RideDetails', { rideId: data.rideId });
          break;
        case 'ride_accepted':
          navigationRef.current.navigate('LiveTracking', { rideId: data.rideId });
          break;
        case 'ride_arrived':
          navigationRef.current.navigate('LiveTracking', { rideId: data.rideId, driverArrived: true });
          break;
        case 'ride_started':
          navigationRef.current.navigate('RideInProgress', { rideId: data.rideId });
          break;
        case 'ride_completed':
          navigationRef.current.navigate('RideSummary', { rideId: data.rideId });
          break;
        case 'payment':
          navigationRef.current.navigate('Payment', { amount: data.amount });
          break;
        case 'promo':
          navigationRef.current.navigate('Offers');
          break;
        case 'chat':
          navigationRef.current.navigate('Chat', { rideId: data.rideId, senderId: (data as any).senderId });
          break;
        default:
          navigationRef.current.navigate('Home');
      }
    }
  };

  const initializeNotifications = async () => {
    try {
      await notificationService.current.initialize();
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    }
  };

  const scheduleLocalNotification = async (
    title: string,
    body: string,
    data?: NotificationData
  ): Promise<string> => {
    return await notificationService.current.scheduleLocalNotification(title, body, data);
  };

  const updateUserId = async (userId: string): Promise<void> => {
    await notificationService.current.updateUserId(userId);
  };

  const getStoredToken = async () => {
    try {
      return await notificationService.current.getStoredToken();
    } catch (error) {
      console.error('Failed to get stored token:', error);
      return null;
    }
  };

  const getNotificationPreferences = async () => {
    try {
      return await preferencesService.current.getPreferences();
    } catch (error) {
      console.error('Failed to get notification preferences:', error);
      return null;
    }
  };

  const updateNotificationPreferences = async (updates: any) => {
    try {
      return await preferencesService.current.updatePreferences(updates);
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
      throw error;
    }
  };

  const value: NotificationContextType = {
    initializeNotifications,
    scheduleLocalNotification,
    updateUserId,
    getStoredToken,
    getNotificationPreferences,
    updateNotificationPreferences,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
