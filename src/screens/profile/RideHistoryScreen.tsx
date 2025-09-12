import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import { useAuth } from '@clerk/clerk-expo';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { userApi, RideHistory, RideHistoryFilters } from '../../services/userService';
import { useTranslation } from 'react-i18next';

export default function RideHistoryScreen({ navigation }: any) {
  const { t } = useTranslation();
  const [filterVisible, setFilterVisible] = useState(false);
  const [filter, setFilter] = useState<'all' | 'completed' | 'cancelled'>('all');
  const [rideHistory, setRideHistory] = useState<RideHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { getToken } = useAuth();

  // Filter ride history based on selected filter
  const filteredHistory = React.useMemo(() => {
    if (filter === 'all') {
      // Show only completed and cancelled rides when 'all' is selected
      return rideHistory.filter((item) => 
        item.status === 'COMPLETED' || 
        item.status === 'CANCELLED'
      );
    }
    // Map filter values to actual backend status values
    const statusMap: Record<string, string> = {
      'completed': 'COMPLETED',
      'cancelled': 'CANCELLED'
    };
    const targetStatus = statusMap[filter];
    return rideHistory.filter((item) => item.status === targetStatus);
  }, [rideHistory, filter]);

  // Load ride history on component mount
  useEffect(() => {
    loadRideHistory();
  }, []);

  const loadRideHistory = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      // Build filters based on current filter selection
      const filters: RideHistoryFilters = {
        limit: 50, // Load last 50 rides
      };

      // Add status filter if not 'all'
      if (filter !== 'all') {
        // Map filter values to actual backend status values
        const statusMap: Record<string, string> = {
          'completed': 'COMPLETED',
          'cancelled': 'CANCELLED'
        };
        filters.status = statusMap[filter];
      } else {
        // When 'all' is selected, we'll filter on the frontend to show only completed and cancelled
        // No need to add backend filter as we want to fetch all rides and filter them
      }

      console.log('🔄 Loading ride history with filters:', filters);
      
      const rides = await userApi.getUserRideHistory(getToken, filters);
      
             console.log('✅ Ride history loaded:', rides.length, 'rides');
       
       // Sort rides by requestedAt (most recent first), fallback to createdAt if requestedAt is not available
       const sortedRides = rides.sort((a, b) => {
         const dateA = new Date(a.requestedAt || a.createdAt);
         const dateB = new Date(b.requestedAt || b.createdAt);
         return dateB.getTime() - dateA.getTime(); // Most recent first
       });
       
       // Debug: Log the timestamps to understand the data
       console.log('🔍 Ride timestamps for sorting:');
       sortedRides.forEach((ride, index) => {
         console.log(`Ride ${index + 1}: createdAt=${ride.createdAt}, requestedAt=${ride.requestedAt}, status=${ride.status}`);
       });
       
       setRideHistory(sortedRides);
      
    } catch (error) {
      console.error('❌ Error loading ride history:', error);
      setError('Failed to load ride history. Please try again.');
      
      if (!isRefresh) {
        Alert.alert('Error', 'Failed to load ride history. Please check your internet connection and try again.');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadRideHistory(true);
  };

  const handleFilterChange = (newFilter: 'all' | 'completed' | 'cancelled') => {
    setFilter(newFilter);
    setFilterVisible(false);
    loadRideHistory(); // Reload with new filter
  };

     const renderRideItem = ({ item }: { item: RideHistory }) => {
     // Format date and time - use requestedAt for display to match sorting
     const rideDate = new Date(item.requestedAt || item.createdAt);
     const dateText = rideDate.toLocaleDateString('en-IN', { 
       day: 'numeric', 
       month: 'short', 
       year: 'numeric' 
     });
     const timeText = rideDate.toLocaleTimeString('en-IN', { 
       hour: '2-digit', 
       minute: '2-digit' 
     });
     
     // Debug: Log what timestamp is being used for display
     console.log(`🎯 Ride ${item.id}: createdAt=${item.createdAt}, requestedAt=${item.requestedAt}, displayTime=${timeText}`);

    // Get status color
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'COMPLETED': return Colors.success;
        case 'CANCELLED': return Colors.error;
        case 'STARTED': return Colors.accent;
        case 'REQUESTED': return Colors.warning;
        default: return Colors.gray400;
      }
    };

    return (
      <TouchableOpacity 
        style={styles.rideCard} 
        onPress={() => navigation.navigate('RideDetails', { ride: item })}
      >
        <View style={styles.rideHeader}>
          <View style={styles.rideDate}>
            <Text style={styles.dateText}>{dateText}</Text>
            <Text style={styles.timeText}>{timeText}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusText}>
              {item.status === 'COMPLETED' ? t('common.completed') : 
               item.status === 'CANCELLED' ? t('common.cancelled') : 
               item.status.replace('_', ' ')}
            </Text>
            </View>
          </View>
          <View style={styles.fareContainer}>
            <Text style={styles.fareText}>₹{Math.round(item.fare)}</Text>
          </View>
        </View>

        <View style={styles.rideRoute}>
          <View style={styles.routePoint}>
            <View style={styles.pickupDot} />
            <Text style={styles.routeText} numberOfLines={2}>{item.pickupLocation?.address || t('home.pickupLocation')}</Text>
          </View>
          <View style={styles.routeLine} />
          <View style={styles.routePoint}>
            <View style={styles.destinationDot} />
            <Text style={styles.routeText} numberOfLines={2}>{item.dropLocation?.address || t('home.dropLocation')}</Text>
          </View>
        </View>

        <View style={styles.rideFooter}>
          <View style={styles.rideStats}>
            <View style={styles.statItem}>
              <Ionicons name="location" size={14} color={Colors.gray400} />
              <Text style={styles.statText}>{item.distance ? item.distance.toFixed(1) : '0.0'} km</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="time" size={14} color={Colors.gray400} />
              <Text style={styles.statText}>{item.duration || '0'} mins</Text>
            </View>
            {item.driverName && (
              <View style={styles.statItem}>
                <Ionicons name="person" size={14} color={Colors.gray400} />
                <Text style={styles.statText}>{item.driverName}</Text>
              </View>
            )}
          </View>
          
          <View style={styles.rideActions}>
            {item.rating && (
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={14} color={Colors.accent} />
                <Text style={styles.ratingText}>{item.rating}</Text>
              </View>
            )}
            {item.status === 'COMPLETED' && (
              <TouchableOpacity
                style={styles.rebookButton}
                onPress={() => handleRebook(item)}
              >
                <Text style={styles.rebookText}>{t('ride.rebook')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const handleRebook = (item: RideHistory) => {
          // Check if we have valid pickup and drop locations
      if (!item.pickupLocation || !item.dropLocation) {
        Alert.alert(
          t('ride.cannotRebook'),
          t('ride.incompleteLocationInfo'),
          [{ text: t('common.ok') }]
        );
        return;
      }

      // Validate that locations have proper coordinates
      if (!item.pickupLocation.latitude || !item.pickupLocation.longitude ||
          !item.dropLocation.latitude || !item.dropLocation.longitude) {
        Alert.alert(
          t('ride.cannotRebook'),
          t('ride.missingLocationCoordinates'),
          [{ text: t('common.ok') }]
        );
        return;
      }

    // Navigate to DropLocationSelector with the previous ride's locations
    navigation.navigate('DropLocationSelector', {
      destination: {
        address: item.dropLocation.address || t('home.dropLocation'),
        name: item.dropLocation.address || t('home.dropLocation'),
        latitude: item.dropLocation.latitude,
        longitude: item.dropLocation.longitude,
      },
      pickup: {
        address: item.pickupLocation.address || t('home.pickupLocation'),
        name: item.pickupLocation.address || t('home.pickupLocation'),
        latitude: item.pickupLocation.latitude,
        longitude: item.pickupLocation.longitude,
      },
      autoProceed: true,
      isRebook: true // Add flag to indicate this is a rebook
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
        <Text style={styles.headerTitle}>{t('ride.rideHistory')}</Text>
        <TouchableOpacity style={styles.filterButton} onPress={() => setFilterVisible(true)}>
          <Ionicons name="filter" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {/* Filter Modal */}
      <Modal
        visible={filterVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterVisible(false)}
      >
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }} onPress={() => setFilterVisible(false)} activeOpacity={1}>
          <View style={{ position: 'absolute', top: 70, right: 20, backgroundColor: '#fff', borderRadius: 8, padding: 16, elevation: 8 }}>
            <TouchableOpacity onPress={() => handleFilterChange('all')} style={{ paddingVertical: 8 }}>
              <Text style={{ color: filter === 'all' ? Colors.primary : Colors.text }}>{t('common.all')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleFilterChange('completed')} style={{ paddingVertical: 8 }}>
              <Text style={{ color: filter === 'completed' ? Colors.primary : Colors.text }}>{t('common.completed')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleFilterChange('cancelled')} style={{ paddingVertical: 8 }}>
              <Text style={{ color: filter === 'cancelled' ? Colors.primary : Colors.text }}>{t('common.cancelled')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Loading State */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <LoadingSpinner size="large" text={t('ride.loadingRideHistory')} />
        </View>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadRideHistory()}>
            <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredHistory.length === 0 && (
        <View style={styles.emptyContainer}>
          <Ionicons name="car-outline" size={48} color={Colors.gray400} />
          <Text style={styles.emptyText}>{t('ride.noRidesFound')}</Text>
          <Text style={styles.emptySubtext}>
            {filter === 'all' 
              ? t('ride.emptyStateAll') 
              : t('ride.emptyStateFiltered', { filter: filter })
            }
          </Text>
        </View>
      )}

      {/* Ride List */}
      {!isLoading && !error && filteredHistory.length > 0 && (
        <FlatList
          data={filteredHistory}
          renderItem={renderRideItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
        />
      )}
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
    paddingVertical: Layout.spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backButton: {
    padding: Layout.spacing.sm,
  },
  headerTitle: {
    fontSize: Layout.fontSize.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  filterButton: {
    padding: Layout.spacing.sm,
  },
  listContent: {
    padding: Layout.spacing.lg,
    paddingBottom: Layout.spacing.xl * 2, // Add extra bottom padding for better spacing
  },
  rideCard: {
    backgroundColor: Colors.white,
    borderRadius: Layout.borderRadius.lg,
    padding: Layout.spacing.lg,
    marginBottom: Layout.spacing.md,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Layout.spacing.md,
  },
  rideDate: {
    flex: 1,
  },
  dateText: {
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  timeText: {
    fontSize: Layout.fontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  fareContainer: {
    backgroundColor: Colors.gray50,
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    borderRadius: Layout.borderRadius.sm,
  },
  fareText: {
    fontSize: Layout.fontSize.md,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  rideRoute: {
    marginBottom: Layout.spacing.md,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Layout.spacing.xs,
  },
  pickupDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginRight: Layout.spacing.md,
  },
  destinationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.coral,
    marginRight: Layout.spacing.md,
  },
  routeText: {
    fontSize: Layout.fontSize.sm,
    color: Colors.text,
    flex: 1,
  },
  routeLine: {
    width: 1,
    height: 16,
    backgroundColor: Colors.gray300,
    marginLeft: 3,
    marginVertical: 2,
  },
  rideFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Layout.spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  rideStats: {
    flexDirection: 'row',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Layout.spacing.md,
  },
  statText: {
    marginLeft: Layout.spacing.xs,
    fontSize: Layout.fontSize.xs,
    color: Colors.textSecondary,
  },
  rideActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Layout.spacing.md,
  },
  ratingText: {
    marginLeft: Layout.spacing.xs,
    fontSize: Layout.fontSize.xs,
    fontWeight: '600',
    color: Colors.text,
  },
  rebookButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    borderRadius: Layout.borderRadius.sm,
  },
  rebookText: {
    fontSize: Layout.fontSize.xs,
    fontWeight: '600',
    color: Colors.white,
  },
  statusBadge: {
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: 2,
    borderRadius: Layout.borderRadius.sm,
    marginTop: Layout.spacing.xs,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: Layout.fontSize.xs,
    fontWeight: '600',
    color: Colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Layout.spacing.xl,
  },
  loadingText: {
    marginTop: Layout.spacing.md,
    fontSize: Layout.fontSize.md,
    color: Colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Layout.spacing.xl,
  },
  errorText: {
    marginTop: Layout.spacing.md,
    fontSize: Layout.fontSize.md,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Layout.spacing.lg,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Layout.spacing.xl,
  },
  emptyText: {
    marginTop: Layout.spacing.md,
    fontSize: Layout.fontSize.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  emptySubtext: {
    marginTop: Layout.spacing.sm,
    fontSize: Layout.fontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
