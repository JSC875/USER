import React, { useEffect, useState, useRef } from 'react';
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
import RichNotificationHandler from '../components/RichNotificationHandler';
import RideNotificationSocketService from '../services/rideNotificationSocketService';
import UberStyleNotificationService, {
  RideProgressData,
  DriverInfo,
} from '../services/uberStyleNotificationService';

const RideNotificationDemoScreen: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [currentRide, setCurrentRide] = useState<RideProgressData | null>(null);
  const [rideId, setRideId] = useState('demo-ride-123');
  const [pinCode, setPinCode] = useState('');
  const [message, setMessage] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  
  const socketService = useRef(RideNotificationSocketService.getInstance());
  const notificationService = useRef(UberStyleNotificationService.getInstance());

  useEffect(() => {
    initializeServices();
    return () => {
      cleanupServices();
    };
  }, []);

  const initializeServices = async () => {
    try {
      addLog('🚀 Initializing notification services...');
      
      // Initialize socket service
      await socketService.current.initialize();
      setIsConnected(socketService.current.isSocketConnected());
      
      // Initialize notification service
      await notificationService.current.initialize();
      
      // Register callbacks
      notificationService.current.registerCallback('ride_progress', handleRideProgress);
      notificationService.current.registerCallback('pin_confirmation', handlePinConfirmation);
      notificationService.current.registerCallback('ride_completed', handleRideCompleted);
      notificationService.current.registerCallback('cancel_ride', handleCancelRide);
      notificationService.current.registerCallback('message_driver', handleMessageDriver);
      notificationService.current.registerCallback('confirm_pin', handleConfirmPin);
      
      addLog('✅ Services initialized successfully');
    } catch (error) {
      addLog(`❌ Failed to initialize services: ${error}`);
    }
  };

  const cleanupServices = () => {
    notificationService.current.unregisterCallback('ride_progress');
    notificationService.current.unregisterCallback('pin_confirmation');
    notificationService.current.unregisterCallback('ride_completed');
    notificationService.current.unregisterCallback('cancel_ride');
    notificationService.current.unregisterCallback('message_driver');
    notificationService.current.unregisterCallback('confirm_pin');
  };

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 49)]);
  };

  const handleRideProgress = (rideProgress: RideProgressData) => {
    addLog(`🚗 Ride progress: ${rideProgress.status} - ${rideProgress.eta}`);
    setCurrentRide(rideProgress);
  };

  const handlePinConfirmation = (rideProgress: RideProgressData) => {
    addLog(`🔐 PIN confirmation: ${rideProgress.pinCode}`);
    setCurrentRide(rideProgress);
  };

  const handleRideCompleted = (rideProgress: RideProgressData) => {
    addLog(`✅ Ride completed: ${rideProgress.rideId}`);
    setCurrentRide(null);
  };

  const handleCancelRide = (rideProgress: RideProgressData) => {
    addLog(`❌ Ride cancelled: ${rideProgress.rideId}`);
    socketService.current.cancelRide(rideProgress.rideId, 'User cancelled');
  };

  const handleMessageDriver = (rideProgress: RideProgressData) => {
    addLog(`💬 Message driver: ${rideProgress.rideId}`);
    if (message.trim()) {
      socketService.current.sendMessageToDriver(rideProgress.rideId, message);
      setMessage('');
    }
  };

  const handleConfirmPin = (rideProgress: RideProgressData) => {
    addLog(`🔐 Confirm PIN: ${rideProgress.pinCode}`);
    socketService.current.confirmPin(rideProgress.rideId, rideProgress.pinCode || '');
  };

  const handleCallDriver = (driverInfo: DriverInfo) => {
    addLog(`📞 Calling driver: ${driverInfo.name} - ${driverInfo.phone}`);
  };

  const handleCancelRidePress = (rideId: string) => {
    addLog(`❌ Cancelling ride: ${rideId}`);
    socketService.current.cancelRide(rideId, 'User cancelled from demo');
  };

  const handleMessageDriverPress = (rideId: string) => {
    addLog(`💬 Opening message for ride: ${rideId}`);
  };

  const handleConfirmPinPress = (rideId: string, pinCode: string) => {
    addLog(`🔐 Confirming PIN: ${pinCode} for ride: ${rideId}`);
    socketService.current.confirmPin(rideId, pinCode);
  };

  const handleRideCompletedPress = (rideId: string) => {
    addLog(`✅ Ride completed: ${rideId}`);
  };

  // Demo functions to simulate ride events
  const simulateRideAccepted = async () => {
    const demoRide: RideProgressData = {
      rideId: rideId,
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
      eta: '5 minutes',
      distance: '2.5 km away',
      progress: 0,
      status: 'accepted',
    };

    await notificationService.current.sendRideProgressNotification(demoRide);
    setCurrentRide(demoRide);
    addLog('🚗 Simulated ride accepted notification');
  };

  const simulateDriverEnRoute = async () => {
    if (!currentRide) {
      Alert.alert('No active ride', 'Please start a ride first');
      return;
    }

    const updatedRide: RideProgressData = {
      ...currentRide,
      status: 'en_route',
      eta: '3 minutes',
      distance: '1.2 km away',
      progress: 40,
    };

    await notificationService.current.updateRideProgressNotification(updatedRide);
    setCurrentRide(updatedRide);
    addLog('🚗 Simulated driver en route notification');
  };

  const simulateDriverArrived = async () => {
    if (!currentRide) {
      Alert.alert('No active ride', 'Please start a ride first');
      return;
    }

    const updatedRide: RideProgressData = {
      ...currentRide,
      status: 'arrived',
      eta: 'Arrived',
      distance: 'At pickup location',
      progress: 100,
    };

    await notificationService.current.updateRideProgressNotification(updatedRide);
    setCurrentRide(updatedRide);
    addLog('🚗 Simulated driver arrived notification');
  };

  const simulatePinConfirmation = async () => {
    if (!currentRide) {
      Alert.alert('No active ride', 'Please start a ride first');
      return;
    }

    const pinCode = generatePinCode();
    const rideWithPin: RideProgressData = {
      ...currentRide,
      pinCode,
    };

    await notificationService.current.sendPinConfirmationNotification(rideWithPin);
    setCurrentRide(rideWithPin);
    addLog(`🔐 Simulated PIN confirmation: ${pinCode}`);
  };

  const simulateRideCompleted = async () => {
    if (!currentRide) {
      Alert.alert('No active ride', 'Please start a ride first');
      return;
    }

    const completedRide: RideProgressData = {
      ...currentRide,
      status: 'completed',
      eta: 'Completed',
      distance: 'Ride finished',
      progress: 100,
      fare: 150,
    };

    await notificationService.current.sendRideCompletedNotification(completedRide);
    setCurrentRide(null);
    addLog('✅ Simulated ride completed notification');
  };

  const generatePinCode = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Uber-Style Notifications Demo</Text>
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: isConnected ? '#4CAF50' : '#FF4444' }]} />
            <Text style={styles.statusText}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </Text>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Demo Controls */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Demo Controls</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Ride ID:</Text>
              <TextInput
                style={styles.input}
                value={rideId}
                onChangeText={setRideId}
                placeholder="Enter ride ID"
              />
            </View>

            <View style={styles.buttonGrid}>
              <TouchableOpacity style={styles.demoButton} onPress={simulateRideAccepted}>
                <Ionicons name="checkmark-circle" size={20} color="white" />
                <Text style={styles.buttonText}>Ride Accepted</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.demoButton} onPress={simulateDriverEnRoute}>
                <Ionicons name="car" size={20} color="white" />
                <Text style={styles.buttonText}>En Route</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.demoButton} onPress={simulateDriverArrived}>
                <Ionicons name="location" size={20} color="white" />
                <Text style={styles.buttonText}>Arrived</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.demoButton} onPress={simulatePinConfirmation}>
                <Ionicons name="key" size={20} color="white" />
                <Text style={styles.buttonText}>PIN Code</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.demoButton} onPress={simulateRideCompleted}>
                <Ionicons name="checkmark-done" size={20} color="white" />
                <Text style={styles.buttonText}>Completed</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Message Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Send Message to Driver</Text>
            <View style={styles.messageContainer}>
              <TextInput
                style={styles.messageInput}
                value={message}
                onChangeText={setMessage}
                placeholder="Type your message..."
                multiline
              />
              <TouchableOpacity 
                style={[styles.sendButton, { opacity: message.trim() ? 1 : 0.5 }]}
                onPress={() => {
                  if (message.trim() && currentRide) {
                    socketService.current.sendMessageToDriver(currentRide.rideId, message);
                    addLog(`💬 Message sent: ${message}`);
                    setMessage('');
                  }
                }}
                disabled={!message.trim()}
              >
                <Ionicons name="send" size={20} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Current Ride Status */}
          {currentRide && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Current Ride Status</Text>
              <View style={styles.rideStatus}>
                <Text style={styles.rideInfo}>
                  <Text style={styles.label}>Status:</Text> {currentRide.status}
                </Text>
                <Text style={styles.rideInfo}>
                  <Text style={styles.label}>Driver:</Text> {currentRide.driverInfo.name}
                </Text>
                <Text style={styles.rideInfo}>
                  <Text style={styles.label}>ETA:</Text> {currentRide.eta}
                </Text>
                <Text style={styles.rideInfo}>
                  <Text style={styles.label}>Distance:</Text> {currentRide.distance}
                </Text>
                {currentRide.pinCode && (
                  <Text style={styles.rideInfo}>
                    <Text style={styles.label}>PIN:</Text> {currentRide.pinCode}
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Logs */}
          <View style={styles.section}>
            <View style={styles.logHeader}>
              <Text style={styles.sectionTitle}>Event Logs</Text>
              <TouchableOpacity onPress={clearLogs} style={styles.clearButton}>
                <Ionicons name="trash" size={16} color="#FF4444" />
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.logsContainer}>
              {logs.map((log, index) => (
                <Text key={index} style={styles.logText}>
                  {log}
                </Text>
              ))}
              {logs.length === 0 && (
                <Text style={styles.emptyLogs}>No events yet</Text>
              )}
            </View>
          </View>
        </ScrollView>

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
  section: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 15,
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    color: 'white',
    fontSize: 14,
    marginBottom: 5,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    padding: 12,
    color: 'white',
    fontSize: 16,
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  demoButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    width: '48%',
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  messageInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    padding: 12,
    color: 'white',
    fontSize: 16,
    marginRight: 10,
    minHeight: 40,
  },
  sendButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rideStatus: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 15,
  },
  rideInfo: {
    color: 'white',
    fontSize: 14,
    marginBottom: 5,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#FF4444',
    fontSize: 14,
    marginLeft: 5,
  },
  logsContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 10,
    padding: 15,
    maxHeight: 200,
  },
  logText: {
    color: '#E0E0E0',
    fontSize: 12,
    marginBottom: 2,
    fontFamily: 'monospace',
  },
  emptyLogs: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default RideNotificationDemoScreen;
