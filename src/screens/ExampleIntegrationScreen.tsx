import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import RichNotificationHandler from '../components/RichNotificationHandler';
import RideNotificationSocketService from '../services/rideNotificationSocketService';
import UberStyleNotificationService, {
  RideProgressData,
  DriverInfo,
} from '../services/uberStyleNotificationService';

const ExampleIntegrationScreen: React.FC = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentRide, setCurrentRide] = useState<RideProgressData | null>(null);
  const [isBooking, setIsBooking] = useState(false);

  useEffect(() => {
    initializeNotificationSystem();
  }, []);

  const initializeNotificationSystem = async () => {
    try {
      // Initialize notification services
      const notificationService = UberStyleNotificationService.getInstance();
      const socketService = RideNotificationSocketService.getInstance();

      await notificationService.initialize();
      await socketService.initialize();

      // Register callbacks for ride events
      notificationService.registerCallback('ride_progress', handleRideProgress);
      notificationService.registerCallback('pin_confirmation', handlePinConfirmation);
      notificationService.registerCallback('ride_completed', handleRideCompleted);
      notificationService.registerCallback('cancel_ride', handleCancelRide);

      setIsInitialized(true);
      console.log('✅ Notification system initialized');
    } catch (error) {
      console.error('❌ Failed to initialize notification system:', error);
      Alert.alert('Error', 'Failed to initialize notification system');
    }
  };

  const handleRideProgress = (rideProgress: RideProgressData) => {
    console.log('🚗 Ride progress received:', rideProgress.status);
    setCurrentRide(rideProgress);
  };

  const handlePinConfirmation = (rideProgress: RideProgressData) => {
    console.log('🔐 PIN confirmation received:', rideProgress.pinCode);
    setCurrentRide(rideProgress);
  };

  const handleRideCompleted = (rideProgress: RideProgressData) => {
    console.log('✅ Ride completed:', rideProgress.rideId);
    setCurrentRide(null);
    Alert.alert('Ride Completed', `Your ride has been completed. Fare: ₹${rideProgress.fare}`);
  };

  const handleCancelRide = (rideProgress: RideProgressData) => {
    console.log('❌ Ride cancelled:', rideProgress.rideId);
    setCurrentRide(null);
    Alert.alert('Ride Cancelled', 'Your ride has been cancelled');
  };

  // Example: Simulate booking a ride
  const bookRide = async () => {
    if (!isInitialized) {
      Alert.alert('Error', 'Notification system not initialized');
      return;
    }

    setIsBooking(true);

    try {
      // Simulate API call to book ride
      const rideId = `ride-${Date.now()}`;
      
      // In a real app, you would call your backend API here
      // const response = await api.bookRide({
      //   pickup: { latitude: 12.9716, longitude: 77.5946, address: 'Bangalore' },
      //   dropoff: { latitude: 12.9789, longitude: 77.5917, address: 'MG Road' },
      //   rideType: 'bike'
      // });

      // Simulate ride acceptance after 3 seconds
      setTimeout(async () => {
        const notificationService = UberStyleNotificationService.getInstance();
        
        const rideData: RideProgressData = {
          rideId,
          driverInfo: {
            id: 'driver-123',
            name: 'Rahul Kumar',
            phone: '+919876543210',
            bikeNumber: 'KA01AB1234',
            bikeModel: 'Hero Passion Pro',
            rating: 4.7,
            profileImage: 'https://example.com/driver.jpg',
          },
          pickupLocation: 'Bangalore, Karnataka',
          dropoffLocation: 'MG Road, Bangalore',
          eta: '5 minutes',
          distance: '2.5 km away',
          progress: 0,
          status: 'accepted',
        };

        await notificationService.sendRideProgressNotification(rideData);
        setCurrentRide(rideData);
        setIsBooking(false);
      }, 3000);

    } catch (error) {
      console.error('❌ Error booking ride:', error);
      Alert.alert('Error', 'Failed to book ride');
      setIsBooking(false);
    }
  };

  const handleCallDriver = (driverInfo: DriverInfo) => {
    Alert.alert('Call Driver', `Calling ${driverInfo.name} at ${driverInfo.phone}`);
  };

  const handleCancelRidePress = (rideId: string) => {
    Alert.alert(
      'Cancel Ride',
      'Are you sure you want to cancel this ride?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => {
            const socketService = RideNotificationSocketService.getInstance();
            socketService.cancelRide(rideId, 'User cancelled');
          },
        },
      ]
    );
  };

  const handleMessageDriverPress = (rideId: string) => {
    Alert.alert('Message Driver', 'Opening chat with driver...');
  };

  const handleConfirmPinPress = (rideId: string, pinCode: string) => {
    const socketService = RideNotificationSocketService.getInstance();
    socketService.confirmPin(rideId, pinCode);
    Alert.alert('PIN Confirmed', `PIN ${pinCode} has been confirmed`);
  };

  const handleRideCompletedPress = (rideId: string) => {
    Alert.alert('Ride Completed', 'Thank you for using our service!');
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Bike Taxi Booking</Text>
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: isInitialized ? '#4CAF50' : '#FF4444' }]} />
            <Text style={styles.statusText}>
              {isInitialized ? 'Ready' : 'Initializing...'}
            </Text>
          </View>
        </View>

        <View style={styles.content}>
          {!currentRide ? (
            <View style={styles.bookingSection}>
              <Text style={styles.sectionTitle}>Book Your Ride</Text>
              <Text style={styles.description}>
                Tap the button below to book a bike taxi ride. You'll receive real-time notifications about your driver's location and ride progress.
              </Text>
              
              <TouchableOpacity
                style={[styles.bookButton, { opacity: isBooking ? 0.7 : 1 }]}
                onPress={bookRide}
                disabled={isBooking || !isInitialized}
              >
                <Ionicons name="bicycle" size={24} color="white" />
                <Text style={styles.bookButtonText}>
                  {isBooking ? 'Booking...' : 'Book Bike Taxi'}
                </Text>
              </TouchableOpacity>

              {isBooking && (
                <View style={styles.bookingStatus}>
                  <Text style={styles.bookingText}>Finding your driver...</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.rideSection}>
              <Text style={styles.sectionTitle}>Your Ride</Text>
              
              <View style={styles.rideInfo}>
                <Text style={styles.rideStatus}>
                  Status: {currentRide.status.replace('_', ' ').toUpperCase()}
                </Text>
                <Text style={styles.driverName}>
                  Driver: {currentRide.driverInfo.name}
                </Text>
                <Text style={styles.bikeInfo}>
                  {currentRide.driverInfo.bikeNumber} • {currentRide.driverInfo.bikeModel}
                </Text>
                <Text style={styles.eta}>
                  ETA: {currentRide.eta}
                </Text>
                <Text style={styles.distance}>
                  Distance: {currentRide.distance}
                </Text>
                {currentRide.pinCode && (
                  <Text style={styles.pinCode}>
                    PIN: {currentRide.pinCode}
                  </Text>
                )}
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleCallDriver(currentRide.driverInfo)}
                >
                  <Ionicons name="call" size={20} color="#4CAF50" />
                  <Text style={styles.actionButtonText}>Call</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleMessageDriverPress(currentRide.rideId)}
                >
                  <Ionicons name="chatbubble" size={20} color="#2196F3" />
                  <Text style={styles.actionButtonText}>Message</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleCancelRidePress(currentRide.rideId)}
                >
                  <Ionicons name="close-circle" size={20} color="#FF4444" />
                  <Text style={styles.actionButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>How it works:</Text>
            <Text style={styles.infoText}>
              1. Book your ride and get instant driver assignment
            </Text>
            <Text style={styles.infoText}>
              2. Receive real-time notifications about driver location
            </Text>
            <Text style={styles.infoText}>
              3. Use PIN code to start your ride securely
            </Text>
            <Text style={styles.infoText}>
              4. Track progress and communicate with driver
            </Text>
          </View>
        </View>

        {/* Rich Notification Handler */}
        <RichNotificationHandler
          rideId={currentRide?.rideId}
          onCallDriver={handleCallDriver}
          onCancelRide={handleCancelRidePress}
          onMessageDriver={handleMessageDriverPress}
          onConfirmPin={handleConfirmPinPress}
          onRideCompleted={handleRideCompletedPress}
        />
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    color: 'white',
    fontSize: 14,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  bookingSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 15,
  },
  description: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  bookButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 25,
    paddingVertical: 15,
    paddingHorizontal: 30,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 200,
    justifyContent: 'center',
  },
  bookButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  bookingStatus: {
    marginTop: 15,
  },
  bookingText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontStyle: 'italic',
  },
  rideSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  rideInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  rideStatus: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  driverName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  bikeInfo: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginBottom: 4,
  },
  eta: {
    color: 'white',
    fontSize: 14,
    marginBottom: 4,
  },
  distance: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginBottom: 4,
  },
  pinCode: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    alignItems: 'center',
    padding: 10,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  infoSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 20,
  },
  infoTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  infoText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginBottom: 5,
    lineHeight: 20,
  },
});

export default ExampleIntegrationScreen;
