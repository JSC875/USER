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
import { getUserIdFromJWT, decodeJWT, logJWTDetails, logFullJWT } from "../../utils/jwtDecoder";
import ConnectionStatus from "../../components/common/ConnectionStatus";
import { rideApi, RideRequestResponse } from "../../services/rideService";
// JWTLoggingTest import - REMOVED

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

  const [region, setRegion] = useState({
    latitude: 28.6139, // Default: New Delhi
    longitude: 77.2090,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  const [dropLocation, setDropLocation] = useState<any>(null);
  const [hasSentToBackend, setHasSentToBackend] = useState(false);
  
  // New state for ride booking
  const [isBookingRide, setIsBookingRide] = useState(false);
  const [currentRide, setCurrentRide] = useState<any>(null);
  const [driverLocation, setDriverLocation] = useState<any>(null);
  const [rideStatus, setRideStatus] = useState<string>('');
  const [showRideModal, setShowRideModal] = useState(false);
  // JWT Test state - REMOVED

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
    if (dropoffLocation && dropoffLocation.latitude && dropoffLocation.longitude) {
      setRegion((prev) => ({
        ...prev,
        latitude: dropoffLocation.latitude,
        longitude: dropoffLocation.longitude,
      }));
    } else if (pickupLocation && pickupLocation.latitude && pickupLocation.longitude) {
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
    // Enhanced JWT logging and backend communication
    const sendCustomJWTToBackend = async () => {
      if (!user || hasSentToBackend) return;
      
      try {
        // Use comprehensive JWT logging utility
        const decodedJWT = await logJWTDetails(getToken, 'Home Screen JWT Analysis');
        if (!decodedJWT) {
          console.log('❌ No JWT token available or failed to decode');
          return;
        }
        
        // Send JWT to backend
        console.log('🌐 Sending JWT to backend...');
        console.log('🔑 Full JWT Token being sent:');
        console.log(decodedJWT ? 'Token available' : 'No token');
        
        // Get the actual token for the API call
        const token = await getToken({ template: 'my_app_token', skipCache: true });
        
        const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/users/me`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-App-Version': '1.0.0',
            'X-Platform': 'ReactNative',
            'X-Environment': 'development',
          },
        });
        
        let result = null;
        let responseText = '';
        try {
          responseText = await response.text();
          result = responseText ? JSON.parse(responseText) : null;
        } catch (e) {
          result = null; // Not JSON, or empty
        }
        
        console.log('📡 Backend Response:');
        console.log(`  ✅ Status: ${response.status} ${response.statusText}`);
        console.log(`  📦 Data:`, result);
        console.log(`  📏 Response Size: ${responseText?.length || 0} characters`);
        
        setHasSentToBackend(true);
        console.log('✅ === JWT LOGGING COMPLETED ===');
        
      } catch (err) {
        console.error('❌ === JWT LOGGING ERROR ===');
        console.error('Failed to send custom JWT to backend:', err);
      }
    };
    
    sendCustomJWTToBackend();
  }, [user, getToken, hasSentToBackend]);

  // Enhanced socket event listeners
  useEffect(() => {
    // Connect to socket using JWT with APK-specific handling
    connectSocketWithJWT(getToken).then((socket: any) => {
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
        Alert.alert(
          'Ride Booked!', 
          `Searching for pilots...\nRide ID: ${data.rideId}`,
          [
            {
              text: 'OK',
              onPress: () => {
                console.log('🎯 Navigating to FindingDriver after ride booked');
                // Navigate to FindingDriver screen with ride details
                navigation.navigate('FindingDriver', {
                  rideId: data.rideId,
                  price: data.price,
                  status: 'searching',
                  destination: dropoffLocation || { address: 'Destination' },
                  pickup: pickupLocation || { address: 'Current Location' },
                  estimate: {
                    fare: data.price,
                    distance: '2.5 km',
                    duration: '8 mins',
                    eta: '5 mins',
                  },
                  paymentMethod: 'Cash',
                  driver: null,
                });
              }
            }
          ]
        );
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

  // Test functions - REMOVED (handleLogFullJWT, handleTestRideRequest)

  const getUserName = () => {
    if (user?.firstName) {
      return user.firstName;
    } else if (user?.fullName) {
      return user.fullName.split(' ')[0];
    }
    return 'User';
  };

  // Enhanced ride booking function with API + Socket.IO integration
  const handleBookRide = async () => {
    if (!dropLocation) {
      Alert.alert('Select Destination', 'Please select a destination first.');
      return;
    }

    setIsBookingRide(true);

    try {
      console.log('🚗 === STARTING RIDE BOOKING PROCESS ===');
      console.log('🔍 === DETAILED BOOKING FLOW LOG ===');

      // Step 1: Ensure socket is connected before booking
      console.log('🔌 Step 1: Connecting socket...');
      await connectSocketWithJWT(getToken);
      console.log('✅ Socket ready for ride booking');

      // Step 2: Fetch real-time GPS location
      console.log('📍 Step 2: Fetching GPS location...');
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location permission is required to book a ride.');
        setIsBookingRide(false);
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
      
      // Step 3: Get user ID from JWT
      console.log('🔑 Step 3: Extracting user ID from JWT...');
      const userId = await getUserIdFromJWT(getToken);
      console.log('🔑 Using user ID for ride booking:', userId);
      
      // Step 4: Prepare ride request data
      console.log('📦 Step 4: Preparing ride request data...');
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
      
      console.log('🚗 Ride request data prepared:', rideRequest);

      // Step 5: Call API endpoint first
      console.log('🌐 === CALLING API ENDPOINT FIRST ===');
      console.log('🎯 Step 5: Converting to API payload...');
      const apiPayload = rideApi.convertToApiPayload(rideRequest);
      console.log('📦 API Payload:', apiPayload);
      
      // Create a wrapper function that handles null token
      const getTokenWrapper = async (): Promise<string> => {
        const token = await getToken();
        if (!token) {
          throw new Error('No authentication token available');
        }
        return token;
      };
      
      console.log('🚀 Step 6: Making API call to /api/rides/request...');
      const apiResponse: RideRequestResponse = await rideApi.requestRide(apiPayload, getTokenWrapper);
      console.log('✅ API Response received:', apiResponse);
      console.log('📊 API Response Details:');
      console.log('   - Ride ID:', apiResponse.id);
      console.log('   - Status:', apiResponse.status);
      console.log('   - Estimated Fare:', apiResponse.estimatedFare);
      console.log('   - Requested At:', apiResponse.requestedAt);
      
      // Step 7: Send Socket.IO event with API response data
      console.log('🔌 === SENDING SOCKET.IO EVENT WITH API DATA ===');
      const socketRideRequest = {
        ...rideRequest,
        rideId: apiResponse.id, // Use the ride ID from API response
        estimatedFare: apiResponse.estimatedFare,
        status: apiResponse.status,
      };
      
      console.log('🔌 Socket ride request:', socketRideRequest);
      console.log('📤 Attempting to emit event: request_ride');
      const socketSuccess = bookRide(socketRideRequest);
      
      if (socketSuccess) {
        console.log('✅ Socket.IO event sent successfully');
        
        // Update current ride state with API response
        setCurrentRide({
          rideId: apiResponse.id,
          price: apiResponse.estimatedFare,
          status: apiResponse.status,
          pickup: pickup,
          drop: dropLocation,
          requestedAt: apiResponse.requestedAt,
        });
        
        console.log('🎉 === RIDE BOOKING COMPLETED SUCCESSFULLY ===');
        console.log('📋 Final Ride Details:');
        console.log('   - Ride ID:', apiResponse.id);
        console.log('   - Estimated Fare: ₹', apiResponse.estimatedFare.toFixed(2));
        console.log('   - Status:', apiResponse.status);
        console.log('   - Pickup:', pickup);
        console.log('   - Drop:', dropLocation);
        
        Alert.alert(
          'Ride Booked Successfully! 🎉',
          `Your ride has been requested!\n\nRide ID: ${apiResponse.id}\nEstimated Fare: ₹${apiResponse.estimatedFare.toFixed(2)}\nStatus: ${apiResponse.status}\n\nSearching for pilots...`
        );
      } else {
        console.warn('⚠️ Socket.IO event failed, but API call succeeded');
        Alert.alert(
          'Ride Booked (Partial)',
          `Your ride has been requested via API!\n\nRide ID: ${apiResponse.id}\nEstimated Fare: ₹${apiResponse.estimatedFare.toFixed(2)}\n\nNote: Real-time updates may be limited.`
        );
      }
      
    } catch (error: any) {
      console.error('❌ === RIDE BOOKING FAILED ===');
      console.error('Error details:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      let errorMessage = 'Unable to book ride. Please check your connection and try again.';
      
      if (error.message?.includes('401')) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (error.message?.includes('400')) {
        errorMessage = 'Invalid ride request. Please check your pickup and drop locations.';
      } else if (error.message?.includes('500')) {
        errorMessage = 'Server error. Please try again later.';
      }
      
      Alert.alert('Booking Failed', errorMessage);
    } finally {
      setIsBookingRide(false);
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
              <View style={styles.headerRight}>
        {/* Test Payment Button - Remove in production */}
        {__DEV__ && (
          <TouchableOpacity 
            style={styles.notificationButton}
            onPress={() => {
              console.log('🧪 Test: Direct payment screen navigation');
                              navigation.navigate('WebViewPayment', {
                rideId: 'test-ride-123',
                amount: 7300, // 73 INR in paise
                destination: { name: 'Test Destination' },
                driver: { name: 'Test Driver', vehicleModel: 'Test Vehicle', vehicleNumber: 'TEST123' },
                estimate: { fare: 73 }, // 73 INR
              });
            }}
          >
            <Ionicons name="card" size={24} color="#FF6B6B" />
          </TouchableOpacity>
        )}
      </View>
      </View>

      <View style={styles.mapFullScreen}>
        <MapView
          style={StyleSheet.absoluteFill}
          region={region}
          showsUserLocation={true}
          showsMyLocationButton={true}
        >
          {pickupLocation && pickupLocation.latitude && pickupLocation.longitude && (
            <Marker
              coordinate={{
                latitude: pickupLocation.latitude,
                longitude: pickupLocation.longitude,
              }}
              title={pickupLocation?.address || 'Pickup Location'}
              pinColor={'green'}
            />
          )}
          {dropoffLocation && dropoffLocation.latitude && dropoffLocation.longitude && (
            <Marker
              coordinate={{
                latitude: dropoffLocation.latitude,
                longitude: dropoffLocation.longitude,
              }}
              title={dropoffLocation?.address || 'Destination'}
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
      {/* JWT Test Modal - REMOVED */}
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    marginRight: Layout.spacing.md,
  },
  // jwtButton styles - REMOVED
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