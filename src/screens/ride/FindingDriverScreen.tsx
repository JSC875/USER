import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Alert,
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
  isConnected 
} from '../../utils/socket';

export default function FindingDriverScreen({ navigation, route }: any) {
  const { destination, estimate, paymentMethod, driver, rideId } = route.params;
  const [searchText, setSearchText] = useState('Finding nearby drivers...');
  const [isDriverFound, setIsDriverFound] = useState(false);
  const [driverInfo, setDriverInfo] = useState<any>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const pulseAnim = new Animated.Value(1);

  useEffect(() => {
    // Check socket connection status
    const checkConnection = () => {
      const connected = isConnected();
      setSocketConnected(connected);
      console.log('🔍 Socket connection status:', connected);
      console.log('🔍 Socket object:', getSocket());
      if (getSocket()) {
        console.log('🔍 Socket ID:', getSocket()?.id);
        console.log('🔍 Socket connected state:', getSocket()?.connected);
      }
      if (!connected) {
        console.log('⚠️ Socket not connected, attempting to reconnect...');
        // You could trigger a reconnection here if needed
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
          console.log('🔧 Current socket object:', getSocket());
          console.log('🔧 Socket connected state:', getSocket()?.connected);
      
      // Listen for ride acceptance
              onRideAccepted((data) => {
          console.log('✅ Driver accepted ride (callback):', data);
          console.log('🔍 Current isDriverFound state (callback):', isDriverFound);
          
          setIsDriverFound(true);
          setDriverInfo(data);
          setSearchText('Driver found! Confirming ride...');
          
          console.log('🚗 Navigating to LiveTracking from callback with driver data:', {
            id: data.driverId,
            name: data.driverName,
            phone: data.driverPhone,
            eta: data.estimatedArrival,
          });
          
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

              // Additional listener for ride_accepted event (backup)
        const socket = getSocket();
        if (socket) {
          console.log('🔧 Setting up direct socket listeners');
          
          const handleRideAccepted = (data: any) => {
            console.log('✅ Direct socket event - Driver accepted ride:', data);
            if (!isDriverFound) {
              setIsDriverFound(true);
              setDriverInfo(data);
              setSearchText('Driver found! Confirming ride...');
              
              setTimeout(() => {
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
                });
              }, 2000);
            }
          };

          const handleRideResponse = (data: any) => {
            console.log('✅ Direct socket event - Ride response received:', data);
            console.log('🔍 Checking if response is accept:', data.response);
            console.log('🔍 Current isDriverFound state:', isDriverFound);
            
            if (data.response === 'accept') {
              console.log('✅ Processing ride acceptance...');
              setIsDriverFound(true);
              setDriverInfo(data);
              setSearchText('Driver found! Confirming ride...');
              
              console.log('🚗 Navigating to LiveTracking with driver data:', {
                id: data.driverId,
                name: data.driverName,
                phone: data.driverPhone,
                eta: data.estimatedArrival,
              });
              
              // Navigate immediately without setTimeout
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
              });
            } else {
              console.log('❌ Ride response not processed:', {
                response: data.response,
                isDriverFound,
                reason: data.response !== 'accept' ? 'Not accept response' : 'Driver already found'
              });
            }
          };

          // Listen for all events for debugging
          socket.onAny((eventName: string, ...args: any[]) => {
            console.log(`📡 Socket event received: ${eventName}`, args);
            if (eventName === 'ride_response') {
              console.log('🎯 Ride response event detected in onAny!');
            }
          });

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

          socket.on('ride_accepted', handleRideAccepted);
          socket.on('ride_response', handleRideResponse);

        // Cleanup function
        return () => {
          socket.off('ride_accepted', handleRideAccepted);
          socket.off('ride_response', handleRideResponse);
          clearCallbacks();
        };
      }
    };

    setupSocketListeners();

    return () => {
      pulse.stop();
      clearCallbacks();
    };
  }, [navigation, destination, estimate, paymentMethod, rideId, isDriverFound]);

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
              socket.emit('cancel_ride', { rideId });
            }
            navigation.navigate('TabNavigator', { screen: 'Home' });
          },
        },
      ]
    );
  };

  const handleTestNavigation = () => {
    console.log('🧪 Testing navigation to LiveTracking...');
    navigation.replace('LiveTracking', {
      destination,
      estimate,
      paymentMethod,
      driver: {
        id: 'test_driver_id',
        name: 'Test Driver',
        phone: '+1234567890',
        eta: '5 minutes',
      },
      rideId: 'test_ride_id',
    });
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

          {!isDriverFound && <LoadingSpinner size="large" color={Colors.primary} />}
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

          <View style={styles.tripStats}>
            <View style={styles.statItem}>
              <Ionicons name="location" size={16} color={Colors.primary} />
              <Text style={styles.statText}>{estimate.distance}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="time" size={16} color={Colors.accent} />
              <Text style={styles.statText}>{estimate.duration}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Cancel Button */}
      <View style={styles.bottomAction}>
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelText}>Cancel Ride</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.cancelButton, { marginTop: 10, backgroundColor: Colors.primary }]} onPress={handleTestNavigation}>
          <Text style={[styles.cancelText, { color: Colors.white }]}>Test Navigation</Text>
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
    backgroundColor: Colors.gray100,
    borderRadius: Layout.borderRadius.md,
    paddingVertical: Layout.spacing.md,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
});
