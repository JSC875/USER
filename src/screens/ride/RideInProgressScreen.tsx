import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Linking,
  Alert,
  Modal,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import { onRideStatus, onDriverLocation, onRideCompleted, clearCallbacks } from '../../utils/socket';
import MapView, { Marker, Polyline } from 'react-native-maps';

export default function RideInProgressScreen({ navigation, route }: any) {
  const { destination, driver, rideId, origin, mpinVerified } = route.params;
  const [rideStatus, setRideStatus] = useState('in_progress');
  const [currentETA, setCurrentETA] = useState('25 mins');
  const [callModalVisible, setCallModalVisible] = useState(false);
  const [driverLocation, setDriverLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [driverPath, setDriverPath] = useState<{latitude: number, longitude: number}[]>([]);
  const [rideProgress, setRideProgress] = useState(0);
  const driverInfo = driver;

  useEffect(() => {
    console.log('🚗 RideInProgressScreen mounted with params:', route.params);
    console.log('🔍 MPIN Verified:', mpinVerified);
    
    // Listen for real-time ride status and driver location updates
    onRideStatus((data: { rideId: string; status: string; message?: string; }) => {
      if (data.rideId === rideId) {
        console.log('🔄 Ride status update:', data);
        setRideStatus(data.status);
        
        if (data.status === 'completed') {
          navigation.navigate('RideSummary', {
            destination,
            driver: driverInfo,
            rideId,
          });
        }
        if (data.status === 'cancelled') {
          Alert.alert('Ride Cancelled', data.message || 'Your ride has been cancelled.');
          navigation.navigate('TabNavigator', { screen: 'Home' });
        }
      }
    });

    // Listen for ride completed event specifically
    onRideCompleted((data: { rideId: string; status: string; message: string; timestamp: number; }) => {
      console.log('✅ RideInProgressScreen received ride completed event:', data);
      console.log('✅ Checking if rideId matches:', data.rideId, '===', rideId);
      
      if (data.rideId === rideId) {
        console.log('✅ Ride completed event matches current ride, navigating to RideSummary');
        navigation.navigate('RideSummary', {
          destination,
          driver: driverInfo,
          rideId,
        });
      } else {
        console.log('🚫 Ignoring ride completed event for different ride:', data.rideId, 'expected:', rideId);
      }
    });

    onDriverLocation((data: { driverId: string; latitude: number; longitude: number; }) => {
      console.log('📍 Driver location update:', data);
      setDriverLocation({ latitude: data.latitude, longitude: data.longitude });
      setDriverPath(prev => {
        // Only add if different from last
        if (!prev.length || prev[prev.length-1].latitude !== data.latitude || prev[prev.length-1].longitude !== data.longitude) {
          return [...prev, { latitude: data.latitude, longitude: data.longitude }];
        }
        return prev;
      });
    });

    return () => {
      clearCallbacks();
    };
  }, [rideId, driverInfo, navigation, destination]);

  // Simulate ride progress
  useEffect(() => {
    const progressInterval = setInterval(() => {
      setRideProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 1;
      });
    }, 3000); // Update every 3 seconds

    return () => clearInterval(progressInterval);
  }, []);

  const handleChat = () => {
    navigation.navigate('Chat', { driver: driverInfo });
  };

  const handleCall = () => {
    setCallModalVisible(true);
  };

  const handleCallNow = () => {
    setCallModalVisible(false);
    if (driverInfo.phone) {
      Linking.openURL(`tel:${driverInfo.phone}`);
    } else {
      Alert.alert('No phone number available');
    }
  };

  const handleSOS = () => {
    Alert.alert(
      'Emergency SOS',
      'Who do you want to call?',
      [
        { text: 'Police', onPress: () => Linking.openURL('tel:100') },
        { text: 'Ambulance', onPress: () => Linking.openURL('tel:108') },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const getStatusText = () => {
    switch (rideStatus) {
      case 'in_progress':
        return `Heading to ${destination?.name || 'destination'}`;
      case 'near_destination':
        return `Almost there - ${currentETA} to destination`;
      case 'arrived':
        return 'Arrived at destination';
      default:
        return 'Ride in progress...';
    }
  };

  const getProgressPercentage = () => {
    return Math.min(rideProgress, 100);
  };

  const onShareTrip = async () => {
    try {
      await Share.share({
        message: `I'm on my way to ${destination?.name || 'destination'} with ${driverInfo?.name || 'my pilot'}. Track my ride!`,
      });
    } catch (error: any) {
      alert('Error sharing: ' + (error?.message || error?.toString() || 'Unknown error'));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Call Modal */}
      <Modal
        visible={callModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCallModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.callModal}>
            <Text style={styles.modalTitle}>Call Pilot</Text>
            <Text style={styles.modalDriverName}>{driverInfo.name || 'Pilot'}</Text>
            <Text style={styles.modalPhone}>{driverInfo.phone || 'No phone number'}</Text>
            <View style={{ flexDirection: 'row', marginTop: 20 }}>
              <TouchableOpacity style={styles.modalButton} onPress={handleCallNow}>
                <Ionicons name="call" size={20} color="#fff" />
                <Text style={styles.modalButtonText}>Call Now</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#ccc', marginLeft: 10 }]} onPress={() => setCallModalVisible(false)}>
                <Text style={[styles.modalButtonText, { color: '#222' }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Map Container */}
      <View style={styles.mapContainer}>
        <MapView
          style={{ flex: 1 }}
          initialRegion={{
            latitude: driverLocation?.latitude || destination?.latitude || 17.4448,
            longitude: driverLocation?.longitude || destination?.longitude || 78.3498,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          region={driverLocation ? {
            latitude: driverLocation.latitude,
            longitude: driverLocation.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          } : undefined}
        >
          {/* Show driver's path as polyline */}
          {driverPath.length > 1 && (
            <Polyline
              coordinates={driverPath}
              strokeColor="#007AFF"
              strokeWidth={4}
            />
          )}
          
          {/* Driver marker */}
          {driverLocation && (
            <Marker coordinate={driverLocation} title="Driver" pinColor="blue" />
          )}
          
          {/* Destination marker */}
          {destination && destination.latitude && destination.longitude && (
            <Marker coordinate={{ latitude: destination.latitude, longitude: destination.longitude }} title="Destination" pinColor="#FF5A5F" />
          )}
        </MapView>
      </View>

      {/* Status Bar */}
      <View style={styles.statusBar}>
        <View style={styles.statusContent}>
          <View style={styles.statusLeft}>
            <Text style={styles.statusText}>{getStatusText()}</Text>
            <Text style={styles.etaText}>{currentETA} remaining</Text>
          </View>
          <View style={styles.statusRight}>
            <TouchableOpacity style={styles.actionButton} onPress={handleChat}>
              <Ionicons name="chatbubble" size={20} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleCall}>
              <Ionicons name="call" size={20} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleSOS}>
              <Ionicons name="warning" size={20} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${getProgressPercentage()}%` }]} />
          </View>
          <Text style={styles.progressText}>{getProgressPercentage()}% Complete</Text>
        </View>
      </View>

      {/* Trip Card */}
      <View style={styles.tripCard}>
        <View style={styles.routeInfo}>
          <View style={styles.routePoint}>
            <View style={styles.pickupDot} />
            <View style={styles.routeDetails}>
              <Text style={styles.routeLabel}>Pickup</Text>
              <Text style={styles.routeAddress}>{origin?.name || 'Your location'}</Text>
            </View>
          </View>

          <View style={styles.routeLine} />

          <View style={styles.routePoint}>
            <View style={styles.destinationDot} />
            <View style={styles.routeDetails}>
              <Text style={styles.routeLabel}>Destination</Text>
              <Text style={styles.routeAddress}>{destination?.name}</Text>
            </View>
          </View>
        </View>

        <View style={styles.tripActions}>
          <TouchableOpacity style={styles.shareButton} onPress={onShareTrip}>
            <Ionicons name="share" size={16} color={Colors.primary} />
            <Text style={styles.shareText}>Share Trip</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  mapContainer: {
    flex: 1,
  },
  statusBar: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  statusContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusLeft: {
    flex: 1,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  etaText: {
    fontSize: 14,
    color: '#666',
  },
  statusRight: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  tripCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  routeInfo: {
    marginBottom: 20,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  pickupDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#00C853',
    marginRight: 12,
  },
  destinationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF5A5F',
    marginRight: 12,
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: '#e0e0e0',
    marginLeft: 5,
    marginBottom: 16,
  },
  routeDetails: {
    flex: 1,
  },
  routeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  routeAddress: {
    fontSize: 12,
    color: '#666',
  },
  tripActions: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f0f8ff',
  },
  shareText: {
    marginLeft: 6,
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalDriverName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  modalPhone: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 6,
  },
}); 