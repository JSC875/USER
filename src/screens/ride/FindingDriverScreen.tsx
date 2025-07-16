import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Alert,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { 
  getSocket, 
  onRideAccepted, 
  onRideStatus, 
  clearCallbacks,
  listenToEvent,
  isConnected,
  onDriverOffline,
  onRideTimeout
} from '../../utils/socket';

export default function FindingDriverScreen({ navigation, route }: any) {
  const { destination, estimate, paymentMethod, driver, rideId, pickup } = route.params;
  const [searchText, setSearchText] = useState('Finding nearby drivers...');
  const [isDriverFound, setIsDriverFound] = useState(false);
  const [driverInfo, setDriverInfo] = useState<any>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [searchTime, setSearchTime] = useState(0);
  const [hasNavigated, setHasNavigated] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const searchTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Prevent going back during search
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!isDriverFound) {
        Alert.alert(
          'Cancel Search',
          'Are you sure you want to cancel searching for drivers?',
          [
            { text: 'Continue Searching', style: 'cancel' },
            { 
              text: 'Cancel Search', 
              style: 'destructive',
              onPress: () => {
                // Emit cancel ride event to server
                const socket = getSocket();
                if (socket && rideId) {
                  console.log('🚫 User cancelled ride search, emitting cancel_ride');
                  socket.emit('cancel_ride', { rideId });
                }
                navigation.navigate('TabNavigator', { screen: 'Home' });
              }
            }
          ]
        );
        return true; // Prevent default back behavior
      }
      return false; // Allow default back behavior
    });

    return () => backHandler.remove();
  }, [isDriverFound, rideId, navigation]);

  useEffect(() => {
    console.log('🔍 FindingDriverScreen mounted with params:', {
      destination: destination?.name,
      rideId,
      pickup: pickup?.address
    });

    // Start search timer
    const startTime = Date.now();
    searchTimer.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setSearchTime(elapsed);
      
      // Update search text based on time
      if (elapsed < 30) {
        setSearchText('Finding nearby drivers...');
      } else if (elapsed < 60) {
        setSearchText('Still searching for drivers...');
      } else {
        setSearchText('Searching in wider area...');
      }
    }, 1000);

    // Check socket connection status
    const checkConnection = () => {
      const connected = isConnected();
      setSocketConnected(connected);
      console.log('🔍 Socket connection status:', connected);
      
      if (getSocket()) {
        console.log('🔍 Socket ID:', getSocket()?.id);
        console.log('🔍 Socket connected state:', getSocket()?.connected);
      }
      
      if (!connected) {
        console.log('⚠️ Socket not connected, attempting to reconnect...');
        Alert.alert(
          'Connection Issue',
          'Lost connection to server. Please check your internet and try again.',
          [
            { text: 'OK', onPress: () => navigation.navigate('TabNavigator', { screen: 'Home' }) }
          ]
        );
      }
    };

    checkConnection();

    // Pulse animation
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    // Set up socket event listeners
    const setupSocketListeners = () => {
      console.log('🔧 Setting up socket listeners for FindingDriverScreen');
      
      // Listen for ride acceptance
      onRideAccepted((data) => {
        console.log('✅ Driver accepted ride (callback):', data);
        console.log('🔍 Current isDriverFound state (callback):', isDriverFound);
        console.log('🔍 Current hasNavigated state (callback):', hasNavigated);
        
        // Prevent multiple navigations
        if (isDriverFound || hasNavigated) {
          console.log('🚫 Driver already found or navigation already triggered, ignoring duplicate event');
          return;
        }
        
        // Validate that this is the correct ride
        if (data.rideId && rideId && data.rideId !== rideId) {
          console.log('🚫 Ride ID mismatch, ignoring event for different ride');
          return;
        }
        
        console.log('✅ Processing ride acceptance for correct ride');
        setIsDriverFound(true);
        setDriverInfo(data);
        setSearchText('Driver found! Confirming ride...');
        
        console.log('🚗 Navigating to LiveTracking from callback with driver data:', {
          id: data.driverId,
          name: data.driverName,
          phone: data.driverPhone,
          eta: data.estimatedArrival,
        });
        
        setHasNavigated(true);
        
        // Stop the search timer
        if (searchTimer.current) {
          clearInterval(searchTimer.current);
          searchTimer.current = null;
        }
        
        // Navigate immediately without alert
        navigation.replace('LiveTracking', {
          destination,
          estimate,
          paymentMethod,
          driver: {
            id: data.driverId,
            name: data.driverName,
            phone: data.driverPhone,
            eta: data.estimatedArrival,
          },
          rideId: data.rideId,
          origin: pickup,
        });
      });

      // Listen for ride status updates
      onRideStatus((data) => {
        console.log('🔄 Ride status update:', data);
        if (data.status === 'cancelled') {
          Alert.alert('Ride Cancelled', 'Your ride has been cancelled.');
          navigation.navigate('TabNavigator', { screen: 'Home' });
        }
      });

      // Listen for ride timeout
      onRideTimeout((data) => {
        console.log('⏰ Ride request timed out:', data);
        Alert.alert(
          'No Drivers Found', 
          data.message || 'No drivers were found. Please try again.',
          [
            { text: 'Try Again', onPress: () => navigation.navigate('TabNavigator', { screen: 'Home' }) }
          ]
        );
      });

      // Listen for driver offline
      onDriverOffline((data) => {
        console.log('🔴 Driver went offline:', data);
        Alert.alert(
          'Driver Unavailable',
          'The assigned driver is no longer available. We\'ll find you another driver.',
          [
            { text: 'OK' }
          ]
        );
      });

      // Additional listener for ride_accepted event (backup)
      const socket = getSocket();
      if (socket) {
        console.log('🔧 Setting up direct socket listeners');
        
        // Test socket connection by emitting a test event
        console.log('🧪 Testing socket connection...');
        socket.emit('test_event', { message: 'FindingDriverScreen test' });

        // Add a simple test listener to see if any events are received
        socket.on('connect', () => {
          console.log('🎯 Socket connected in FindingDriverScreen!');
        });

        socket.on('disconnect', () => {
          console.log('🎯 Socket disconnected in FindingDriverScreen!');
        });

        // Add direct ride_accepted listener for debugging
        socket.on('ride_accepted', (data) => {
          console.log('🎯 Direct ride_accepted event received in FindingDriverScreen:', data);
          console.log('🔍 Current isDriverFound state (direct):', isDriverFound);
          console.log('🔍 Current hasNavigated state (direct):', hasNavigated);
          
          // Prevent multiple navigations
          if (isDriverFound || hasNavigated) {
            console.log('🚫 Driver already found or navigation already triggered, ignoring duplicate event');
            return;
          }
          
          // Validate that this is the correct ride
          if (data.rideId && rideId && data.rideId !== rideId) {
            console.log('🚫 Ride ID mismatch, ignoring event for different ride');
            return;
          }
          
          console.log('✅ Processing ride acceptance for correct ride (direct)');
          setIsDriverFound(true);
          setDriverInfo(data);
          setSearchText('Driver found! Confirming ride...');
          
          console.log('🚗 Navigating to LiveTracking from direct event with driver data:', {
            id: data.driverId,
            name: data.driverName,
            phone: data.driverPhone,
            eta: data.estimatedArrival,
          });
          
          setHasNavigated(true);
          
          // Stop the search timer
          if (searchTimer.current) {
            clearInterval(searchTimer.current);
            searchTimer.current = null;
          }
          
          // Navigate immediately without alert
          navigation.replace('LiveTracking', {
            destination,
            estimate,
            paymentMethod,
            driver: {
              id: data.driverId,
              name: data.driverName,
              phone: data.driverPhone,
              eta: data.estimatedArrival,
            },
            rideId: data.rideId,
            origin: pickup,
          });
        });

        // Remove the redundant ride_response listener to prevent duplicate processing
        // The onRideAccepted callback already handles this event
        // socket.on('ride_response', (data) => {
        //   console.log('🔄 Ride response received (direct):', data);
        //   if (data.response === 'accept' && !isDriverFound && !hasNavigated) {
        //     console.log('✅ Processing ride_response accept (direct)');
        //     setIsDriverFound(true);
        //     setDriverInfo(data);
        //     setSearchText('Driver found! Confirming ride...');
        //     setHasNavigated(true);
        //     
        //     navigation.replace('LiveTracking', {
        //       destination,
        //       estimate,
        //       paymentMethod,
        //       driver: {
        //         id: data.driverId,
        //         name: data.driverName,
        //         phone: data.driverPhone,
        //         eta: data.estimatedArrival,
        //       },
        //       rideId: data.rideId,
        //       origin: pickup,
        //     });
        //   }
        // });
      }

      // Cleanup function
      return () => {
        clearCallbacks();
      };
    };

    setupSocketListeners();

    return () => {
      console.log('🧹 Cleaning up FindingDriverScreen');
      pulse.stop();
      clearCallbacks();
      if (searchTimer.current) {
        clearInterval(searchTimer.current);
      }
      
      // Remove any direct socket listeners
      const socket = getSocket();
      if (socket) {
        socket.off('ride_accepted');
        socket.off('ride_response');
        socket.off('connect');
        socket.off('disconnect');
      }
    };
  }, [navigation, destination, estimate, paymentMethod, rideId, isDriverFound, pickup, hasNavigated, pulseAnim]);

  const handleCancel = () => {
    Alert.alert(
      'Cancel Ride',
      'Are you sure you want to cancel this ride?',
      [
        {
          text: 'No',
          style: 'cancel',
        },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: () => {
            // Emit cancel ride event to server
            const socket = getSocket();
            if (socket && rideId) {
              console.log('🚫 User cancelled ride, emitting cancel_ride');
              socket.emit('cancel_ride', { rideId });
            }
            navigation.navigate('TabNavigator', { screen: 'Home' });
          },
        },
      ]
    );
  };

  const formatSearchTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Connection Status */}
        {!socketConnected && (
          <View style={styles.connectionWarning}>
            <Ionicons name="warning" size={16} color={Colors.warning} />
            <Text style={styles.connectionText}>Connecting to server...</Text>
          </View>
        )}

        {/* Map Container */}
        <View style={styles.mapContainer}>
          <View style={styles.mapPlaceholder}>
            <Ionicons name="map" size={48} color={Colors.gray400} />
            <Text style={styles.mapText}>Searching for drivers nearby</Text>
          </View>
        </View>

        {/* Search Status */}
        <View style={styles.statusContainer}>
          <Animated.View
            style={[
              styles.searchIcon,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <Ionicons 
              name={isDriverFound ? "checkmark-circle" : "bicycle"} 
              size={40} 
              color={Colors.white} 
            />
          </Animated.View>
          
          <Text style={styles.statusText}>{searchText}</Text>
          <Text style={styles.statusSubtext}>
            {isDriverFound ? 'Preparing your ride...' : 'This usually takes 1-2 minutes'}
          </Text>

          {!isDriverFound && (
            <View style={styles.searchInfo}>
              <LoadingSpinner size="large" color={Colors.primary} />
              <Text style={styles.searchTimeText}>
                Searching for {formatSearchTime(searchTime)}
              </Text>
            </View>
          )}
        </View>

        {/* Trip Details */}
        <View style={styles.tripCard}>
          <View style={styles.tripHeader}>
            <Text style={styles.tripTitle}>Trip Details</Text>
            <View style={styles.fareContainer}>
              <Text style={styles.fareText}>₹{estimate.fare}</Text>
            </View>
          </View>

          <View style={styles.routeInfo}>
            <View style={styles.routePoint}>
              <View style={styles.pickupDot} />
              <View style={styles.routeDetails}>
                <Text style={styles.routeLabel}>Pickup</Text>
                <Text style={styles.routeAddress}>
                  {pickup?.address || 'Current Location'}
                </Text>
              </View>
            </View>

            <View style={styles.routeLine} />

            <View style={styles.routePoint}>
              <View style={styles.destinationDot} />
              <View style={styles.routeDetails}>
                <Text style={styles.routeLabel}>Destination</Text>
                <Text style={styles.routeAddress}>
                  {destination?.name || 'Destination'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Cancel Button */}
        <TouchableOpacity 
          style={styles.cancelButton} 
          onPress={handleCancel}
          disabled={isDriverFound}
        >
          <Ionicons name="close-circle" size={20} color={Colors.coral} />
          <Text style={styles.cancelButtonText}>Cancel Ride</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
  },
  connectionWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warning + '20',
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.sm,
    marginHorizontal: Layout.spacing.lg,
    marginTop: Layout.spacing.sm,
    borderRadius: Layout.borderRadius.sm,
  },
  connectionText: {
    marginLeft: Layout.spacing.xs,
    fontSize: Layout.fontSize.sm,
    color: Colors.warning,
    fontWeight: '500',
  },
  mapContainer: {
    height: 250,
    backgroundColor: Colors.gray100,
    margin: Layout.spacing.lg,
    borderRadius: Layout.borderRadius.lg,
    overflow: 'hidden',
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
  statusContainer: {
    alignItems: 'center',
    paddingVertical: Layout.spacing.xl,
  },
  searchIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Layout.spacing.lg,
  },
  statusText: {
    fontSize: Layout.fontSize.lg,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Layout.spacing.sm,
  },
  statusSubtext: {
    fontSize: Layout.fontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Layout.spacing.lg,
  },
  tripCard: {
    backgroundColor: Colors.white,
    marginHorizontal: Layout.spacing.lg,
    borderRadius: Layout.borderRadius.lg,
    padding: Layout.spacing.lg,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Layout.spacing.lg,
  },
  tripTitle: {
    fontSize: Layout.fontSize.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  fareContainer: {
    backgroundColor: Colors.gray50,
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    borderRadius: Layout.borderRadius.sm,
  },
  fareText: {
    fontSize: Layout.fontSize.lg,
    fontWeight: 'bold',
    color: Colors.primary,
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
  tripStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: Layout.spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    marginLeft: Layout.spacing.xs,
    fontSize: Layout.fontSize.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  bottomAction: {
    backgroundColor: Colors.white,
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gray100,
    borderRadius: Layout.borderRadius.md,
    paddingVertical: Layout.spacing.md,
    marginHorizontal: Layout.spacing.lg,
    marginTop: Layout.spacing.lg,
  },
  cancelButtonText: {
    marginLeft: Layout.spacing.sm,
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  searchInfo: {
    alignItems: 'center',
    marginTop: Layout.spacing.lg,
  },
  searchTimeText: {
    marginTop: Layout.spacing.sm,
    fontSize: Layout.fontSize.md,
    color: Colors.textSecondary,
  },
});
