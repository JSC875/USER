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
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import { onRideStatus, onDriverLocation, onRideCompleted, clearCallbacks } from '../../utils/socket';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Images } from '../../constants/Images';
import ConnectionStatus from '../../components/common/ConnectionStatus';
import PinDisplay from '../../components/common/PinDisplay';
import { useAuth } from '@clerk/clerk-expo';
import { rideService } from '../../services/rideService';
import { useNotifications } from '../../store/NotificationContext';
import BackendNotificationService from '../../services/backendNotificationService';

export default function LiveTrackingScreen({ navigation, route }: any) {
  const { destination, estimate, driver, rideId, origin, driverArrived } = route.params;
  const { getToken } = useAuth();
  const { getStoredToken } = useNotifications();
  
  console.log('🚀 LiveTrackingScreen: Component initialized with params:', {
    destination,
    estimate,
    driver,
    rideId,
    origin
  });
  
  const [rideStatus, setRideStatus] = useState('arriving');
  const [callModalVisible, setCallModalVisible] = useState(false);
  const [driverLocation, setDriverLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [driverPath, setDriverPath] = useState<{latitude: number, longitude: number}[]>([]);
  const [otpCode, setOtpCode] = useState('0824'); // Default fallback
  const [pilotName, setPilotName] = useState('Anderson'); // Default fallback
  const [driverRating, setDriverRating] = useState<number | null>(null); // Driver rating from backend
  const [isNewDriver, setIsNewDriver] = useState(false); // Track if driver is new
  const [driverPhoneNumber, setDriverPhoneNumber] = useState<string | null>(null); // Real phone number from backend
  const [realDriverName, setRealDriverName] = useState<string | null>(null); // Real driver name from backend
  const [isLoadingRideData, setIsLoadingRideData] = useState(true);

  // Debug effect to log when driverRating changes
  useEffect(() => {
    console.log('⭐ LiveTrackingScreen: Driver rating state changed to:', driverRating);
    console.log('⭐ LiveTrackingScreen: Is new driver:', isNewDriver);
  }, [driverRating, isNewDriver]);

  // Temporary test: Force rating for debugging
  useEffect(() => {
    console.log('🧪 LiveTrackingScreen: Setting test rating for debugging');
    setDriverRating(0);
    setIsNewDriver(true);
  }, []);

  // Transform driver name to replace "Driver" with "Pilot" if it contains "Driver"
  const transformDriverName = (name: string) => {
    if (name && name.includes('Driver')) {
      return name.replace(/Driver/g, 'Pilot');
    }
    return name;
  };

  // Handle driver arrived notification
  const handleDriverArrived = async () => {
    try {
      console.log('🚗 Driver arrived at pickup location');
      
      // Get the user's push token
      const tokenData = await getStoredToken();
      if (tokenData?.token) {
        const backendService = BackendNotificationService.getInstance();
        await backendService.sendDriverArrivedNotification(tokenData.token, {
          rideId: rideId,
          driverId: driver?.id || 'unknown',
          driverName: driverInfo.name,
          pickupLocation: origin?.name || 'Your pickup location'
        });
        console.log('✅ Driver arrived notification sent');
      }
      
      // Update ride status
      setRideStatus('arrived');
    } catch (error) {
      console.error('❌ Error sending driver arrived notification:', error);
    }
  };
  
  const driverInfo = {
    ...driver,
    name: driver?.name ? transformDriverName(driver.name) : pilotName
  };
  
  console.log('🚀 LiveTrackingScreen: Initial state:', {
    rideStatus,
    driverInfo,
    otpCode,
    pilotName,
    driverRating
  });

  // Fetch ride details from backend to get real OTP and pilot name
  useEffect(() => {
    const fetchRideDetails = async () => {
      if (!rideId || !getToken) {
        console.log('⚠️ LiveTrackingScreen: Missing rideId or getToken, skipping API call');
        setIsLoadingRideData(false);
        return;
      }

      try {
        console.log('🔍 LiveTrackingScreen: Fetching ride details from backend...');
        console.log('🎯 Ride ID:', rideId);
        
        const token = await getToken();
        const response = await rideService.getRideDetailsForOTP(rideId, token || undefined);
        
        if (response.success && response.data) {
          console.log('✅ LiveTrackingScreen: Successfully fetched ride details:', response.data);
          console.log('🔍 LiveTrackingScreen: Full response data structure:', JSON.stringify(response.data, null, 2));
          
          // Update OTP from backend
          if (response.data.otp) {
            console.log('🔐 LiveTrackingScreen: Setting OTP from backend:', response.data.otp);
            setOtpCode(response.data.otp);
          }
          
          // Update pilot name from backend - check multiple possible fields
          let pilotNameFromBackend = null;
          
          if (response.data.driver?.firstName) {
            pilotNameFromBackend = response.data.driver.firstName;
            console.log('👨‍✈️ LiveTrackingScreen: Found pilot name in driver.firstName:', pilotNameFromBackend);
          } else if (response.data.driver?.name) {
            pilotNameFromBackend = response.data.driver.name;
            console.log('👨‍✈️ LiveTrackingScreen: Found pilot name in driver.name:', pilotNameFromBackend);
          } else if (response.data.pilot?.firstName) {
            pilotNameFromBackend = response.data.pilot.firstName;
            console.log('👨‍✈️ LiveTrackingScreen: Found pilot name in pilot.firstName:', pilotNameFromBackend);
          } else if (response.data.pilot?.name) {
            pilotNameFromBackend = response.data.pilot.name;
            console.log('👨‍✈️ LiveTrackingScreen: Found pilot name in pilot.name:', pilotNameFromBackend);
          }
          
          if (pilotNameFromBackend) {
            // Don't transform the name, use it as is from backend
            console.log('👨‍✈️ LiveTrackingScreen: Setting pilot name from backend:', pilotNameFromBackend);
            setPilotName(pilotNameFromBackend);
            setRealDriverName(pilotNameFromBackend); // Store in real driver name state
          } else {
            console.warn('⚠️ LiveTrackingScreen: No pilot name found in backend response');
          }
          
          // Update driver rating from backend - check multiple possible fields
          let ratingFromBackend = null;
          
          console.log('🔍 LiveTrackingScreen: Checking for driver rating in response data...');
          console.log('🔍 LiveTrackingScreen: driver object:', response.data.driver);
          console.log('🔍 LiveTrackingScreen: pilot object:', response.data.pilot);
          
          if (response.data.driver?.rating !== null && response.data.driver?.rating !== undefined) {
            ratingFromBackend = response.data.driver.rating;
            console.log('⭐ LiveTrackingScreen: Found driver rating in driver.rating:', ratingFromBackend);
          } else if (response.data.pilot?.rating !== null && response.data.pilot?.rating !== undefined) {
            ratingFromBackend = response.data.pilot.rating;
            console.log('⭐ LiveTrackingScreen: Found driver rating in pilot.rating:', ratingFromBackend);
          } else if (response.data.driver?.averageRating !== null && response.data.driver?.averageRating !== undefined) {
            ratingFromBackend = response.data.driver.averageRating;
            console.log('⭐ LiveTrackingScreen: Found driver rating in driver.averageRating:', ratingFromBackend);
          } else if (response.data.pilot?.averageRating !== null && response.data.pilot?.averageRating !== undefined) {
            ratingFromBackend = response.data.pilot.averageRating;
            console.log('⭐ LiveTrackingScreen: Found driver rating in pilot.averageRating:', ratingFromBackend);
          } else if (response.data.driver?.driverRating !== null && response.data.driver?.driverRating !== undefined) {
            ratingFromBackend = response.data.driver.driverRating;
            console.log('⭐ LiveTrackingScreen: Found driver rating in driver.driverRating:', ratingFromBackend);
          } else if (response.data.pilot?.driverRating !== null && response.data.pilot?.driverRating !== undefined) {
            ratingFromBackend = response.data.pilot.driverRating;
            console.log('⭐ LiveTrackingScreen: Found driver rating in pilot.driverRating:', ratingFromBackend);
          }
          
          console.log('🔍 LiveTrackingScreen: Final ratingFromBackend value:', ratingFromBackend);
          
          // Fix: Check if rating exists (including 0) instead of just truthy values
          if (ratingFromBackend !== null && ratingFromBackend !== undefined) {
            console.log('⭐ LiveTrackingScreen: Setting driver rating from backend:', ratingFromBackend);
            const ratingValue = parseFloat(String(ratingFromBackend));
            console.log('⭐ LiveTrackingScreen: Parsed rating value:', ratingValue);
            // If rating is 0, it means no rating yet, so we can show a default or skip
            if (ratingValue > 0) {
              setDriverRating(ratingValue);
              setIsNewDriver(false);
              console.log('⭐ LiveTrackingScreen: Set as rated driver with rating:', ratingValue);
            } else {
              console.log('⭐ LiveTrackingScreen: Driver has no rating yet (rating: 0)');
              // Show "New Driver" indicator for drivers with rating 0
              setDriverRating(0);
              setIsNewDriver(true);
              console.log('⭐ LiveTrackingScreen: Set as new driver');
            }
          } else {
            console.warn('⚠️ LiveTrackingScreen: No driver rating found in backend response');
            // Don't set fallback rating - only show when real data is available
          }
          
          // Update driver phone number from backend - check multiple possible fields
          let phoneFromBackend = null;
          
          console.log('📞 LiveTrackingScreen: Checking for driver phone in response data...');
          console.log('📞 LiveTrackingScreen: driver object:', response.data.driver);
          console.log('📞 LiveTrackingScreen: pilot object:', response.data.pilot);
          
          if (response.data.driver?.phoneNumber) {
            phoneFromBackend = response.data.driver.phoneNumber;
            console.log('📞 LiveTrackingScreen: Found driver phone in driver.phoneNumber:', phoneFromBackend);
          } else if (response.data.pilot?.phoneNumber) {
            phoneFromBackend = response.data.pilot.phoneNumber;
            console.log('📞 LiveTrackingScreen: Found driver phone in pilot.phoneNumber:', phoneFromBackend);
          } else if (response.data.driver?.phone) {
            phoneFromBackend = response.data.driver.phone;
            console.log('📞 LiveTrackingScreen: Found driver phone in driver.phone:', phoneFromBackend);
          } else if (response.data.pilot?.phone) {
            phoneFromBackend = response.data.pilot.phone;
            console.log('📞 LiveTrackingScreen: Found driver phone in pilot.phone:', phoneFromBackend);
          }
          
          if (phoneFromBackend) {
            console.log('📞 LiveTrackingScreen: Setting driver phone from backend:', phoneFromBackend);
            setDriverPhoneNumber(phoneFromBackend);
          } else {
            console.warn('⚠️ LiveTrackingScreen: No driver phone found in backend response');
          }
          
          // Update other ride details if available
          if (response.data.status) {
            console.log('📊 LiveTrackingScreen: Setting ride status from backend:', response.data.status);
            setRideStatus(response.data.status);
          }
        } else {
          console.warn('⚠️ LiveTrackingScreen: Failed to fetch ride details:', response.message);
        }
      } catch (error) {
        console.error('❌ LiveTrackingScreen: Error fetching ride details:', error);
      } finally {
        setIsLoadingRideData(false);
        
        // Fallback: If no rating was set, use the rating from backend response
        if (driverRating === null) {
          console.log('🔄 LiveTrackingScreen: No rating set, using fallback logic');
          // Set as new driver for testing
          setDriverRating(0);
          setIsNewDriver(true);
          console.log('🔄 LiveTrackingScreen: Set fallback rating as new driver');
        }
      }
    };

    fetchRideDetails();
  }, [rideId, getToken]);

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
          console.log('✅ Ride completed, waiting for QR payment modal from driver');
          // Don't navigate immediately - wait for QR payment flow
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
        console.log('✅ Ride completed event matches current ride, waiting for QR payment');
        // Don't navigate immediately - wait for QR payment flow
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
          const lastPoint = prev[prev.length - 1];
          if (!prev.length || !lastPoint || lastPoint.latitude !== data.latitude || lastPoint.longitude !== data.longitude) {
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
    
    const handleDriverArrived = async (data: { rideId: string; driverId: string; message?: string; status?: string }) => {
      console.log('🎯 LiveTrackingScreen received driver_arrived event:', data);
      console.log('🎯 Checking if rideId matches:', data.rideId, '===', rideId);
      
      if (data.rideId === rideId) {
        console.log('🚗 Driver arrived at pickup location, staying on LiveTrackingScreen');
        console.log('🚗 OTP is already displayed on this screen for customer to share');
        
        // Send push notification for driver arrived
        try {
          console.log('🚗 Sending driver arrived push notification...');
          
          // Get the user's push token
          const tokenData = await getStoredToken();
          if (tokenData?.token) {
            const backendService = BackendNotificationService.getInstance();
            await backendService.sendDriverArrivedNotification(tokenData.token, {
              rideId: data.rideId,
              driverId: data.driverId,
              driverName: driverInfo.name,
              pickupLocation: origin?.name || 'Your pickup location'
            });
            console.log('✅ Driver arrived push notification sent successfully');
          } else {
            console.log('⚠️ No push token available for driver arrived notification');
          }
          
          // Update ride status
          setRideStatus('arrived');
        } catch (error) {
          console.error('❌ Error sending driver arrived notification:', error);
        }
        
        // Stay on LiveTrackingScreen - OTP is already displayed here
        // Customer can share the OTP with the driver directly from this screen
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
        console.log('🚀 Current screen state before navigation:', { rideStatus });
        
        navigation.replace('RideInProgress', {
          driver: driverInfo,
          rideId,
          destination,
          origin,
          estimate, // Add the estimate data
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
    console.log('🔗 Navigating to Chat with data:', { 
      ride: { rideId: rideId },
      driver: driverInfo,
      userId: route.params.userId || 'user123'
    });
    navigation.navigate('Chat', { 
      ride: { rideId: rideId },
      driver: driverInfo,
      userId: route.params.userId || 'user123'
    });
  };

  const handleCall = () => {
    setCallModalVisible(true);
  };

  const handleCallNow = () => {
    setCallModalVisible(false);
    const phoneToCall = driverPhoneNumber || driverInfo.phone;
    if (phoneToCall) {
      console.log('📞 LiveTrackingScreen: Calling driver with phone:', phoneToCall);
      Linking.openURL(`tel:${phoneToCall}`);
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
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      
      {/* Connection Status */}
      <ConnectionStatus />

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
          } : {
            latitude: destination?.latitude || 17.4448,
            longitude: destination?.longitude || 78.3498,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          showsUserLocation={true}
          showsMyLocationButton={false}
          showsCompass={false}
          showsScale={false}
          showsTraffic={false}
          showsBuildings={false}
          showsIndoors={false}
          showsIndoorLevelPicker={false}
          showsPointsOfInterest={false}
          mapType="standard"
        >
          {/* Polyline from driver to pickup (origin) when arriving */}
          {rideStatus === 'arriving' && driverLocation && origin && origin.latitude && origin.longitude && (
            <Polyline
              coordinates={[
                { latitude: driverLocation.latitude, longitude: driverLocation.longitude },
                { latitude: origin.latitude, longitude: origin.longitude }
              ]}
              strokeColor={Colors.primary}
              strokeWidth={4}
              lineDashPattern={[10, 5]}
            />
          )}
          {/* Show driver's path as polyline after pickup if needed */}
          {rideStatus !== 'arriving' && driverPath.length > 1 && (
            <Polyline
              coordinates={driverPath}
              strokeColor={Colors.primary}
              strokeWidth={4}
            />
          )}
          {driverLocation && (
            <Marker coordinate={driverLocation} title="Driver">
              <View style={styles.driverMarker}>
                <Ionicons name="car" size={20} color={Colors.white} />
              </View>
            </Marker>
          )}
          {/* Pickup marker */}
          {origin && origin.latitude && origin.longitude && (
            <Marker coordinate={{ latitude: origin.latitude, longitude: origin.longitude }} title="Pickup">
              <View style={styles.pickupMarker}>
                <Ionicons name="location" size={24} color={Colors.white} />
              </View>
            </Marker>
          )}
          {destination && destination.latitude && destination.longitude && (
            <Marker coordinate={{ latitude: destination.latitude, longitude: destination.longitude }} title="Destination" pinColor={Colors.coral} />
          )}
        </MapView>
      </View>

      {/* Bottom Section */}
      <View style={styles.bottomSection}>
        {/* Driver Arrival Status */}
        <View style={styles.arrivalSection}>
          <Text style={styles.arrivalText}>{realDriverName || pilotName} is arriving soon</Text>
        </View>

        {/* Driver and Vehicle Details */}
        <View style={styles.driverSection}>
          <View style={styles.driverInfo}>
            <Image 
              source={driverInfo.photo ? { uri: driverInfo.photo } : Images.SCOOTER_1} 
              style={styles.driverPhoto} 
            />
          </View>
          
          <View style={styles.driverDetails}>
            <Text style={styles.driverName}>{realDriverName || pilotName}</Text>
            <Text style={styles.licensePlate}>{driverInfo.vehicleNumber || '3M53AF2'}</Text>
            <Text style={styles.vehicleInfo}>
              {driverInfo.vehicleModel || 'Honda Civic'} - {driverInfo.vehicleColor || 'Silver'}
            </Text>
            <View style={styles.ratingContainer}>
              {driverRating !== null && (
                <>
                  {isNewDriver ? (
                    <View style={styles.newDriverContainer}>
                      <Ionicons name="star" size={16} color={Colors.warning} />
                      <Text style={styles.newDriverText}>New Driver</Text>
                    </View>
                  ) : (
                    <>
                      <View style={styles.starsContainer}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Ionicons
                            key={star}
                            name={star <= driverRating ? "star" : "star-outline"}
                            size={16}
                            color={star <= driverRating ? Colors.warning : Colors.gray300}
                          />
                        ))}
                      </View>
                      <Text style={styles.ratingText}>{driverRating.toFixed(1)}</Text>
                    </>
                  )}
                </>
              )}
            </View>
          </View>
          
          {/* ETA Badge */}
          <View style={styles.etaBadge}>
            <Text style={styles.etaText}>
              {(driverInfo.eta || '5 minutes').replace(/\D/g, '') + ' MIN'}
            </Text>
          </View>
        </View>

        {/* PIN Display */}
        <View style={styles.pinSection}>
          <PinDisplay 
            pin={otpCode} 
            onShare={onShareTrip}
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.messageButton} onPress={handleChat}>
            <Text style={styles.messageButtonText}>Send a message</Text>
          </TouchableOpacity>
          
          {/* Driver Arrived Button - Only show when driver is arriving */}
          {rideStatus === 'arriving' && (
            <TouchableOpacity 
              style={[styles.messageButton, { backgroundColor: Colors.success }]} 
              onPress={handleDriverArrived}
            >
              <Text style={[styles.messageButtonText, { color: Colors.white }]}>
                🚗 Pilot Arrived
              </Text>
            </TouchableOpacity>
          )}
          
          <View style={styles.iconButtons}>
            <TouchableOpacity style={styles.iconButton} onPress={handleCall}>
              <Ionicons name="call" size={20} color={Colors.primary} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.iconButton} onPress={onShareTrip}>
              <Ionicons name="share" size={20} color={Colors.primary} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.emergencyButton} onPress={handleSOS}>
              <Ionicons name="shield" size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

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
            <Text style={styles.modalDriverName}>{pilotName}</Text>
            <Text style={styles.modalPhone}>{driverPhoneNumber || driverInfo.phone || 'No phone number'}</Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  mapContainer: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  driverMarker: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    padding: 10,
    borderWidth: 3,
    borderColor: Colors.white,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  pickupMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.success, // Green pin
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.white,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  bottomSection: {
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  arrivalSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  arrivalText: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  driverSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative', // Add this for absolute positioning of ETA badge
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  driverPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  vehicleImage: {
    width: 60,
    height: 36,
    backgroundColor: Colors.gray200,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
  },
  licensePlate: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  vehicleInfo: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  pinSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  messageButton: {
    backgroundColor: Colors.gray50,
    borderWidth: 1,
    borderColor: Colors.gray200,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 25,
    flex: 1,
    marginRight: 16,
  },
  messageButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  iconButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.gray200,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  cameraCount: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: -8,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callModal: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: 320,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    color: Colors.primary,
  },
  modalDriverName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    color: Colors.text,
  },
  modalPhone: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  modalButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 8,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  newDriverContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7', // Light warning background
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  newDriverText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.warning,
    marginLeft: 4,
  },
  etaBadge: {
    backgroundColor: '#1e40af', // Blue color matching PIN
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    position: 'absolute',
    top: 0,
    right: 0,
  },
  etaText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  emergencyButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.gray200,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },

});
