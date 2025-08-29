import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import UberStyleNotificationService, {
  RideProgressData,
  DriverInfo,
} from '../services/uberStyleNotificationService';
import RideNotificationSocketService from '../services/rideNotificationSocketService';

const { width } = Dimensions.get('window');

interface RichNotificationHandlerProps {
  rideId?: string;
  onCallDriver?: (driverInfo: DriverInfo) => void;
  onCancelRide?: (rideId: string) => void;
  onMessageDriver?: (rideId: string) => void;
  onConfirmPin?: (rideId: string, pinCode: string) => void;
  onRideCompleted?: (rideId: string) => void;
}

const RichNotificationHandler: React.FC<RichNotificationHandlerProps> = ({
  rideId,
  onCallDriver,
  onCancelRide,
  onMessageDriver,
  onConfirmPin,
  onRideCompleted,
}) => {
  const [currentRide, setCurrentRide] = useState<RideProgressData | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const slideAnimation = useRef(new Animated.Value(-100)).current;
  const notificationService = useRef(UberStyleNotificationService.getInstance());

  useEffect(() => {
    initializeNotificationService();
    return () => {
      cleanupNotificationService();
    };
  }, []);

  useEffect(() => {
    if (currentRide) {
      animateProgress(currentRide.progress);
      slideInNotification();
    }
  }, [currentRide]);

  const initializeNotificationService = async () => {
    try {
      await notificationService.current.initialize();

      // Register callbacks for different notification types
      notificationService.current.registerCallback('ride_progress', handleRideProgress);
      notificationService.current.registerCallback('pin_confirmation', handlePinConfirmation);
      notificationService.current.registerCallback('ride_completed', handleRideCompleted);
      notificationService.current.registerCallback('cancel_ride', handleCancelRide);
      notificationService.current.registerCallback('message_driver', handleMessageDriver);
      notificationService.current.registerCallback('confirm_pin', handleConfirmPin);
      
      // Register action response callbacks
      notificationService.current.registerCallback('pin_confirmation_success', handlePinConfirmationSuccess);
      notificationService.current.registerCallback('pin_confirmation_error', handlePinConfirmationError);
      notificationService.current.registerCallback('message_driver_success', handleMessageDriverSuccess);
      notificationService.current.registerCallback('message_driver_error', handleMessageDriverError);
      notificationService.current.registerCallback('call_driver_success', handleCallDriverSuccess);
      notificationService.current.registerCallback('call_driver_error', handleCallDriverError);
      notificationService.current.registerCallback('ride_cancellation_success', handleRideCancellationSuccess);
      notificationService.current.registerCallback('ride_cancellation_error', handleRideCancellationError);

      console.log('✅ Rich notification handler initialized');
    } catch (error) {
      console.error('❌ Failed to initialize rich notification handler:', error);
    }
  };

  const cleanupNotificationService = () => {
    notificationService.current.unregisterCallback('ride_progress');
    notificationService.current.unregisterCallback('pin_confirmation');
    notificationService.current.unregisterCallback('ride_completed');
    notificationService.current.unregisterCallback('cancel_ride');
    notificationService.current.unregisterCallback('message_driver');
    notificationService.current.unregisterCallback('confirm_pin');
    
    // Unregister action response callbacks
    notificationService.current.unregisterCallback('pin_confirmation_success');
    notificationService.current.unregisterCallback('pin_confirmation_error');
    notificationService.current.unregisterCallback('message_driver_success');
    notificationService.current.unregisterCallback('message_driver_error');
    notificationService.current.unregisterCallback('call_driver_success');
    notificationService.current.unregisterCallback('call_driver_error');
    notificationService.current.unregisterCallback('ride_cancellation_success');
    notificationService.current.unregisterCallback('ride_cancellation_error');
  };

  const handleRideProgress = (rideProgress: RideProgressData) => {
    console.log('🚗 Ride progress received:', rideProgress);
    setCurrentRide(rideProgress);
  };

  const handlePinConfirmation = (rideProgress: RideProgressData) => {
    console.log('🔐 PIN confirmation received:', rideProgress.pinCode);
    setCurrentRide(rideProgress);
    setShowPinModal(true);
  };

  const handleRideCompleted = (rideProgress: RideProgressData) => {
    console.log('✅ Ride completed:', rideProgress.rideId);
    setCurrentRide(null);
    setShowPinModal(false);
    onRideCompleted?.(rideProgress.rideId);
  };

  const handleCancelRide = (rideProgress: RideProgressData) => {
    console.log('❌ Cancel ride triggered:', rideProgress.rideId);
    onCancelRide?.(rideProgress.rideId);
  };

  const handleMessageDriver = (rideProgress: RideProgressData) => {
    console.log('💬 Message driver triggered:', rideProgress.rideId);
    onMessageDriver?.(rideProgress.rideId);
  };

  const handleConfirmPin = (rideProgress: RideProgressData) => {
    console.log('🔐 Confirm PIN triggered:', rideProgress.pinCode);
    onConfirmPin?.(rideProgress.rideId, rideProgress.pinCode || '');
  };

  // Action response handlers
  const handlePinConfirmationSuccess = (data: any) => {
    console.log('✅ PIN confirmation successful:', data);
    Alert.alert('Success', 'PIN confirmed! Ride started.');
  };

  const handlePinConfirmationError = (data: any) => {
    console.error('❌ PIN confirmation failed:', data);
    Alert.alert('Error', data.message || 'Failed to confirm PIN');
  };

  const handleMessageDriverSuccess = (data: any) => {
    console.log('✅ Message sent successfully:', data);
    Alert.alert('Success', 'Message sent to driver');
  };

  const handleMessageDriverError = (data: any) => {
    console.error('❌ Failed to send message:', data);
    Alert.alert('Error', data.message || 'Failed to send message');
  };

  const handleCallDriverSuccess = (data: any) => {
    console.log('✅ Call driver info received:', data);
    // Phone app should already be opened by handleCallDriver
  };

  const handleCallDriverError = (data: any) => {
    console.error('❌ Failed to get call info:', data);
    Alert.alert('Error', data.message || 'Failed to get driver contact info');
  };

  const handleRideCancellationSuccess = (data: any) => {
    console.log('✅ Ride cancelled successfully:', data);
    Alert.alert('Success', 'Ride cancelled successfully');
  };

  const handleRideCancellationError = (data: any) => {
    console.error('❌ Failed to cancel ride:', data);
    Alert.alert('Error', data.message || 'Failed to cancel ride');
  };

  const animateProgress = (progress: number) => {
    Animated.timing(progressAnimation, {
      toValue: progress,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  };

  const slideInNotification = () => {
    Animated.spring(slideAnimation, {
      toValue: 0,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  const slideOutNotification = () => {
    Animated.timing(slideAnimation, {
      toValue: -100,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setCurrentRide(null);
    });
  };

  const handleCallDriver = () => {
    if (!currentRide?.driverInfo?.phone) return;

    const phoneNumber = currentRide.driverInfo.phone;
    const url = Platform.OS === 'ios' ? `tel:${phoneNumber}` : `tel:${phoneNumber}`;

    // First, request driver call info from backend
    const socketService = RideNotificationSocketService.getInstance();
    socketService.callDriver(currentRide.rideId);

    // Then open phone app
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open phone app');
      }
    });

    onCallDriver?.(currentRide.driverInfo);
  };

  const handleCancelRidePress = () => {
    if (!currentRide) return;

    Alert.alert(
      'Cancel Ride',
      'Are you sure you want to cancel this ride?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => {
            // Send cancellation request to backend
            const socketService = RideNotificationSocketService.getInstance();
            socketService.cancelRide(currentRide.rideId, 'User cancelled ride');
            
            onCancelRide?.(currentRide.rideId);
            slideOutNotification();
          },
        },
      ]
    );
  };

  const handleMessageDriverPress = () => {
    if (!currentRide) return;
    
    // For now, we'll just trigger the callback
    // In a real app, you'd open a chat interface
    Alert.prompt(
      'Message Driver',
      'Enter your message:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: (message) => {
            if (message) {
              const socketService = RideNotificationSocketService.getInstance();
              socketService.sendMessageToDriver(currentRide.rideId, message);
            }
          },
        },
      ],
      'plain-text'
    );
    
    onMessageDriver?.(currentRide.rideId);
  };

  const handlePinSubmit = () => {
    if (!currentRide?.pinCode || !enteredPin) return;

    if (enteredPin === currentRide.pinCode) {
      // Send PIN confirmation to backend
      const socketService = RideNotificationSocketService.getInstance();
      socketService.confirmPin(currentRide.rideId, enteredPin);
      
      onConfirmPin?.(currentRide.rideId, enteredPin);
      setShowPinModal(false);
      setEnteredPin('');
      slideOutNotification();
    } else {
      Alert.alert('Incorrect PIN', 'Please enter the correct PIN code.');
    }
  };

  if (!currentRide) return null;

  const { driverInfo, eta, distance, status, progress, pinCode } = currentRide;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnimation }],
        },
      ]}
    >
      <LinearGradient
        colors={['#FF6B35', '#F7931E']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.statusText}>
            {status === 'en_route' ? `Pickup in ${eta}` : 
             status === 'arrived' ? 'Driver has arrived' :
             status === 'pickup_complete' ? 'Ride started' :
             status === 'in_progress' ? 'En route to destination' :
             'Ride update'}
          </Text>
          <TouchableOpacity onPress={slideOutNotification} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Driver Info */}
        <View style={styles.driverSection}>
          <View style={styles.driverInfo}>
            <Image
              source={
                driverInfo.profileImage
                  ? { uri: driverInfo.profileImage }
                  : require('../../assets/images/default-avatar.png')
              }
              style={styles.driverAvatar}
            />
            <View style={styles.driverDetails}>
              <Text style={styles.driverName}>{driverInfo.name}</Text>
              <Text style={styles.bikeInfo}>
                {driverInfo.bikeNumber} • {driverInfo.bikeModel}
              </Text>
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={16} color="#FFD700" />
                <Text style={styles.rating}>{driverInfo.rating}</Text>
              </View>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: progressAnimation.interpolate({
                      inputRange: [0, 100],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
            <Text style={styles.distanceText}>{distance}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity onPress={handleCallDriver} style={styles.actionButton}>
            <Ionicons name="call" size={24} color="#FF6B35" />
            <Text style={styles.actionText}>Call</Text>
          </TouchableOpacity>

          {status !== 'completed' && (
            <TouchableOpacity onPress={handleCancelRidePress} style={styles.actionButton}>
              <Ionicons name="close-circle" size={24} color="#FF4444" />
              <Text style={[styles.actionText, { color: '#FF4444' }]}>Cancel</Text>
            </TouchableOpacity>
          )}

          {['en_route', 'arrived', 'pickup_complete', 'in_progress'].includes(status) && (
            <TouchableOpacity onPress={handleMessageDriverPress} style={styles.actionButton}>
              <Ionicons name="chatbubble" size={24} color="#4CAF50" />
              <Text style={[styles.actionText, { color: '#4CAF50' }]}>Message</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* PIN Confirmation Modal */}
        {showPinModal && pinCode && (
          <View style={styles.pinModal}>
            <View style={styles.pinContent}>
              <Text style={styles.pinTitle}>Enter PIN to Start Ride</Text>
              <Text style={styles.pinSubtitle}>
                Give PIN {pinCode} to {driverInfo.name}
              </Text>
              <View style={styles.pinInputContainer}>
                <Text style={styles.pinInput}>{enteredPin}</Text>
              </View>
              <TouchableOpacity onPress={handlePinSubmit} style={styles.pinButton}>
                <Text style={styles.pinButtonText}>Confirm PIN</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 10,
  },
  gradient: {
    padding: 20,
    paddingTop: 50, // Account for status bar
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
  },
  closeButton: {
    padding: 5,
  },
  driverSection: {
    marginBottom: 20,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  driverAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  bikeInfo: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 14,
    color: 'white',
    marginLeft: 4,
  },
  progressContainer: {
    marginTop: 10,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 3,
  },
  distanceText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  actionButton: {
    alignItems: 'center',
    padding: 10,
  },
  actionText: {
    fontSize: 12,
    color: 'white',
    marginTop: 4,
    fontWeight: '600',
  },
  pinModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    margin: 20,
    alignItems: 'center',
    minWidth: width * 0.8,
  },
  pinTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  pinSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  pinInputContainer: {
    borderWidth: 2,
    borderColor: '#FF6B35',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    minWidth: 200,
  },
  pinInput: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    letterSpacing: 5,
  },
  pinButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 25,
    paddingVertical: 15,
    paddingHorizontal: 30,
    minWidth: 200,
  },
  pinButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default RichNotificationHandler;
