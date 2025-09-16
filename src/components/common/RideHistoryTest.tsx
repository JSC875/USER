import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { userApi, RideHistoryFilters } from '../../services/userService';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';

export const RideHistoryTest: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [rideHistory, setRideHistory] = useState<any[]>([]);
  const { getToken } = useAuth();

  const testGetRideHistory = async (filters?: RideHistoryFilters) => {
    try {
      setIsLoading(true);
      
      console.log('🔄 Loading ride history with filters:', filters);
      
      const rides = await userApi.getUserRideHistory(getToken, filters);
      
      console.log('✅ Ride history loaded:', rides);
      console.log('📍 Sample ride locations:');
      rides.slice(0, 3).forEach((ride, index) => {
        console.log(`Ride ${index + 1}:`);
        console.log(`  Pickup: ${ride.pickupLocation?.address} (${ride.pickupLocation?.latitude}, ${ride.pickupLocation?.longitude})`);
        console.log(`  Drop: ${ride.dropLocation?.address} (${ride.dropLocation?.latitude}, ${ride.dropLocation?.longitude})`);
      });
      
      setRideHistory(rides);
      
      Alert.alert(
        'Ride History',
        `Successfully loaded ${rides.length} rides!\n\nCheck the console for detailed data including pickup and destination addresses.`,
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('❌ Error loading ride history:', error);
      Alert.alert('Error', 'Failed to load ride history. Please check the console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  const testGetAllRides = () => {
    testGetRideHistory();
  };

  const testGetCompletedRides = () => {
    testGetRideHistory({ status: 'completed', limit: 10 });
  };

  const testGetCancelledRides = () => {
    testGetRideHistory({ status: 'cancelled', limit: 10 });
  };

  const testGetRecentRides = () => {
    const endDate = new Date().toISOString();
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // Last 30 days
    
    testGetRideHistory({ 
      startDate, 
      endDate, 
      limit: 20 
    });
  };

  const testGetRideDetails = async (rideId: string) => {
    try {
      setIsLoading(true);
      
      console.log('🔄 Loading ride details for ID:', rideId);
      
      const rideDetails = await userApi.getRideDetails(rideId, getToken);
      
      console.log('✅ Ride details loaded:', rideDetails);
      
      Alert.alert(
        'Ride Details',
        `Ride ID: ${rideDetails.id}\nStatus: ${rideDetails.status}\nFare: ₹${rideDetails.fare}\nDistance: ${rideDetails.distance}km\nDriver: ${rideDetails.driverName || 'N/A'}`,
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('❌ Error loading ride details:', error);
      Alert.alert('Error', 'Failed to load ride details. Please check the console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  const testRateRide = async (rideId: string) => {
    try {
      setIsLoading(true);
      
      console.log('🔄 Rating ride:', rideId);
      
      const result = await userApi.rateRide(rideId, 5, 'Great ride!', getToken);
      
      console.log('✅ Ride rated successfully:', result);
      
      Alert.alert(
        'Ride Rated',
        'Ride rated successfully with 5 stars!',
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('❌ Error rating ride:', error);
      Alert.alert('Error', 'Failed to rate ride. Please check the console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Ride History API Test</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Load Ride History</Text>
        
        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={testGetAllRides}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Loading...' : 'Get All Rides'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton, isLoading && styles.buttonDisabled]}
          onPress={testGetCompletedRides}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Loading...' : 'Get Completed Rides'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton, isLoading && styles.buttonDisabled]}
          onPress={testGetCancelledRides}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Loading...' : 'Get Cancelled Rides'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton, isLoading && styles.buttonDisabled]}
          onPress={testGetRecentRides}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Loading...' : 'Get Recent Rides (30 days)'}
          </Text>
        </TouchableOpacity>
      </View>

      {rideHistory.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Ride Actions</Text>
          <Text style={styles.subtitle}>Click on a ride to test actions:</Text>
          
          {rideHistory.slice(0, 3).map((ride) => (
            <View key={ride.id} style={styles.rideItem}>
              <Text style={styles.rideText}>
                {ride.pickupLocation?.address || 'Pickup Location'} → {ride.dropLocation?.address || 'Destination'}
              </Text>
              <Text style={styles.rideSubtext}>
                ₹{ride.fare} • {ride.status} • {new Date(ride.createdAt).toLocaleDateString()}
              </Text>
              <Text style={styles.rideSubtext}>
                📍 Pickup: {ride.pickupLocation?.latitude}, {ride.pickupLocation?.longitude}
              </Text>
              <Text style={styles.rideSubtext}>
                🎯 Drop: {ride.dropLocation?.latitude}, {ride.dropLocation?.longitude}
              </Text>
              
              <View style={styles.rideActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.detailsButton]}
                  onPress={() => testGetRideDetails(ride.id)}
                  disabled={isLoading}
                >
                  <Text style={styles.actionButtonText}>Details</Text>
                </TouchableOpacity>
                
                {ride.status === 'completed' && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.rateButton]}
                    onPress={() => testRateRide(ride.id)}
                    disabled={isLoading}
                  >
                    <Text style={styles.actionButtonText}>Rate</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
      
      <Text style={styles.note}>
        Note: Check the console for detailed API responses and data structures.
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: Layout.spacing.lg,
    backgroundColor: Colors.white,
  },
  title: {
    fontSize: Layout.fontSize.lg,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Layout.spacing.lg,
    textAlign: 'center',
  },
  section: {
    marginBottom: Layout.spacing.lg,
  },
  sectionTitle: {
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Layout.spacing.md,
  },
  subtitle: {
    fontSize: Layout.fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Layout.spacing.md,
  },
  button: {
    backgroundColor: Colors.primary,
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.sm,
    marginBottom: Layout.spacing.sm,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: Colors.accent,
  },
  buttonDisabled: {
    backgroundColor: Colors.gray400,
  },
  buttonText: {
    color: Colors.white,
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
  },
  rideItem: {
    backgroundColor: Colors.gray50,
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.sm,
    marginBottom: Layout.spacing.sm,
  },
  rideText: {
    fontSize: Layout.fontSize.sm,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Layout.spacing.xs,
  },
  rideSubtext: {
    fontSize: Layout.fontSize.xs,
    color: Colors.textSecondary,
    marginBottom: Layout.spacing.sm,
  },
  rideActions: {
    flexDirection: 'row',
    gap: Layout.spacing.sm,
  },
  actionButton: {
    flex: 1,
    padding: Layout.spacing.sm,
    borderRadius: Layout.borderRadius.sm,
    alignItems: 'center',
  },
  detailsButton: {
    backgroundColor: Colors.info,
  },
  rateButton: {
    backgroundColor: Colors.success,
  },
  actionButtonText: {
    color: Colors.white,
    fontSize: Layout.fontSize.xs,
    fontWeight: '600',
  },
  note: {
    fontSize: Layout.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: Layout.spacing.lg,
  },
});

export default RideHistoryTest; 