import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import UberStyleNotificationService, {
  RideProgressData,
  DriverInfo,
} from '../services/uberStyleNotificationService';
import RideNotificationSocketService from '../services/rideNotificationSocketService';
import RichNotificationHandler from '../components/RichNotificationHandler';

const NotificationActionTestScreen: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [currentRide, setCurrentRide] = useState<RideProgressData | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [messageText, setMessageText] = useState('');
  const [pinCode, setPinCode] = useState('');

  useEffect(() => {
    initializeServices();
    return () => {
      cleanupServices();
    };
  }, []);

  const initializeServices = async () => {
    try {
      const notificationService = UberStyleNotificationService.getInstance();
      const socketService = RideNotificationSocketService.getInstance();

      await notificationService.initialize();
      await socketService.initialize();

      setIsConnected(true);
      addLog('✅ Services initialized successfully');

      // Register callbacks
      notificationService.registerCallback('ride_progress', handleRideProgress);
      notificationService.registerCallback('pin_confirmation', handlePinConfirmation);
      notificationService.registerCallback('ride_completed', handleRideCompleted);
      notificationService.registerCallback('pin_confirmation_success', handlePinConfirmationSuccess);
      notificationService.registerCallback('pin_confirmation_error', handlePinConfirmationError);
      notificationService.registerCallback('message_driver_success', handleMessageDriverSuccess);
      notificationService.registerCallback('message_driver_error', handleMessageDriverError);
      notificationService.registerCallback('call_driver_success', handleCallDriverSuccess);
      notificationService.registerCallback('call_driver_error', handleCallDriverError);
      notificationService.registerCallback('ride_cancellation_success', handleRideCancellationSuccess);
      notificationService.registerCallback('ride_cancellation_error', handleRideCancellationError);

    } catch (error) {
      addLog(`❌ Failed to initialize services: ${error}`);
    }
  };

  const cleanupServices = () => {
    const notificationService = UberStyleNotificationService.getInstance();
    const socketService = RideNotificationSocketService.getInstance();

    notificationService.cleanup();
    socketService.cleanup();
    setIsConnected(false);
  };

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 49)]);
  };

  // Test Functions
  const simulateRideAccepted = async () => {
    const mockRide: RideProgressData = {
      rideId: 'test-ride-' + Date.now(),
      driverInfo: {
        id: 'driver-123',
        name: 'John Driver',
        phone: '+1234567890',
        bikeNumber: 'BIKE123',
        bikeModel: 'Hero Passion Pro',
        rating: 4.8,
        profileImage: 'https://example.com/driver.jpg',
      },
      pickupLocation: '123 Main St, City',
      dropoffLocation: '456 Oak Ave, City',
      eta: '3 min',
      distance: '1.2 km away',
      progress: 25,
      status: 'accepted',
      pinCode: '1234',
    };

    setCurrentRide(mockRide);
    addLog('🚗 Simulated ride accepted');
  };

  const simulateDriverArrived = async () => {
    if (!currentRide) {
      Alert.alert('Error', 'No active ride to update');
      return;
    }

    const updatedRide = {
      ...currentRide,
      status: 'arrived' as const,
      eta: 'Arrived',
      distance: 'At pickup',
      progress: 100,
    };

    setCurrentRide(updatedRide);
    addLog('📍 Driver arrived - PIN confirmation should appear');
  };

  const testCallDriver = () => {
    if (!currentRide) {
      Alert.alert('Error', 'No active ride');
      return;
    }

    const socketService = RideNotificationSocketService.getInstance();
    socketService.callDriver(currentRide.rideId);
    addLog('📞 Testing call driver functionality');
  };

  const testCancelRide = () => {
    if (!currentRide) {
      Alert.alert('Error', 'No active ride');
      return;
    }

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
            socketService.cancelRide(currentRide.rideId, 'User cancelled from test screen');
            addLog('❌ Testing ride cancellation');
          },
        },
      ]
    );
  };

  const testMessageDriver = () => {
    if (!currentRide) {
      Alert.alert('Error', 'No active ride');
      return;
    }

    if (!messageText.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }

    const socketService = RideNotificationSocketService.getInstance();
    socketService.sendMessageToDriver(currentRide.rideId, messageText);
    addLog(`💬 Testing message driver: "${messageText}"`);
    setMessageText('');
  };

  const testPinConfirmation = () => {
    if (!currentRide?.pinCode) {
      Alert.alert('Error', 'No PIN code available');
      return;
    }

    if (!pinCode.trim()) {
      Alert.alert('Error', 'Please enter PIN code');
      return;
    }

    const socketService = RideNotificationSocketService.getInstance();
    socketService.confirmPin(currentRide.rideId, pinCode);
    addLog(`🔐 Testing PIN confirmation: ${pinCode}`);
    setPinCode('');
  };

  // Callback Handlers
  const handleRideProgress = (rideProgress: RideProgressData) => {
    addLog(`🚗 Ride progress: ${rideProgress.status}`);
    setCurrentRide(rideProgress);
  };

  const handlePinConfirmation = (rideProgress: RideProgressData) => {
    addLog(`🔐 PIN confirmation required: ${rideProgress.pinCode}`);
    setCurrentRide(rideProgress);
  };

  const handleRideCompleted = (rideProgress: RideProgressData) => {
    addLog(`✅ Ride completed: ${rideProgress.rideId}`);
    setCurrentRide(null);
  };

  const handlePinConfirmationSuccess = (data: any) => {
    addLog(`✅ PIN confirmation successful: ${data.message}`);
    Alert.alert('Success', 'PIN confirmed! Ride started.');
  };

  const handlePinConfirmationError = (data: any) => {
    addLog(`❌ PIN confirmation failed: ${data.message}`);
    Alert.alert('Error', data.message || 'Failed to confirm PIN');
  };

  const handleMessageDriverSuccess = (data: any) => {
    addLog(`✅ Message sent successfully: ${data.message}`);
    Alert.alert('Success', 'Message sent to driver');
  };

  const handleMessageDriverError = (data: any) => {
    addLog(`❌ Failed to send message: ${data.message}`);
    Alert.alert('Error', data.message || 'Failed to send message');
  };

  const handleCallDriverSuccess = (data: any) => {
    addLog(`✅ Call driver info received: ${data.driverPhone}`);
    Alert.alert('Call Driver', `Driver: ${data.driverName}\nPhone: ${data.driverPhone}`);
  };

  const handleCallDriverError = (data: any) => {
    addLog(`❌ Failed to get call info: ${data.message}`);
    Alert.alert('Error', data.message || 'Failed to get driver contact info');
  };

  const handleRideCancellationSuccess = (data: any) => {
    addLog(`✅ Ride cancelled successfully: ${data.message}`);
    Alert.alert('Success', 'Ride cancelled successfully');
    setCurrentRide(null);
  };

  const handleRideCancellationError = (data: any) => {
    addLog(`❌ Failed to cancel ride: ${data.message}`);
    Alert.alert('Error', data.message || 'Failed to cancel ride');
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Notification Action Test</Text>
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: isConnected ? '#4CAF50' : '#F44336' }]} />
            <Text style={styles.statusText}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </Text>
          </View>
        </View>

        <ScrollView style={styles.content}>
          {/* Test Controls */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Test Controls</Text>
            
            <TouchableOpacity style={styles.button} onPress={simulateRideAccepted}>
              <Ionicons name="car" size={20} color="white" />
              <Text style={styles.buttonText}>Simulate Ride Accepted</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.button} onPress={simulateDriverArrived}>
              <Ionicons name="location" size={20} color="white" />
              <Text style={styles.buttonText}>Simulate Driver Arrived</Text>
            </TouchableOpacity>
          </View>

          {/* Action Tests */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Action Tests</Text>
            
            <TouchableOpacity style={styles.actionButton} onPress={testCallDriver}>
              <Ionicons name="call" size={20} color="white" />
              <Text style={styles.buttonText}>Test Call Driver</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionButton, styles.cancelButton]} onPress={testCancelRide}>
              <Ionicons name="close-circle" size={20} color="white" />
              <Text style={styles.buttonText}>Test Cancel Ride</Text>
            </TouchableOpacity>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Enter message for driver..."
                value={messageText}
                onChangeText={setMessageText}
                multiline
              />
              <TouchableOpacity style={styles.actionButton} onPress={testMessageDriver}>
                <Ionicons name="chatbubble" size={20} color="white" />
                <Text style={styles.buttonText}>Send Message</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Enter PIN code..."
                value={pinCode}
                onChangeText={setPinCode}
                keyboardType="numeric"
                maxLength={4}
              />
              <TouchableOpacity style={styles.actionButton} onPress={testPinConfirmation}>
                <Ionicons name="key" size={20} color="white" />
                <Text style={styles.buttonText}>Confirm PIN</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Current Ride Status */}
          {currentRide && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Current Ride Status</Text>
              <View style={styles.rideInfo}>
                <Text style={styles.rideText}>Driver: {currentRide.driverInfo.name}</Text>
                <Text style={styles.rideText}>Bike: {currentRide.driverInfo.bikeNumber}</Text>
                <Text style={styles.rideText}>Status: {currentRide.status}</Text>
                <Text style={styles.rideText}>ETA: {currentRide.eta}</Text>
                {currentRide.pinCode && (
                  <Text style={styles.rideText}>PIN: {currentRide.pinCode}</Text>
                )}
              </View>
            </View>
          )}

          {/* Event Logs */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Event Logs</Text>
            <View style={styles.logsContainer}>
              {logs.map((log, index) => (
                <Text key={index} style={styles.logText}>
                  {log}
                </Text>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Rich Notification Handler */}
        <RichNotificationHandler
          rideId={currentRide?.rideId}
          onCallDriver={(driverInfo) => {
            addLog(`📞 Call driver triggered: ${driverInfo.name}`);
          }}
          onCancelRide={(rideId) => {
            addLog(`❌ Cancel ride triggered: ${rideId}`);
          }}
          onMessageDriver={(rideId) => {
            addLog(`💬 Message driver triggered: ${rideId}`);
          }}
          onConfirmPin={(rideId, pin) => {
            addLog(`🔐 Confirm PIN triggered: ${rideId} - ${pin}`);
          }}
          onRideCompleted={(rideId) => {
            addLog(`✅ Ride completed: ${rideId}`);
          }}
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
    width: 12,
    height: 12,
    borderRadius: 6,
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
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  cancelButton: {
    backgroundColor: 'rgba(244, 67, 54, 0.8)',
  },
  buttonText: {
    color: 'white',
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: 15,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    fontSize: 16,
  },
  rideInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 15,
    borderRadius: 10,
  },
  rideText: {
    color: 'white',
    fontSize: 14,
    marginBottom: 5,
  },
  logsContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: 15,
    borderRadius: 10,
    maxHeight: 200,
  },
  logText: {
    color: 'white',
    fontSize: 12,
    marginBottom: 2,
    fontFamily: 'monospace',
  },
});

export default NotificationActionTestScreen;
