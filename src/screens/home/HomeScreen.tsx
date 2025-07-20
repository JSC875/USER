import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useUser, useAuth } from '@clerk/clerk-expo';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import { mockLocations } from '../../data/mockData';
import { getGreeting, useAssignUserType, useSafeAreaWithTabBar } from '../../utils/helpers';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { useLocationStore } from '../../store/useLocationStore';
import { 
  connectSocket, 
  getSocket, 
  listenToEvent, 
  emitEvent, 
  getConnectionStatus,
  bookRide,
  onRideBooked,
  onRideAccepted,
  onDriverLocation,
  onRideStatus,
  onDriverOffline,
  clearCallbacks,
  connectSocketWithJWT
} from "../../utils/socket";
import { getUserIdFromJWT } from "../../utils/jwtDecoder";
import ConnectionStatus from "../../components/common/ConnectionStatus";

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation, route }: any) {
  const { user } = useUser();
  const { insets, getFloatingBottom } = useSafeAreaWithTabBar();
  const {
    pickupLocation,
    setPickupLocation,
    currentLocation,
    setCurrentLocation,
    dropoffLocation,
    setDropoffLocation,
  } = useLocationStore();
  const { getToken } = useAuth();

  const [region, setRegion] = React.useState({
    latitude: 28.6139, // Default: New Delhi
    longitude: 77.2090,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  const [dropLocation, setDropLocation] = React.useState<any>(null);
  const [hasSentToBackend, setHasSentToBackend] = React.useState(false);
  
  // New state for ride booking
  const [isBookingRide, setIsBookingRide] = useState(false);
  const [currentRide, setCurrentRide] = useState<any>(null);
  const [driverLocation, setDriverLocation] = useState<any>(null);
  const [rideStatus, setRideStatus] = useState<string>('');
  const [showRideModal, setShowRideModal] = useState(false);

  useAssignUserType('customer');

  // On mount, get current location and set as pickup if not set
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }
      let loc = await Location.getCurrentPositionAsync({});
      const coords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        address: 'Current Location',
      };
      setCurrentLocation(coords);
      if (!pickupLocation) {
        setPickupLocation(coords);
      }
      setRegion({
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When pickup or dropoff location changes, update map region
  useEffect(() => {
    if (dropoffLocation) {
      setRegion((prev) => ({
        ...prev,
        latitude: dropoffLocation.latitude,
        longitude: dropoffLocation.longitude,
      }));
    } else if (pickupLocation) {
      setRegion((prev) => ({
        ...prev,
        latitude: pickupLocation.latitude,
        longitude: pickupLocation.longitude,
      }));
    }
  }, [pickupLocation, dropoffLocation]);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      console.log('Clerk JWT token:', token);
    })();
  }, [getToken]);

  useEffect(() => {
    if (route.params?.destination) {
      setDropLocation(route.params.destination);
    }
  }, [route.params?.destination]);

  useEffect(() => {
    // Send custom JWT to backend only once per session
    const sendCustomJWTToBackend = async () => {
      if (!user || hasSentToBackend) return;
      try {
        const token = await getToken({ template: 'my_app_token' });
        if (!token) return;
        const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/users/me`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        let result = null;
        try {
          const text = await response.text();
          result = text ? JSON.parse(text) : null;
        } catch (e) {
          result = null; // Not JSON, or empty
        }
        console.log('Backend response:', result, 'Status:', response.status);
        setHasSentToBackend(true);
      } catch (err) {
        console.error('Failed to send custom JWT to backend:', err);
      }
    };
    sendCustomJWTToBackend();
  }, [user, getToken, hasSentToBackend]);

  // Enhanced socket event listeners
  useEffect(() => {
    // Connect to socket using JWT with APK-specific handling
    const { handleAPKConnection } = require('../../utils/socket');
    handleAPKConnection(getToken).then((socket: any) => {
      console.log('🔗 HomeScreen: Socket connected successfully');
      
      // Set up event callbacks
      onRideBooked((data) => {
        console.log('✅ HomeScreen: Ride booked:', data);
        setCurrentRide({
          rideId: data.rideId,
          price: data.price,
          status: 'searching'
        });
        setIsBookingRide(true);
        Alert.alert('Ride Booked!', `Searching for pilots...\nRide ID: ${data.rideId}`);
      });

      onRideAccepted((data) => {
        console.log('✅ HomeScreen: Ride accepted by driver:', data);
        
        // Transform driver name to replace "Driver" with "Pilot" if it contains "Driver"
        const transformDriverName = (name: string) => {
          if (name && name.includes('Driver')) {
            return name.replace(/Driver/g, 'Pilot');
          }
          return name;
        };
        
        const transformedDriverName = transformDriverName(data.driverName);
        
        setCurrentRide((prev: any) => ({
          ...prev,
          driverId: data.driverId,
          driverName: transformedDriverName,
          driverPhone: data.driverPhone,
          estimatedArrival: data.estimatedArrival,
          status: 'accepted'
        }));
        setRideStatus('Pilot accepted your ride!');
        setShowRideModal(true);
        Alert.alert('Pilot Found!', `${transformedDriverName} will arrive in ${data.estimatedArrival}`);
      });

      onDriverLocation((data) => {
        console.log('📍 HomeScreen: Driver location update:', data);
        setDriverLocation({
          latitude: data.latitude,
          longitude: data.longitude
        });
      });

      onRideStatus((data) => {
        console.log('🔄 HomeScreen: Ride status update:', data);
        setRideStatus(data.message);
        setCurrentRide((prev: any) => ({
          ...prev,
          status: data.status
        }));
        
        if (data.status === 'completed' || data.status === 'cancelled') {
          setCurrentRide(null);
          setDriverLocation(null);
          setRideStatus('');
          setShowRideModal(false);
          setIsBookingRide(false);
        }
      });

      onDriverOffline((data) => {
        console.log('🔴 HomeScreen: Driver went offline:', data);
        Alert.alert('Pilot Offline', 'Your pilot went offline. Finding a new pilot...');
      });

      // Cleanup callbacks on unmount
      return () => {
        console.log('🧹 HomeScreen: Cleaning up socket callbacks');
        clearCallbacks();
      };
    }).catch((error: any) => {
      console.error('❌ HomeScreen: Failed to connect socket:', error);
    });
  }, [getToken]);

  const handleLocationSearch = (type: 'pickup' | 'destination') => {
    navigation.navigate('LocationSearch', { type });
  };

  const handleQuickLocation = (location: any) => {
    navigation.navigate('RideEstimate', { destination: location });
  };

  const handleRideHistory = () => {
    // Navigate to the History tab
    navigation.navigate('History');
  };

  const handleSupport = () => {
    navigation.navigate('HelpSupport');
  };

  const getUserName = () => {
    if (user?.firstName) {
      return user.firstName;
    } else if (user?.fullName) {
      return user.fullName.split(' ')[0];
    }
    return 'User';
  };

  // Enhanced ride booking function
  const handleBookRide = async () => {
    if (!dropLocation) {
      Alert.alert('Select Destination', 'Please select a destination first.');
      return;
    }

    // Ensure socket is connected before booking - use APK-specific handling
    const { handleAPKConnection } = require('../../utils/socket');
    try {
      await handleAPKConnection(getToken);
      console.log('✅ Socket ready for ride booking');
    } catch (error: any) {
      console.error('❌ Failed to ensure socket connection for ride booking:', error);
      Alert.alert('Connection Error', 'Unable to connect to server. Please check your internet connection and try again.');
      return;
    }

    // Fetch real-time GPS location
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Location permission is required to book a ride.');
      return;
    }
    let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
    console.log('📍 Fetched GPS position:', loc.coords);
    const pickup = {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      address: 'Current Location',
      name: 'Current Location',
    };
    console.log('📍 Pickup:', pickup);
    console.log('🎯 Drop:', dropLocation);
    console.log('drop latitude:', dropLocation?.latitude, 'drop longitude:', dropLocation?.longitude);
    
    // Get user ID from JWT to ensure consistency with socket connection
    const userId = await getUserIdFromJWT(getToken);
    console.log('🔑 Using user ID for ride booking:', userId);
    
    const rideRequest = {
      pickup,
      drop: {
        id: dropLocation?.id || '1',
        name: dropLocation?.name || dropLocation?.address || 'Drop Location',
        address: dropLocation?.address || dropLocation?.name || 'Drop Location',
        latitude: dropLocation?.latitude,
        longitude: dropLocation?.longitude,
        type: dropLocation?.type || 'recent',
      },
      rideType: 'Bike',
      price: Math.floor(Math.random() * 50) + 20, // Random price for demo
      userId: userId,
    };
    console.log('🚗 Sending ride booking request:', rideRequest);
    
    try {
      const success = bookRide(rideRequest);
      if (success) {
        setIsBookingRide(true);
        Alert.alert('Booking Ride...', 'Request sent to server!');
      } else {
        throw new Error('Failed to send ride request');
      }
    } catch (error) {
      console.error('❌ Ride booking failed:', error);
      Alert.alert('Booking Failed', 'Unable to book ride. Please check your connection and try again.');
    }
  };

  // Add this function to fetch and log the custom JWT
  const fetchCustomJWT = async () => {
    try {
      const token = await getToken({ template: 'my_app_token' });
      console.log('Custom Clerk JWT:', token);
      // Optionally, you can show an alert or copy to clipboard
    } catch (err) {
      console.error('Failed to fetch custom JWT:', err);
    }
  };

  // Button handler to send custom JWT to backend
  const handleSendCustomJWT = async () => {
    try {
      const token = await getToken({ template: 'my_app_token' });
      console.log('Custom Clerk JWT:', token);
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/users/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      let result = null;
      try {
        const text = await response.text();
        result = text ? JSON.parse(text) : null;
      } catch (e) {
        result = null;
      }
      console.log('Backend response:', result, 'Status:', response.status);
      if (response.status >= 200 && response.status < 300) {
        Alert.alert('Success', 'Custom JWT sent to backend!');
      }
    } catch (err) {
      console.error('Failed to send custom JWT to backend:', err);
    }
  };


  return (
    <SafeAreaView style={styles.container}>
      <ConnectionStatus />
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.menuButton}>
            <Ionicons name="map" size={24} color={Colors.text} />
          </TouchableOpacity>
          <View>
            <Text style={styles.greeting}>{getGreeting()}!</Text>
            <Text style={styles.userName}>{getUserName()}</Text>
          </View>
        </View>
        {/* Debug buttons moved to Profile screen */}
      </View>

      <View style={styles.mapFullScreen}>
        <MapView
          style={StyleSheet.absoluteFill}
          region={region}
          showsUserLocation={true}
          showsMyLocationButton={true}
        >
          {pickupLocation && (
            <Marker
              coordinate={{
                latitude: pickupLocation.latitude,
                longitude: pickupLocation.longitude,
              }}
              title={pickupLocation.address || 'Pickup Location'}
              pinColor={'green'}
            />
          )}
          {dropoffLocation && (
            <Marker
              coordinate={{
                latitude: dropoffLocation.latitude,
                longitude: dropoffLocation.longitude,
              }}
              title={dropoffLocation.address || 'Destination'}
              pinColor={'red'}
            />
          )}
          {driverLocation && (
            <Marker
              coordinate={driverLocation}
              title="Driver Location"
              pinColor={'blue'}
            />
          )}
        </MapView>
        {/* Current Location Button */}
        <TouchableOpacity
          style={[styles.currentLocationButton, { bottom: getFloatingBottom(Layout.spacing.md) }]}
          onPress={async () => {
            let loc = await Location.getCurrentPositionAsync({});
            const coords = {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              address: 'Current Location',
            };
            setCurrentLocation(coords);
            setPickupLocation(coords);
            setRegion({
              latitude: coords.latitude,
              longitude: coords.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            });
          }}
        >
          <Ionicons name="locate" size={20} color={Colors.primary} />
        </TouchableOpacity>
        {/* Where to? Card Overlay */}
        <View style={[styles.whereToCard, { bottom: getFloatingBottom() }]}>
          <Text style={styles.whereToTitle}>Where to?</Text>
          <TouchableOpacity style={styles.whereToRow} activeOpacity={0.7}>
            <View style={[styles.dot, { backgroundColor: 'green' }]} />
            <Text style={styles.whereToText}>Current Location</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.whereToRow}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('DropLocationSelector')}
          >
            <View style={[styles.dot, { backgroundColor: 'red' }]} />
            <Text style={styles.whereToText}>
              {dropLocation ? dropLocation.name : 'Where are you going?'}
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#aaa" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        </View>
      </View>
      
     

      {/* Ride Status Modal */}
      <Modal
        visible={showRideModal}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Ride Accepted!</Text>
            {currentRide?.driverName && (
              <Text style={styles.modalText}>Pilot: {currentRide.driverName}</Text>
            )}
            {currentRide?.estimatedArrival && (
              <Text style={styles.modalText}>ETA: {currentRide.estimatedArrival}</Text>
            )}
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowRideModal(false)}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    marginRight: Layout.spacing.md,
  },
  greeting: {
    fontSize: Layout.fontSize.sm,
    color: Colors.textSecondary,
  },
  userName: {
    fontSize: Layout.fontSize.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  notificationButton: {
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.coral,
  },
  // Debug button styles removed - moved to Profile screen

  mapFullScreen: {
    flex: 1,
    position: 'relative',
  },
  currentLocationButton: {
    position: 'absolute',
    bottom: Layout.spacing.md,
    right: Layout.spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bookingCard: {
    backgroundColor: Colors.white,
    marginHorizontal: Layout.spacing.lg,
    marginBottom: Layout.spacing.lg,
    borderRadius: Layout.borderRadius.lg,
    padding: Layout.spacing.lg,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: Layout.fontSize.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Layout.spacing.lg,
  },
  locationInput: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Layout.spacing.md,
  },
  locationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
    marginRight: Layout.spacing.md,
  },
  destinationDot: {
    backgroundColor: Colors.coral,
  },
  locationText: {
    flex: 1,
    fontSize: Layout.fontSize.md,
    color: Colors.text,
  },
  locationPlaceholder: {
    flex: 1,
    fontSize: Layout.fontSize.md,
    color: Colors.gray400,
  },
  locationDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginLeft: 24,
    marginVertical: Layout.spacing.xs,
  },
  quickActions: {
    paddingHorizontal: Layout.spacing.lg,
    marginBottom: Layout.spacing.lg,
  },
  sectionTitle: {
    fontSize: Layout.fontSize.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Layout.spacing.md,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: (width - Layout.spacing.lg * 3) / 2,
    backgroundColor: Colors.white,
    borderRadius: Layout.borderRadius.lg,
    padding: Layout.spacing.lg,
    alignItems: 'center',
    marginBottom: Layout.spacing.md,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.gray50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Layout.spacing.sm,
  },
  actionText: {
    fontSize: Layout.fontSize.sm,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  savedPlaces: {
    paddingHorizontal: Layout.spacing.lg,
    marginBottom: Layout.spacing.lg,
  },
  savedPlaceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Layout.borderRadius.md,
    padding: Layout.spacing.md,
    marginBottom: Layout.spacing.sm,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  savedPlaceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.gray50,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Layout.spacing.md,
  },
  savedPlaceInfo: {
    flex: 1,
  },
  savedPlaceName: {
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  savedPlaceAddress: {
    fontSize: Layout.fontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  promoBanner: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    marginHorizontal: Layout.spacing.lg,
    marginBottom: Layout.spacing.lg,
    borderRadius: Layout.borderRadius.lg,
    padding: Layout.spacing.lg,
    alignItems: 'center',
  },
  promoContent: {
    flex: 1,
  },
  promoTitle: {
    fontSize: Layout.fontSize.lg,
    fontWeight: 'bold',
    color: Colors.white,
  },
  promoSubtitle: {
    fontSize: Layout.fontSize.sm,
    color: Colors.white,
    opacity: 0.9,
    marginTop: 2,
    marginBottom: Layout.spacing.md,
  },
  promoButton: {
    backgroundColor: Colors.white,
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    borderRadius: Layout.borderRadius.sm,
    alignSelf: 'flex-start',
  },
  promoButtonText: {
    fontSize: Layout.fontSize.sm,
    fontWeight: '600',
    color: Colors.primary,
  },
  promoIcon: {
    marginLeft: Layout.spacing.md,
  },
  bookingCardFloating: {
    position: 'absolute',
    left: Layout.spacing.sm,
    right: Layout.spacing.sm,
    bottom: Layout.spacing.sm, // leave space for bottom nav
    backgroundColor: Colors.white,
    borderRadius: Layout.borderRadius.lg,
    padding: Layout.spacing.lg,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  whereToCard: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 24,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 6,
  },
  whereToTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  whereToRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 14,
  },
  whereToText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.gray200,
    marginVertical: 4,
    borderRadius: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    width: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 10,
  },
  modalText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  modalButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  modalButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});