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
import Constants from 'expo-constants';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import { mockLocations } from '../../data/mockData';
import { getGreeting, useAssignUserType, useSafeAreaWithTabBar } from '../../utils/helpers';
import { logger } from '../../utils/logger';
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
import { useTranslation } from 'react-i18next';
import { useServiceAvailability } from '../../hooks/useServiceAvailability';
import ServiceAvailabilityBanner from '../../components/ServiceAvailabilityBanner';
// JWTLoggingTest import - REMOVED

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation, route }: any) {
  const { user } = useUser();
  const { insets, getFloatingBottom } = useSafeAreaWithTabBar();
  const { t } = useTranslation();
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
    latitude: 17.3850, // Default: Hyderabad
    longitude: 78.4867,
    latitudeDelta: 0.0054, // Approximately 600 meters
    longitudeDelta: 0.0054, // Approximately 600 meters
  });

  const [dropLocation, setDropLocation] = useState<any>(null);
  const [hasSentToBackend, setHasSentToBackend] = useState(false);
  
  // New state for ride booking
  const [isBookingRide, setIsBookingRide] = useState(false);
  const [currentRide, setCurrentRide] = useState<any>(null);
  const [driverLocation, setDriverLocation] = useState<any>(null);
  const [rideStatus, setRideStatus] = useState<string>('');
  const [showRideModal, setShowRideModal] = useState(false);

  // Service availability check
  const { checkRideAvailability, isAvailable, message, isChecking } = useServiceAvailability();
  // JWT Test state - REMOVED

  useAssignUserType('customer');

  // Auto-check service availability when dropLocation changes
  useEffect(() => {
    if (dropLocation && dropLocation.latitude && dropLocation.longitude) {
      logger.debug('📍 Auto-checking service availability for new drop location');
      // Get current location for pickup
      (async () => {
        try {
          let { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            let loc = await Location.getCurrentPositionAsync({});
            checkRideAvailability(
              { latitude: loc.coords.latitude, longitude: loc.coords.longitude },
              { latitude: dropLocation.latitude, longitude: dropLocation.longitude }
            );
          }
        } catch (error) {
          console.error('Failed to check service availability:', error);
        }
      })();
    }
  }, [dropLocation, checkRideAvailability]);

  // On mount, get current location and set as pickup if not set
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }
      let loc = await Location.getCurrentPositionAsync({});
      
      // Reverse geocode to get actual address
      let currentAddress = t('home.currentLocation');
      let currentName = t('home.currentLocation');
      
      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${loc.coords.latitude},${loc.coords.longitude}&key=${Constants.expoConfig?.extra?.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY}`
        );
        const data = await response.json();
        if (data.status === 'OK' && data.results.length > 0) {
          const result = data.results[0];
          currentAddress = result.formatted_address;
          
          // Extract location name from address components
          const locality = result.address_components?.find((comp: any) =>
            comp.types.includes('locality') || comp.types.includes('sublocality')
          );
          if (locality) {
            currentName = locality.long_name;
          } else {
            currentName = result.formatted_address.split(',')[0];
          }
        }
      } catch (geocodeError) {
        logger.debug('Failed to reverse geocode current location, using fallback:', geocodeError);
      }
      
      const coords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        address: currentAddress,
        name: currentName,
      };
      setCurrentLocation(coords);
      if (!pickupLocation) {
        setPickupLocation(coords);
      }
      setRegion({
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.0054, // Approximately 600 meters
        longitudeDelta: 0.0054, // Approximately 600 meters
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
        latitudeDelta: 0.0054, // Maintain 600-meter zoom
        longitudeDelta: 0.0054, // Maintain 600-meter zoom
      }));
    } else if (pickupLocation && pickupLocation.latitude && pickupLocation.longitude) {
      setRegion((prev) => ({
        ...prev,
        latitude: pickupLocation.latitude,
        longitude: pickupLocation.longitude,
        latitudeDelta: 0.0054, // Maintain 600-meter zoom
        longitudeDelta: 0.0054, // Maintain 600-meter zoom
      }));
    }
  }, [pickupLocation, dropoffLocation]);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      logger.debug('Clerk JWT token:', token);
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
          logger.debug('❌ No JWT token available or failed to decode');
          return;
        }
        
        // Send JWT to backend
        logger.debug('🌐 Sending JWT to backend...');
        logger.debug('🔑 Full JWT Token being sent:');
        logger.debug(decodedJWT ? 'Token available' : 'No token');
        
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
        
        logger.debug('📡 Backend Response:');
        logger.debug(`  ✅ Status: ${response.status} ${response.statusText}`);
        logger.debug(`  📦 Data:`, result);
        logger.debug(`  📏 Response Size: ${responseText?.length || 0} characters`);
        
        setHasSentToBackend(true);
        logger.debug('✅ === JWT LOGGING COMPLETED ===');
        
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
      logger.debug('🔗 HomeScreen: Socket connected successfully');
      
      // Set up event callbacks
      onRideBooked((data) => {
        logger.debug('✅ HomeScreen: Ride booked:', data);
        setCurrentRide({
          rideId: data.rideId,
          price: data.price,
          status: 'searching'
        });
        setIsBookingRide(true);
        
        // Navigate directly to FindingDriver screen without showing popup
        logger.debug('🎯 Navigating to FindingDriver after ride booked');
        navigation.navigate('FindingDriver', {
          rideId: data.rideId,
          price: data.price,
          status: 'searching',
          destination: dropoffLocation || { address: 'Destination' },
          pickup: pickupLocation || { address: 'Hyderabad, Telangana, India' },
          estimate: {
            fare: data.price,
            distance: '2.5 km',
            duration: '8 mins',
            eta: '5 mins',
          },
          paymentMethod: 'Cash',
          driver: null,
        });
      });

      onRideAccepted((data) => {
        logger.debug('✅ HomeScreen: Ride accepted by driver:', data);
        
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
        setRideStatus(t('home.pilotAcceptedRide'));
        setShowRideModal(true);
        Alert.alert(t('home.pilotFound'), `${transformedDriverName} ${t('home.willArriveIn')} ${data.estimatedArrival}`);
      });

      onDriverLocation((data) => {
        logger.debug('📍 HomeScreen: Driver location update:', data);
        setDriverLocation({
          latitude: data.latitude,
          longitude: data.longitude
        });
      });

      onRideStatus((data) => {
        logger.debug('🔄 HomeScreen: Ride status update:', data);
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
        logger.debug('🔴 HomeScreen: Driver went offline:', data);
        Alert.alert(t('home.pilotOffline'), t('home.pilotWentOffline'));
      });

      // Cleanup callbacks on unmount
      return () => {
        logger.debug('🧹 HomeScreen: Cleaning up socket callbacks');
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
      Alert.alert(t('home.selectDestination'), t('home.pleaseSelectDestination'));
      return;
    }

    // Check service availability for both pickup and drop locations
    logger.debug('📍 === CHECKING SERVICE AVAILABILITY ===');
    
    try {
      // Get current location for pickup
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('home.locationPermissionRequired'));
        return;
      }
      
      let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      const pickup = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        address: t('home.currentLocation'),
        name: t('home.currentLocation'),
      };
      
      logger.debug('📍 Pickup location:', pickup);
      logger.debug('🎯 Drop location:', dropLocation);
      
      await checkRideAvailability(
        { latitude: pickup.latitude, longitude: pickup.longitude },
        { latitude: dropLocation.latitude, longitude: dropLocation.longitude }
      );
      
      if (!isAvailable) {
        Alert.alert(
          'Service Unavailable', 
          message || 'Service is not available for the selected route. Please choose locations within Hyderabad service area.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      logger.debug('✅ Service availability check passed');
    } catch (error) {
      console.error('❌ Service availability check failed:', error);
      Alert.alert(
        'Service Check Failed', 
        'Unable to verify service availability. Please try again.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsBookingRide(true);

    try {
      logger.debug('🚗 === STARTING RIDE BOOKING PROCESS ===');
      logger.debug('🔍 === DETAILED BOOKING FLOW LOG ===');

      // Step 1: Ensure socket is connected before booking
      logger.debug('🔌 Step 1: Connecting socket...');
      await connectSocketWithJWT(getToken);
      logger.debug('✅ Socket ready for ride booking');

      // Step 2: Fetch real-time GPS location
      logger.debug('📍 Step 2: Fetching GPS location...');
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('home.locationPermissionRequired'));
        setIsBookingRide(false);
        return;
      }
      
      let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      logger.debug('📍 Fetched GPS position:', loc.coords);
      
      const pickup = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        address: t('home.currentLocation'),
        name: t('home.currentLocation'),
      };
      
      logger.debug('📍 Pickup:', pickup);
      logger.debug('🎯 Drop:', dropLocation);
      logger.debug('drop latitude:', dropLocation?.latitude, 'drop longitude:', dropLocation?.longitude);
      
      // Step 3: Get user ID from JWT
      logger.debug('🔑 Step 3: Extracting user ID from JWT...');
      const userId = await getUserIdFromJWT(getToken);
      logger.debug('🔑 Using user ID for ride booking:', userId);
      
      // Step 4: Prepare ride request data
      logger.debug('📦 Step 4: Preparing ride request data...');
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
      
      logger.debug('🚗 Ride request data prepared:', rideRequest);

      // Step 5: Call API endpoint first
      logger.debug('🌐 === CALLING API ENDPOINT FIRST ===');
      logger.debug('🎯 Step 5: Converting to API payload...');
      const apiPayload = rideApi.convertToApiPayload(rideRequest);
      logger.debug('📦 API Payload:', apiPayload);
      
      // Create a wrapper function that handles null token
      const getTokenWrapper = async (): Promise<string> => {
        const token = await getToken();
        if (!token) {
          throw new Error('No authentication token available');
        }
        return token;
      };
      
      logger.debug('🚀 Step 6: Making API call to /api/rides/request...');
      const apiResponse: RideRequestResponse = await rideApi.requestRide(apiPayload, getTokenWrapper);
      logger.debug('✅ API Response received:', apiResponse);
      logger.debug('📊 API Response Details:');
      logger.debug('   - Ride ID:', apiResponse.id);
      logger.debug('   - Status:', apiResponse.status);
      logger.debug('   - Estimated Fare:', apiResponse.estimatedFare);
      logger.debug('   - Requested At:', apiResponse.requestedAt);
      
      // Step 7: Send Socket.IO event with API response data
      logger.debug('🔌 === SENDING SOCKET.IO EVENT WITH API DATA ===');
      const socketRideRequest = {
        ...rideRequest,
        rideId: apiResponse.id, // Use the ride ID from API response
        estimatedFare: apiResponse.estimatedFare,
        status: apiResponse.status,
      };
      
      logger.debug('🔌 Socket ride request:', socketRideRequest);
      logger.debug('📤 Attempting to emit event: request_ride');
      const socketSuccess = bookRide(socketRideRequest);
      
      if (socketSuccess) {
        logger.debug('✅ Socket.IO event sent successfully');
        
        // Update current ride state with API response
        setCurrentRide({
          rideId: apiResponse.id,
          price: apiResponse.estimatedFare,
          status: apiResponse.status,
          pickup: pickup,
          drop: dropLocation,
          requestedAt: apiResponse.requestedAt,
        });
        
        logger.debug('🎉 === RIDE BOOKING COMPLETED SUCCESSFULLY ===');
        logger.debug('📋 Final Ride Details:');
        logger.debug('   - Ride ID:', apiResponse.id);
        logger.debug('   - Estimated Fare: ₹', apiResponse.estimatedFare.toFixed(2));
        logger.debug('   - Status:', apiResponse.status);
        logger.debug('   - Pickup:', pickup);
        logger.debug('   - Drop:', dropLocation);
        
        // Alert removed - direct navigation to FindingDriver
      } else {
        console.warn('⚠️ Socket.IO event failed, but API call succeeded');
        // Alert removed - direct navigation to FindingDriver
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
      logger.debug('Custom Clerk JWT:', token);
      // Optionally, you can show an alert or copy to clipboard
    } catch (err) {
      console.error('Failed to fetch custom JWT:', err);
    }
  };

  // Button handler to send custom JWT to backend
  const handleSendCustomJWT = async () => {
    try {
      const token = await getToken({ template: 'my_app_token' });
      logger.debug('Custom Clerk JWT:', token);
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
      logger.debug('Backend response:', result, 'Status:', response.status);
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
              title={pickupLocation?.address || t('home.pickupLocation')}
              pinColor={'green'}
            />
          )}
          {dropoffLocation && dropoffLocation.latitude && dropoffLocation.longitude && (
            <Marker
              coordinate={{
                latitude: dropoffLocation.latitude,
                longitude: dropoffLocation.longitude,
              }}
              title={dropoffLocation?.address || t('home.dropLocation')}
              pinColor={'red'}
            />
          )}
          {driverLocation && (
            <Marker
              coordinate={driverLocation}
              title={t('home.driverLocation')}
              pinColor={'blue'}
            />
          )}
        </MapView>

        {/* Where to? Card Overlay */}
        <View style={[styles.whereToCard, { bottom: getFloatingBottom() }]}>
          <Text style={styles.whereToTitle}>{t('home.whereTo')}</Text>
          <TouchableOpacity style={styles.whereToRow} activeOpacity={0.7}>
            <View style={[styles.dot, { backgroundColor: 'green' }]} />
            <Text style={styles.whereToText}>{currentLocation?.address || currentLocation?.name || t('home.currentLocation')}</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.whereToRow}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('DropLocationSelector', { focusDestination: true })}
          >
            <View style={[styles.dot, { backgroundColor: 'red' }]} />
            <Text style={styles.whereToText}>
              {dropLocation ? dropLocation.name : t('home.whereAreYouGoing')}
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#aaa" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Service Availability Banner */}
      {dropLocation && dropLocation.latitude && dropLocation.longitude && (
        <ServiceAvailabilityBanner 
          status={{ 
            isAvailable: isAvailable, 
            message: message || 'Checking service availability...',
            nearestArea: 'Hyderabad'
          }}
          isLoading={isChecking}
          onRetry={() => {
            if (dropLocation) {
              (async () => {
                try {
                  let { status } = await Location.requestForegroundPermissionsAsync();
                  if (status === 'granted') {
                    let loc = await Location.getCurrentPositionAsync({});
                    checkRideAvailability(
                      { latitude: loc.coords.latitude, longitude: loc.coords.longitude },
                      { latitude: dropLocation.latitude, longitude: dropLocation.longitude }
                    );
                  }
                } catch (error) {
                  console.error('Failed to check service availability:', error);
                }
              })();
            }
          }}
          showDetails={true}
        />
      )}

      {/* Ride Status Modal */}
      <Modal
        visible={showRideModal}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('home.rideAccepted')}</Text>
            {currentRide?.driverName && (
              <Text style={styles.modalText}>{t('home.pilot')} {currentRide.driverName}</Text>
            )}
            {currentRide?.estimatedArrival && (
              <Text style={styles.modalText}>{t('home.eta')} {currentRide.estimatedArrival}</Text>
            )}
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowRideModal(false)}
            >
              <Text style={styles.modalButtonText}>{t('common.ok')}</Text>
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
