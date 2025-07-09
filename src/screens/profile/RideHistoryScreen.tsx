import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import { mockRideHistory } from '../../data/mockData';
import * as Location from 'expo-location';

export default function RideHistoryScreen({ navigation }: any) {
  const [filterVisible, setFilterVisible] = useState(false);
  const [filter, setFilter] = useState<'all' | 'completed' | 'cancelled'>('all');

  const filteredHistory =
    filter === 'all'
      ? mockRideHistory
      : mockRideHistory.filter((item) => item.status === filter);

  const renderRideItem = ({ item }: any) => (
    <TouchableOpacity style={styles.rideCard}>
      <View style={styles.rideHeader}>
        <View style={styles.rideDate}>
          <Text style={styles.dateText}>{item.date}</Text>
          <Text style={styles.timeText}>{item.time}</Text>
        </View>
        <View style={styles.fareContainer}>
          <Text style={styles.fareText}>₹{item.fare}</Text>
        </View>
      </View>

      <View style={styles.rideRoute}>
        <View style={styles.routePoint}>
          <View style={styles.pickupDot} />
          <Text style={styles.routeText}>{item.from}</Text>
        </View>
        <View style={styles.routeLine} />
        <View style={styles.routePoint}>
          <View style={styles.destinationDot} />
          <Text style={styles.routeText}>{item.to}</Text>
        </View>
      </View>

      <View style={styles.rideFooter}>
        <View style={styles.rideStats}>
          <View style={styles.statItem}>
            <Ionicons name="location" size={14} color={Colors.gray400} />
            <Text style={styles.statText}>{item.distance} km</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="time" size={14} color={Colors.gray400} />
            <Text style={styles.statText}>{item.duration} mins</Text>
          </View>
        </View>
        
        <View style={styles.rideActions}>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={14} color={Colors.accent} />
            <Text style={styles.ratingText}>{item.rating}</Text>
          </View>
          <TouchableOpacity
            style={styles.rebookButton}
            onPress={() => handleRebook(item)}
          >
            <Text style={styles.rebookText}>Rebook</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const handleRebook = (item: any) => {
    navigation.navigate('DropLocationSelector', {
      destination: {
        address: item.to,
        name: item.to,
        latitude: item.toLatitude,
        longitude: item.toLongitude,
      },
      pickup: {
        address: item.from,
        name: item.from,
        latitude: item.fromLatitude,
        longitude: item.fromLongitude,
      },
      autoProceed: true
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
        <Text style={styles.headerTitle}>Ride History</Text>
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
            <TouchableOpacity onPress={() => { setFilter('all'); setFilterVisible(false); }} style={{ paddingVertical: 8 }}>
              <Text style={{ color: filter === 'all' ? Colors.primary : Colors.text }}>All</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setFilter('completed'); setFilterVisible(false); }} style={{ paddingVertical: 8 }}>
              <Text style={{ color: filter === 'completed' ? Colors.primary : Colors.text }}>Completed</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setFilter('cancelled'); setFilterVisible(false); }} style={{ paddingVertical: 8 }}>
              <Text style={{ color: filter === 'cancelled' ? Colors.primary : Colors.text }}>Cancelled</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Ride List */}
      <FlatList
        data={filteredHistory}
        renderItem={renderRideItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
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
});
