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
import { Images } from '../../constants/Images';

export default function LiveTrackingScreen({ navigation, route }: any) {
  const { destination, estimate, driver, rideId, origin } = route.params;
  
  console.log('🚀 LiveTrackingScreen: Component initialized with params:', {
    destination,
    estimate,
    driver,
    rideId,
    origin
  });
  
  const [rideStatus, setRideStatus] = useState('arriving');
  const [currentETA, setCurrentETA] = useState(driver?.eta || estimate?.eta || 'N/A');
  const [callModalVisible, setCallModalVisible] = useState(false);
  const [driverLocation, setDriverLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [driverPath, setDriverPath] = useState<{latitude: number, longitude: number}[]>([]);
  // Transform driver name to replace "Driver" with "Pilot" if it contains "Driver"
  const transformDriverName = (name: string) => {
    if (name && name.includes('Driver')) {
      return name.replace(/Driver/g, 'Pilot');
    }
    return name;
  };
  
  const driverInfo = {
    ...driver,
    name: driver?.name ? transformDriverName(driver.name) : undefined
  };
  
  console.log('🚀 LiveTrackingScreen: Initial state:', {
    rideStatus,
    currentETA,
    driverInfo
  });

  useEffect(() => {
    console.log('🔧 LiveTrackingScreen: Setting up ride status and driver location listeners');
    console.log('🔧 Current rideId:', rideId);
    console.log('🔧 Current driverInfo:', driverInfo);
    
    // Listen for real-time ride status and driver location updates
    onRideStatus((data: { rideId: string; status: string; message?: string; }) => {
      console.log('🔄 LiveTrackingScreen received ride status update:', data);
      console.log('🔄 Checking if rideId matches:', data.rideId, '===', rideId);
      
      if (data.rideId === rideId) {
        console.log('✅ RideId matches, updating status from', rideStatus, 'to', data.status);
        setRideStatus(data.status);
        
        // Only handle completion and cancellation here
        // Driver arrival and ride start are handled by direct socket listeners
        if (data.status === 'completed') {
          console.log('✅ Ride completed, navigating to RideSummary');
          navigation.navigate('RideSummary', {
            destination,
            estimate,
            driver: driverInfo,
          });
        }
        if (data.status === 'cancelled') {
          console.log('❌ Ride cancelled');
          Alert.alert('Ride Cancelled', (data as any).message || 'Your ride has been cancelled.');
          navigation.navigate('TabNavigator', { screen: 'Home' });
        }
      } else {
        console.log('🚫 Ignoring ride status update for different ride:', data.rideId, 'expected:', rideId);
      }
    });

    // Listen for ride completed event specifically
    onRideCompleted((data: { rideId: string; status: string; message: string; timestamp: number; }) => {
      console.log('✅ LiveTrackingScreen received ride completed event:', data);
      console.log('✅ Checking if rideId matches:', data.rideId, '===', rideId);
      
      if (data.rideId === rideId) {
        console.log('✅ Ride completed event matches current ride, navigating to RideSummary');
        navigation.navigate('RideSummary', {
          destination,
          estimate,
          driver: driverInfo,
        });
      } else {
        console.log('🚫 Ignoring ride completed event for different ride:', data.rideId, 'expected:', rideId);
      }
    });
    
    onDriverLocation((data: { driverId: string; latitude: number; longitude: number; }) => {
      console.log('📍 LiveTrackingScreen received driver location:', data);
      console.log('📍 Expected driverId:', driverInfo?.id);
      
      if (data.driverId === driverInfo?.id) {
        console.log('✅ DriverId matches, updating location');
        setDriverLocation({ latitude: data.latitude, longitude: data.longitude });
        setDriverPath(prev => {
          // Only add if different from last
          if (!prev.length || prev[prev.length-1].latitude !== data.latitude || prev[prev.length-1].longitude !== data.longitude) {
            return [...prev, { latitude: data.latitude, longitude: data.longitude }];
          }
          return prev;
        });
      } else {
        console.log('🚫 Ignoring driver location for different driver:', data.driverId, 'expected:', driverInfo?.id);
      }
    });
    
    return () => {
      console.log('🧹 LiveTrackingScreen: Cleaning up ride status and driver location listeners');
      clearCallbacks();
    };
  }, [rideId, driverInfo, navigation, destination, estimate]);

  // Listen for driver_arrived event to show MPIN entry
  useEffect(() => {
    console.log('🔧 LiveTrackingScreen: Setting up direct socket listeners');
    console.log('🔧 Current rideId for direct listeners:', rideId);
    
    const handleDriverArrived = (data: { rideId: string; driverId: string; message?: string; status?: string }) => {
      console.log('🎯 LiveTrackingScreen received driver_arrived event:', data);
      console.log('🎯 Checking if rideId matches:', data.rideId, '===', rideId);
      
      if (data.rideId === rideId) {
        console.log('🚗 Driver arrived at pickup location, navigating to MpinEntry');
        console.log('🚗 Current screen state before navigation:', { rideStatus, currentETA });
        
        // Navigate to MPIN entry screen
        navigation.navigate('MpinEntry', {
          driver: driverInfo,
          rideId,
          destination,
          origin,
        });
      } else {
        console.log('🚫 Ignoring driver_arrived event for different ride:', data.rideId, 'expected:', rideId);
      }
    };

    // Listen for ride_started event to go to ride in progress
    const handleRideStarted = (data: { rideId: string; driverId: string; message?: string; status?: string }) => {
      console.log('🎯 LiveTrackingScreen received ride_started event:', data);
      console.log('🎯 Checking if rideId matches:', data.rideId, '===', rideId);
      
      if (data.rideId === rideId) {
        console.log('🚀 Ride started, navigating to RideInProgress');
        console.log('🚀 Current screen state before navigation:', { rideStatus, currentETA });
        
        navigation.replace('RideInProgress', {
          driver: driverInfo,
          rideId,
          destination,
          origin,
        });
      } else {
        console.log('🚫 Ignoring ride_started event for different ride:', data.rideId, 'expected:', rideId);
      }
    };

    // Add event listeners
    const socket = require('../../utils/socket').getSocket();
    if (socket) {
      console.log('🔗 Adding direct socket listeners to socket:', socket.id);
      console.log('🔗 Socket connected:', socket.connected);
      socket.on('driver_arrived', handleDriverArrived);
      socket.on('ride_started', handleRideStarted);
    } else {
      console.warn('⚠️ No socket available for direct event listeners');
    }

    return () => {
      if (socket) {
        console.log('🧹 LiveTrackingScreen: Cleaning up direct socket listeners');
        socket.off('driver_arrived', handleDriverArrived);
        socket.off('ride_started', handleRideStarted);
      }
    };
  }, [rideId, driverInfo, navigation, destination, origin]);

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

  const handleCompleteRide = () => {
    navigation.navigate('RideSummary', {
      destination,
      estimate,
      driver: driverInfo,
    });
  };

  const getStatusText = () => {
    switch (rideStatus) {
      case 'arriving':
        return `${driverInfo.name || 'Pilot'} is arriving in ${currentETA} mins`;
      case 'picked_up':
        return 'Ride started - Heading to destination';
      case 'in_progress':
        return `${currentETA} mins to destination`;
      default:
        return 'Tracking your ride...';
    }
  };

  const getProgressPercentage = () => {
    switch (rideStatus) {
      case 'arriving':
        return '33%';
      case 'picked_up':
        return '66%';
      case 'in_progress':
        return '100%';
      default:
        return '0%';
    }
  };

  const onShareTrip = async () => {
    try {
      await Share.share({
        message: 'Check out my trip details! [Add trip info or link here]',
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
          {/* Polyline from driver to pickup (origin) when arriving */}
          {rideStatus === 'arriving' && driverLocation && origin && origin.latitude && origin.longitude && (
            <Polyline
              coordinates={[
                { latitude: driverLocation.latitude, longitude: driverLocation.longitude },
                { latitude: origin.latitude, longitude: origin.longitude }
              ]}
              strokeColor="#007AFF"
              strokeWidth={4}
            />
          )}
          {/* Show driver's path as polyline after pickup if needed */}
          {rideStatus !== 'arriving' && driverPath.length > 1 && (
            <Polyline
              coordinates={driverPath}
              strokeColor="#007AFF"
              strokeWidth={4}
            />
          )}
          {driverLocation && (
            <Marker coordinate={driverLocation} title="Driver" pinColor="blue" />
          )}
          {/* Pickup marker */}
          {origin && origin.latitude && origin.longitude && (
            <Marker coordinate={{ latitude: origin.latitude, longitude: origin.longitude }} title="Pickup" pinColor="#00C853" />
          )}
          {destination && destination.latitude && destination.longitude && (
            <Marker coordinate={{ latitude: destination.latitude, longitude: destination.longitude }} title="Destination" pinColor="#FF5A5F" />
          )}
        </MapView>

        {/* Status Overlay */}
        <View style={styles.statusOverlay}>
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>{getStatusText()}</Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: getProgressPercentage() },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={handleCall}>
            <Ionicons name="call" size={20} color={Colors.white} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleChat}>
            <Ionicons name="chatbubble" size={20} color={Colors.white} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.sosButton]} onPress={handleSOS}>
            <Ionicons name="warning" size={20} color={Colors.white} />
          </TouchableOpacity>
          {/* Debug button for testing */}
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#FF6B6B' }]} 
            onPress={() => {
              console.log('🔧 DEBUG: Manual navigation to MpinEntry');
              navigation.navigate('MpinEntry', {
                driver: driverInfo,
                rideId,
                destination,
                origin,
              });
            }}
          >
            <Ionicons name="bug" size={20} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Driver Info Card */}
      <View style={styles.driverCard}>
        <View style={styles.driverInfo}>
          <Image source={driverInfo.photo ? { uri: driverInfo.photo } : Images.SCOOTER_1} style={styles.driverPhoto} />
          <View style={styles.driverDetails}>
            <Text style={styles.driverName}>{driverInfo.name || 'Pilot'}</Text>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={16} color={Colors.accent} />
              <Text style={styles.rating}>{driverInfo.rating || '-'}</Text>
            </View>
            <Text style={styles.vehicleInfo}>
              {driverInfo.vehicleModel || ''} • {driverInfo.vehicleNumber || ''}
            </Text>
          </View>
          <View style={styles.etaContainer}>
            <Text style={styles.etaText}>{currentETA} min</Text>
            <Text style={styles.etaLabel}>ETA</Text>
          </View>
        </View>
      </View>

      {/* Trip Info */}
      <View style={styles.tripCard}>
        <View style={styles.routeInfo}>
          <View style={styles.routePoint}>
            <View style={styles.pickupDot} />
            <View style={styles.routeDetails}>
              <Text style={styles.routeLabel}>Pickup</Text>
              <Text style={styles.routeAddress}>Your current location</Text>
            </View>
          </View>

          <View style={styles.routeLine} />

          <View style={styles.routePoint}>
            <View style={styles.destinationDot} />
            <View style={styles.routeDetails}>
              <Text style={styles.routeLabel}>Destination</Text>
              <Text style={styles.routeAddress}>{destination.name}</Text>
            </View>
          </View>
        </View>

        <View style={styles.tripActions}>
          <TouchableOpacity style={styles.shareButton} onPress={onShareTrip}>
            <Ionicons name="share" size={16} color={Colors.primary} />
            <Text style={styles.shareText}>Share Trip</Text>
          </TouchableOpacity>
          
          {rideStatus === 'in_progress' && (
            <TouchableOpacity style={styles.completeButton} onPress={handleCompleteRide}>
              <Text style={styles.completeText}>Complete Ride</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  mapContainer: {
    flex: 1,
    backgroundColor: Colors.gray100,
    position: 'relative',
  },
  mapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapText: {
    marginTop: Layout.spacing.sm,
    fontSize: Layout.fontSize.md,
    color: Colors.gray400,
  },
  statusIndicator: {
    marginTop: Layout.spacing.sm,
    fontSize: Layout.fontSize.sm,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  statusOverlay: {
    position: 'absolute',
    top: Layout.spacing.lg,
    left: Layout.spacing.lg,
    right: Layout.spacing.lg,
  },
  statusContainer: {
    backgroundColor: Colors.white,
    borderRadius: Layout.borderRadius.lg,
    padding: Layout.spacing.md,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statusText: {
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Layout.spacing.sm,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.gray200,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  actionButtons: {
    position: 'absolute',
    bottom: Layout.spacing.lg,
    right: Layout.spacing.lg,
    flexDirection: 'column',
  },
  actionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Layout.spacing.sm,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  sosButton: {
    backgroundColor: Colors.error,
  },
  driverCard: {
    backgroundColor: Colors.white,
    marginHorizontal: Layout.spacing.lg,
    marginTop: Layout.spacing.lg,
    borderRadius: Layout.borderRadius.lg,
    padding: Layout.spacing.lg,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: Layout.spacing.md,
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: Layout.fontSize.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Layout.spacing.xs,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Layout.spacing.xs,
  },
  rating: {
    marginLeft: Layout.spacing.xs,
    fontSize: Layout.fontSize.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  vehicleInfo: {
    fontSize: Layout.fontSize.sm,
    color: Colors.textSecondary,
  },
  etaContainer: {
    alignItems: 'center',
  },
  etaText: {
    fontSize: Layout.fontSize.lg,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  etaLabel: {
    fontSize: Layout.fontSize.xs,
    color: Colors.textSecondary,
  },
  tripCard: {
    backgroundColor: Colors.white,
    margin: Layout.spacing.lg,
    borderRadius: Layout.borderRadius.lg,
    padding: Layout.spacing.lg,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  routeInfo: {
    marginBottom: Layout.spacing.md,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickupDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
    marginRight: Layout.spacing.md,
  },
  destinationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.coral,
    marginRight: Layout.spacing.md,
  },
  routeDetails: {
    flex: 1,
    paddingVertical: Layout.spacing.sm,
  },
  routeLabel: {
    fontSize: Layout.fontSize.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  routeAddress: {
    fontSize: Layout.fontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: Colors.gray300,
    marginLeft: 5,
    marginVertical: 4,
  },
  tripActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Layout.spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    borderRadius: Layout.borderRadius.sm,
  },
  shareText: {
    marginLeft: Layout.spacing.xs,
    fontSize: Layout.fontSize.sm,
    fontWeight: '600',
    color: Colors.primary,
  },
  completeButton: {
    backgroundColor: Colors.success,
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    borderRadius: Layout.borderRadius.sm,
  },
  completeText: {
    fontSize: Layout.fontSize.sm,
    fontWeight: '600',
    color: Colors.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: Colors.primary,
  },
  modalDriverName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: Colors.text,
  },
  modalPhone: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
});
