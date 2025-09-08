import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import Button from '../../components/common/Button';
import { calculateRideFare, getDistanceFromLatLonInKm } from '../../utils/helpers';
import * as Location from 'expo-location';

export default function RideEstimateScreen({ navigation, route }: any) {
  const { destination } = route.params;
  const [selectedPayment, setSelectedPayment] = useState('cash');
  const [currentETA, setCurrentETA] = useState(route.params.driver?.eta || route.params.estimate?.eta || 'N/A');
  const [rideEstimate, setRideEstimate] = useState<any>(null);
  const [currentLocation, setCurrentLocation] = useState<any>(null);

  // Calculate real fare based on distance and duration
  useEffect(() => {
    if (destination && destination.latitude && destination.longitude) {
      // Get current location for pickup
      const getCurrentLocation = async () => {
        try {
          let { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            throw new Error('Location permission denied');
          }
          
          let loc = await Location.getCurrentPositionAsync({});
          
          // Reverse geocode to get actual address
          let currentAddress = 'Current Location';
          let currentName = 'Current Location';
          
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
            console.log('Failed to reverse geocode current location, using fallback:', geocodeError);
          }
          
          const pickupLocation = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            address: currentAddress,
            name: currentName,
          };
          
          setCurrentLocation(pickupLocation);
          
          const distanceKm = getDistanceFromLatLonInKm(
            pickupLocation.latitude,
            pickupLocation.longitude,
            destination.latitude,
            destination.longitude
          );
          
          // Estimate duration based on average speed (25 km/h)
          const durationMinutes = Math.round((distanceKm / 25) * 60);
          
          // Calculate fare for bike (default ride type)
          const fareBreakdown = calculateRideFare(distanceKm, durationMinutes, 'bike');
          
          setRideEstimate(fareBreakdown);
          console.log('Calculated fare breakdown:', fareBreakdown);
        } catch (error) {
          console.error('Failed to get current location:', error);
          // Fallback to static location
          const pickupLocation = {
            latitude: 17.4448, // Example: Hyderabad
            longitude: 78.3498,
            address: 'Hyderabad, Telangana, India',
            name: 'Hyderabad',
          };
          
          const distanceKm = getDistanceFromLatLonInKm(
            pickupLocation.latitude,
            pickupLocation.longitude,
            destination.latitude,
            destination.longitude
          );
          
          const durationMinutes = Math.round((distanceKm / 25) * 60);
          const fareBreakdown = calculateRideFare(distanceKm, durationMinutes, 'bike');
          
          setRideEstimate(fareBreakdown);
        }
      };
      
      getCurrentLocation();
    }
  }, [destination]);

  // Show loading if fare is not calculated yet
  if (!rideEstimate) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ride Estimate</Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>Calculating fare...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const paymentMethods = [
    { id: 'cash', name: 'Cash', icon: 'cash' },
    { id: 'upi', name: 'UPI', icon: 'card' },
    { id: 'wallet', name: 'Wallet', icon: 'wallet' },
  ];

  const handleConfirmRide = () => {
    navigation.navigate('ConfirmRide', {
      destination,
      estimate: rideEstimate,
      paymentMethod: selectedPayment,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ride Estimate</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Map Container */}
        <View style={styles.mapContainer}>
          <View style={styles.mapPlaceholder}>
            <Ionicons name="map" size={48} color={Colors.gray400} />
            <Text style={styles.mapText}>Route Preview</Text>
          </View>
        </View>

        {/* Route Info */}
        <View style={styles.routeCard}>
          <View style={styles.routeHeader}>
            <Text style={styles.routeTitle}>Route Details</Text>
            <View style={styles.routeStats}>
              <View style={styles.statItem}>
                <Ionicons name="location" size={16} color={Colors.primary} />
                <Text style={styles.statText}>{rideEstimate.distance}</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="time" size={16} color={Colors.accent} />
                <Text style={styles.statText}>{rideEstimate.duration}</Text>
              </View>
            </View>
          </View>

          <View style={styles.routePoints}>
            <View style={styles.routePoint}>
              <View style={styles.pickupDot} />
              <View style={styles.routePointInfo}>
                <Text style={styles.routePointLabel}>Pickup</Text>
                <Text style={styles.routePointAddress}>{currentLocation?.address || currentLocation?.name || 'Your current location'}</Text>
              </View>
            </View>

            <View style={styles.routeLine} />

            <View style={styles.routePoint}>
              <View style={styles.destinationDot} />
              <View style={styles.routePointInfo}>
                <Text style={styles.routePointLabel}>Destination</Text>
                <Text style={styles.routePointAddress}>{destination.name}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Fare Breakdown */}
        <View style={styles.fareCard}>
          <Text style={styles.fareTitle}>Fare Breakdown</Text>
          
          <View style={styles.fareItem}>
            <Text style={styles.fareLabel}>Base Fare</Text>
            <Text style={styles.fareValue}>₹{rideEstimate.baseFare}</Text>
          </View>
          
          <View style={styles.fareItem}>
            <Text style={styles.fareLabel}>Distance ({rideEstimate.distance})</Text>
            <Text style={styles.fareValue}>₹{rideEstimate.distanceFare}</Text>
          </View>
          
          <View style={styles.fareItem}>
            <Text style={styles.fareLabel}>Time ({rideEstimate.duration})</Text>
            <Text style={styles.fareValue}>₹{rideEstimate.timeFare}</Text>
          </View>
          
          <View style={styles.fareDivider} />
          
          <View style={styles.fareTotal}>
            <Text style={styles.fareTotalLabel}>Total Fare</Text>
            <Text style={styles.fareTotalValue}>₹{rideEstimate.totalFare}</Text>
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.paymentCard}>
          <Text style={styles.paymentTitle}>Payment Method</Text>
          
          {paymentMethods.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.paymentMethod,
                selectedPayment === method.id && styles.paymentMethodSelected,
              ]}
              onPress={() => setSelectedPayment(method.id)}
            >
              <View style={styles.paymentMethodLeft}>
                <Ionicons
                  name={method.icon as any}
                  size={20}
                  color={selectedPayment === method.id ? Colors.primary : Colors.gray400}
                />
                <Text
                  style={[
                    styles.paymentMethodText,
                    selectedPayment === method.id && styles.paymentMethodTextSelected,
                  ]}
                >
                  {method.name}
                </Text>
              </View>
              <View
                style={[
                  styles.radioButton,
                  selectedPayment === method.id && styles.radioButtonSelected,
                ]}
              >
                {selectedPayment === method.id && (
                  <View style={styles.radioButtonInner} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Promo Code */}
        <TouchableOpacity style={styles.promoCard}>
          <View style={styles.promoLeft}>
            <Ionicons name="pricetag" size={20} color={Colors.accent} />
            <Text style={styles.promoText}>Apply Promo Code</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.gray400} />
        </TouchableOpacity>
      </ScrollView>

      {/* Bottom Action */}
      <View style={styles.bottomAction}>
        <View style={styles.fareDisplay}>
          <Text style={styles.fareDisplayLabel}>Total Fare</Text>
          <Text style={styles.fareDisplayValue}>₹{rideEstimate.totalFare}</Text>
        </View>
        <Button
          title="Confirm Ride"
          onPress={handleConfirmRide}
          style={styles.confirmButton}
        />
      </View>
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
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backButton: {
    marginRight: Layout.spacing.md,
  },
  headerTitle: {
    fontSize: Layout.fontSize.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  content: {
    flex: 1,
  },
  mapContainer: {
    height: 200,
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
  routeCard: {
    backgroundColor: Colors.white,
    marginHorizontal: Layout.spacing.lg,
    marginBottom: Layout.spacing.md,
    borderRadius: Layout.borderRadius.lg,
    padding: Layout.spacing.lg,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Layout.spacing.lg,
  },
  routeTitle: {
    fontSize: Layout.fontSize.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  routeStats: {
    flexDirection: 'row',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: Layout.spacing.md,
  },
  statText: {
    marginLeft: Layout.spacing.xs,
    fontSize: Layout.fontSize.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  routePoints: {
    paddingLeft: Layout.spacing.sm,
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
  routePointInfo: {
    flex: 1,
    paddingVertical: Layout.spacing.sm,
  },
  routePointLabel: {
    fontSize: Layout.fontSize.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  routePointAddress: {
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
  fareCard: {
    backgroundColor: Colors.white,
    marginHorizontal: Layout.spacing.lg,
    marginBottom: Layout.spacing.md,
    borderRadius: Layout.borderRadius.lg,
    padding: Layout.spacing.lg,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  fareTitle: {
    fontSize: Layout.fontSize.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Layout.spacing.md,
  },
  fareItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Layout.spacing.sm,
  },
  fareLabel: {
    fontSize: Layout.fontSize.md,
    color: Colors.textSecondary,
  },
  fareValue: {
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  fareDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Layout.spacing.sm,
  },
  fareTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Layout.spacing.sm,
  },
  fareTotalLabel: {
    fontSize: Layout.fontSize.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  fareTotalValue: {
    fontSize: Layout.fontSize.lg,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  paymentCard: {
    backgroundColor: Colors.white,
    marginHorizontal: Layout.spacing.lg,
    marginBottom: Layout.spacing.md,
    borderRadius: Layout.borderRadius.lg,
    padding: Layout.spacing.lg,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  paymentTitle: {
    fontSize: Layout.fontSize.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Layout.spacing.md,
  },
  paymentMethod: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Layout.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  paymentMethodSelected: {
    backgroundColor: Colors.gray50,
    marginHorizontal: -Layout.spacing.lg,
    paddingHorizontal: Layout.spacing.lg,
    borderRadius: Layout.borderRadius.md,
    borderBottomWidth: 0,
  },
  paymentMethodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentMethodText: {
    marginLeft: Layout.spacing.md,
    fontSize: Layout.fontSize.md,
    color: Colors.text,
  },
  paymentMethodTextSelected: {
    fontWeight: '600',
    color: Colors.primary,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.gray300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: Colors.primary,
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  promoCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  promoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  promoText: {
    marginLeft: Layout.spacing.md,
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  bottomAction: {
    backgroundColor: Colors.white,
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  fareDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Layout.spacing.md,
  },
  fareDisplayLabel: {
    fontSize: Layout.fontSize.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  fareDisplayValue: {
    fontSize: Layout.fontSize.xl,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  confirmButton: {
    marginTop: Layout.spacing.sm,
  },
});
