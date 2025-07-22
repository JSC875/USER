import React, { useRef, useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Image, ScrollView, Linking, Alert } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import BottomSheet from '@gorhom/bottom-sheet';
import Animated, { useSharedValue, withTiming, useAnimatedStyle } from 'react-native-reanimated';
import polyline from '@mapbox/polyline';
import Constants from 'expo-constants';
import { getSocket, emitEvent, onRideBooked, onRideTimeout, clearCallbacks } from '../../utils/socket';
import * as Location from 'expo-location';
import { useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useUser, useAuth } from '@clerk/clerk-expo';
import { calculateRideFare, getDistanceFromLatLonInKm } from '../../utils/helpers';
import { getUserIdFromJWT } from '../../utils/jwtDecoder';
import { Images } from '../../constants/Images';

const { width, height } = Dimensions.get('window');

// Add this at the top of the file or in a declarations.d.ts file if you have one
// declare module '@mapbox/polyline';

export async function saveCompletedRide(ride: any) {
  const history = JSON.parse(await AsyncStorage.getItem('rideHistory') || '[]');
  history.unshift(ride); // Add new ride to the top
  await AsyncStorage.setItem('rideHistory', JSON.stringify(history));
}

export default function RideOptionsScreen({ navigation, route }: any) {
  // Use pickup as a state so it can be updated when using device location
  const [pickup, setPickup] = useState(route.params?.pickup || null);
  const { drop, forWhom, friendName, friendPhone } = route.params;
  const [selected, setSelected] = useState('bike');
  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const { user } = useUser();
  const { getToken } = useAuth();
  const [rideOptions, setRideOptions] = useState<any[]>([]);

  // Calculate real ride options based on distance and duration
  useEffect(() => {
    if (pickup && drop && pickup.latitude && pickup.longitude && drop.latitude && drop.longitude) {
      const distanceKm = getDistanceFromLatLonInKm(
        pickup.latitude,
        pickup.longitude,
        drop.latitude,
        drop.longitude
      );
      
      // Estimate duration based on average speed (25 km/h for bikes)
      const durationMinutes = Math.round((distanceKm / 25) * 60);
      
      // Generate ride options with real calculations
      const options = [
        {
          id: 'bike',
          icon: 'motorbike' as any,
          label: 'Bike',
          eta: '2 mins',
          dropTime: `Drop ${new Date(Date.now() + (durationMinutes + 2) * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          tag: 'FASTEST',
          tagColor: '#22c55e',
          ...calculateRideFare(distanceKm, durationMinutes, 'bike')
        },
        {
          id: 'scooty',
          icon: 'scooter' as any,
          label: 'Electric Scooty',
          eta: '3 mins',
          dropTime: `Drop ${new Date(Date.now() + (durationMinutes + 3) * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          tag: 'NEW',
          tagColor: '#3b82f6',
          ...calculateRideFare(distanceKm, durationMinutes, 'scooty')
        },
      ];
      
      setRideOptions(options);
      console.log('Calculated ride options:', options);
    }
  }, [pickup, drop]);

  const bottomSheetRef = useRef<BottomSheet>(null);
  const mapRef = useRef<MapView>(null);
  const snapPoints = useMemo(() => ['50%', '90%'], []);
  const [routeCoords, setRouteCoords] = useState([]);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  

  const mockVehicles = [
    { id: 1, latitude: 17.443, longitude: 78.381, heading: 45 },
    { id: 2, latitude: 17.442, longitude: 78.383, heading: 90 },
    { id: 3, latitude: 17.445, longitude: 78.384, heading: 120 },
    { id: 4, latitude: 17.440, longitude: 78.379, heading: 200 },
    { id: 5, latitude: 17.4435, longitude: 78.378, heading: 300 },
    // Add more for more icons
  ];

  // Animated vehicle marker (rotation)
  const animatedMarkers = mockVehicles.map((v) => {
    const rotation = useSharedValue(v.heading);
    useEffect(() => {
      rotation.value = withTiming((v.heading + Math.random() * 30) % 360, { duration: 2000 });
    }, []);
    const style = useAnimatedStyle(() => ({
      transform: [{ rotate: `${rotation.value}deg` }],
    }));
    return { ...v, style };
  });

  // Handlers
  const handleEditPickup = () => {
    navigation.navigate('DropLocationSelector', { type: 'pickup', currentLocation: pickup, dropLocation: drop });
  };
  const handleEditDrop = () => {
    navigation.navigate('DropLocationSelector', { type: 'drop', currentLocation: pickup, dropLocation: drop });
  };
  
  const handleBook = async () => {
    // Prevent multiple bookings
    if (isBooking) {
      console.log('🚫 Booking already in progress, ignoring duplicate request');
      return;
    }

    // Validate required data
    if (!drop) {
      Alert.alert('Select Destination', 'Please select a destination first.');
      return;
    }

    setIsBooking(true);
    setBookingError(null);
    
    try {
      console.log('🚗 Starting ride booking process...');
      
      // Get the selected ride option details
      const selectedRide = rideOptions.find(o => o.id === selected);
      if (!selectedRide) {
        throw new Error('No ride option selected');
      }

      // Do NOT fetch or overwrite pickup with current location here
      // Use the existing pickup value from state (which may be pinned or current location)
      
      // Safely update map region if mapRef is ready and coordinates are valid
      if (
        mapRef.current &&
        pickup &&
        typeof pickup.latitude === 'number' &&
        typeof pickup.longitude === 'number'
      ) {
        setTimeout(() => {
          if (mapRef.current) {
            mapRef.current.animateToRegion({
              latitude: pickup.latitude,
              longitude: pickup.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }, 500);
          }
        }, 500);
      }
      
      console.log('📤 Preparing ride request data...');
      console.log('📍 Pickup:', pickup);
      console.log('🎯 Drop:', drop);
      
      // Send full pickup and drop objects
      const rideRequest = {
        pickup,
        drop: {
          id: drop.id || '1',
          name: drop.name || drop.address || 'Drop Location',
          address: drop.address || drop.name || 'Drop Location',
          latitude: drop.latitude,
          longitude: drop.longitude,
          type: drop.type || 'recent',
        },
        rideType: selectedRide?.label,
        price: selectedRide?.totalFare,
        userId: await getUserIdFromJWT(getToken), // Use JWT user ID for consistency
      };
      
      console.log('🚗 Sending ride booking request:', rideRequest);
      const success = emitEvent('request_ride', rideRequest);
      
      if (!success) {
        throw new Error('Unable to connect to server. Please check your internet connection.');
      }
      
      console.log('✅ Ride booking request sent successfully');
      
      // Don't navigate immediately - wait for server response
      // The navigation will happen in the useEffect below when we receive 'ride_booked' event
      
    } catch (error) {
      console.error('❌ Ride booking failed:', error);
      setBookingError(error instanceof Error ? error.message : 'Booking failed. Please try again.');
      Alert.alert('Booking Failed', error instanceof Error ? error.message : 'Booking failed. Please try again.');
    } finally {
      // Don't reset isBooking here - let it stay true until we get server response
      // This prevents multiple button presses
    }
  };

  useEffect(() => {
    const handleRideBooked = (data: any) => {
      console.log('✅ Ride booked response received:', data);
      
      // Reset booking state
      setIsBooking(false);
      setBookingError(null);
      
      if (data.success) {
        console.log('🎉 Ride booked successfully, navigating to FindingDriver');
        console.log('📋 Ride details:', {
          rideId: data.rideId,
          price: data.price,
          destination: drop?.address,
          pickup: pickup?.address
        });
        
        // Navigate to FindingDriver with all necessary data
        navigation.navigate('FindingDriver', { 
          destination: {
            name: drop?.name || drop?.address || 'Destination',
            latitude: drop?.latitude,
            longitude: drop?.longitude
          },
          estimate: {
            fare: data.price,
            distance: '2.5 km',
            duration: '8 mins',
            eta: '5 mins',
          },
          paymentMethod: 'Cash',
          driver: null,
          rideId: data.rideId,
          pickup, // Pass pickup location for polyline
        });
      } else {
        console.error('❌ Ride booking failed on server:', data.message);
        setBookingError(data.message || 'Unable to book ride.');
        Alert.alert('Booking Failed', data.message || 'Unable to book ride.');
      }
    };
    
    const handleRideTimeout = (data: any) => {
      console.log('⏰ Ride request timed out:', data);
      setIsBooking(false);
              setBookingError('No pilots found. Please try again.');
              Alert.alert('No Pilots Found', data.message || 'No pilots were found. Please try again.');
    };
    
    const handleRideError = (data: any) => {
      console.error('❌ Ride booking error:', data);
      setIsBooking(false);
      setBookingError(data.message || 'Booking failed. Please try again.');
      Alert.alert('Booking Error', data.message || 'Booking failed. Please try again.');
    };
    
    // Set up callbacks using the proper system
    onRideBooked(handleRideBooked);
    onRideTimeout(handleRideTimeout);
    
    return () => {
      clearCallbacks();
    };
  }, [drop, navigation, pickup]);

  // Cleanup booking state when component unmounts
  useEffect(() => {
    return () => {
      setIsBooking(false);
      setBookingError(null);
    };
  }, []);

  // Fit map to route on mount
  useEffect(() => {
    if (mapRef.current && pickup && drop) {
      setTimeout(() => {
        mapRef.current?.fitToCoordinates([pickup, drop], {
          edgePadding: { top: 120, right: 60, bottom: 320, left: 60 },
          animated: true,
        });
      }, 500);
    }
  }, [pickup, drop]);

  // Fetch route directions from current location to drop
  useEffect(() => {
    const fetchRouteDirections = async () => {
      if (!pickup || !drop) {
        setRouteCoords([]);
        return;
      }
      const apiKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${pickup.latitude},${pickup.longitude}&destination=${drop.latitude},${drop.longitude}&key=${apiKey}`;
      try {
        const response = await fetch(url);
        const json = await response.json();
        if (json.routes && json.routes.length) {
          const points = polyline.decode(json.routes[0].overview_polyline.points);
          const coords = points.map((point: [number, number]) => ({ latitude: point[0], longitude: point[1] }));
          setRouteCoords(coords);
        } else {
          setRouteCoords([]);
        }
      } catch (error) {
        setRouteCoords([]);
      }
    };
    fetchRouteDirections();
  }, [pickup, drop]);

  // Dynamically update current location marker as user moves
  useEffect(() => {
    let locationSubscription: any;
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        locationSubscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 2000, distanceInterval: 2 },
          (loc) => setLocation(loc.coords)
        );
      }
    })();
    return () => {
      if (locationSubscription) locationSubscription.remove();
    };
  }, []);

  // Using pickup and drop from route.params - no need for useState

  console.log('rideOptions:', rideOptions);

  return (
    <View style={styles.container}>
      {/* Map Section at the Top */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={pickup && drop ? {
            latitude: (pickup.latitude + drop.latitude) / 2,
            longitude: (pickup.longitude + drop.longitude) / 2,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          } : {
            latitude: 20.5937, // fallback to India center
            longitude: 78.9629,
            latitudeDelta: 10,
            longitudeDelta: 10,
          }}
          showsUserLocation
        >
          {/* Render the route from current location (blue dot) to destination (red pin) */}
          {pickup && drop && routeCoords.length > 0 && (
            <Polyline
              coordinates={routeCoords}
              strokeColor="#222"
              strokeWidth={4}
            />
          )}
          {/* Pickup Marker (green pin) */}
          {pickup && (
            <Marker coordinate={pickup} pinColor="#22c55e">
              <Ionicons name="location-sharp" size={32} color="#22c55e" />
            </Marker>
          )}
          {/* Drop Marker (red pin) */}
          {drop && (
            <Marker coordinate={drop} pinColor="#ef4444">
              <Ionicons name="location-sharp" size={32} color="#ef4444" />
            </Marker>
          )}
          {/* Animated Vehicle Markers */}
          {animatedMarkers.map((v) => (
            <Marker key={v.id} coordinate={v} anchor={{ x: 0.5, y: 0.5 }}>
              <Animated.View style={v.style}>
                <Image
                  source={Images.ICON_ANIMATION_1}
                  style={{ width: 32, height: 32, resizeMode: 'contain' }}
                />
              </Animated.View>
            </Marker>
          ))}
          {/* Current Location Marker (green pin) - updates dynamically */}
          {/* Remove the green pin for the user's current GPS location. Only show the green pin for the selected pickup location. */}
        </MapView>
        {/* Chips overlay */}
        <View style={styles.chipContainer} pointerEvents="box-none">
          <View style={[styles.chip, { left: width * 0.25, top: 30 }]}> 
            <Text numberOfLines={1} style={styles.chipText}>{pickup.address}</Text>
            <TouchableOpacity onPress={handleEditPickup} style={styles.chipEdit}>
              <Ionicons name="pencil" size={16} color="#222" />
            </TouchableOpacity>
          </View>
          <View style={[styles.chip, { left: width * 0.55, top: 80 }]}> 
            <Text numberOfLines={1} style={styles.chipText}>{drop.address}</Text>
            <TouchableOpacity onPress={handleEditDrop} style={styles.chipEdit}>
              <Ionicons name="pencil" size={16} color="#222" />
            </TouchableOpacity>
          </View>
        </View>
       
      </View>
      {/* Bottom Sheet and rest of the UI */}
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#fff' }}>
        <View style={{
          backgroundColor: '#fff',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingBottom: 24,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 8,
        }}>
          <View style={{ paddingHorizontal: 16, paddingTop: 16, maxHeight: height * 0.35 }}>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: height * 0.35 }}>
              {rideOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.rideOption,
                    selected === opt.id && styles.rideOptionSelected,
                    selected === opt.id && styles.rideOptionShadow,
                  ]}
                  onPress={() => setSelected(opt.id)}
                  activeOpacity={0.8}
                >
                  {/* Replace icon with logo */}
                  <Image
                    source={Images.ICON_ANIMATION}
                    style={{ width: 32, height: 32, marginRight: 16, resizeMode: 'contain' }}
                  />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 1 }}>
                      <Text style={styles.rideLabel}>{opt.label}</Text>
                      {/* Person icon and seat count */}
                      <Ionicons name="person" size={16} color="#222" style={{ marginLeft: 6, marginRight: 2 }} />
                      <Text style={{ fontWeight: '600', color: '#222', fontSize: 14 }}>1</Text>
                    </View>
                    {/* Subtitle */}
                    {opt.id === 'bike' && <Text style={styles.rideSubtitle}>Quick Bike rides</Text>}
                    {opt.id === 'auto' && <Text style={styles.rideSubtitle}>Auto rickshaw rides</Text>}
                   
                    <Text style={styles.rideMeta}>{opt.eta} • {opt.dropTime}</Text>
                  </View>
                  {opt.tag && (
                    <View style={[styles.tag, { backgroundColor: opt.tagColor || '#fbbf24' }]}> 
                      <Text style={styles.tagText}>{opt.tag}</Text>
                    </View>
                  )}
                  <Text style={styles.ridePrice}>₹{opt.totalFare}</Text>
                  {/* Checkmark for selected */}
                  {selected === opt.id && <Ionicons name="checkmark" size={22} color="#22c55e" style={{ marginLeft: 8 }} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          {/* Divider */}
          <View style={{ height: 1, backgroundColor: '#f3f4f6', marginHorizontal: 16, marginTop: 8, marginBottom: 0, borderRadius: 1 }} />
          {/* Sticky Bar */}
          <View style={styles.stickyBar}>
            <TouchableOpacity
              style={[styles.stickyBtn, { flex: 1, borderRightWidth: 1, borderRightColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' }]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Payment')}
            >
              <Ionicons name="cash-outline" size={22} color="#222" style={{ marginRight: 8 }} />
              <Text style={styles.stickyBtnText}>Cash</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.stickyBtn, { flex: 1, alignItems: 'center', justifyContent: 'center' }]} activeOpacity={0.7}>
              <Ionicons name="pricetag-outline" size={22} color="#22c55e" style={{ marginRight: 8 }} />
              <Text style={[styles.stickyBtnText, { color: '#22c55e' }]}>% Offers</Text>
            </TouchableOpacity>
          </View>
          {/* Book Button - make sure this is OUTSIDE the ScrollView and stickyBar */}
          <TouchableOpacity 
            style={[
              styles.bookBtnFullGreen, 
              isBooking && styles.bookBtnDisabled
            ]} 
            onPress={handleBook} 
            activeOpacity={0.85}
            disabled={isBooking}
          >
            {isBooking ? (
              <View style={styles.loadingContainer}>
                <LoadingSpinner size="small" color="#fff" />
                <Text style={styles.bookBtnTextFullGreen}>Booking...</Text>
              </View>
            ) : (
              <Text style={styles.bookBtnTextFullGreen}>
                Book {rideOptions.find(o => o.id === selected)?.label || 'ride'}
              </Text>
            )}
          </TouchableOpacity>
          {bookingError && (
            <Text style={styles.bookingErrorText}>{bookingError}</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  mapContainer: {
    width: '100%',
    height: '55%',
    position: 'relative',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  chipContainer: { position: 'absolute', width: '100%', zIndex: 10 },
  chip: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    minWidth: 120,
    maxWidth: 180,
  },
  chipText: { fontWeight: '600', color: '#222', flex: 1, marginRight: 8 },
  chipEdit: { padding: 4 },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 20,
  },
  sheetContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 80,
  },
  rideOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  rideOptionSelected: {
    borderColor: '#22c55e',
    backgroundColor: '#e7fbe9',
    shadowOpacity: 0.10,
    elevation: 2,
  },
  rideOptionShadow: {
    borderColor: '#22c55e',
    backgroundColor: '#f0fdf4',
    borderWidth: 2,
  },
  rideLabel: { fontWeight: '700', fontSize: 16, color: '#222' },
  rideMeta: { color: '#64748b', fontSize: 13, marginTop: 1 },
  ridePrice: { fontWeight: '700', fontSize: 18, color: '#222', marginLeft: 12 },
  tag: {
    backgroundColor: '#fbbf24',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 8,
    alignSelf: 'flex-start',
  },
  tagText: { color: '#fff', fontWeight: '700', fontSize: 11 },
  stickyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 10,
    marginTop: 0,
    marginBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 20,
  },
  stickyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 0,
    paddingHorizontal: 0,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  stickyBtnText: { fontWeight: '700', color: '#222', fontSize: 14 },
  bookBtnFullGreen: {
    width: '90%',
    alignSelf: 'center',
    backgroundColor: '#22c55e',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 16,
    marginBottom: 12,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  bookBtnTextFullGreen: {
    fontWeight: 'bold',
    color: '#fff',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  addStopBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    zIndex: 10,
  },
  addStopBackBtn: { padding: 4 },
  addStopText: { fontWeight: '700', color: '#222', fontSize: 15, marginLeft: 8 },
  rideSubtitle: { color: '#64748b', fontSize: 13, marginTop: 1 },
  bottomAreaWrapper: { flex: 1, justifyContent: 'flex-end' },
  bookingErrorText: {
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 10,
    fontSize: 14,
  },
  bookBtnDisabled: {
    backgroundColor: '#9ca3af',
    opacity: 0.7,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
}); 