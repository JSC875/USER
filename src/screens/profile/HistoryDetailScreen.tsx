import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Linking, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';

// Star rating component
const StarRating = ({ rating }: { rating: number }) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <Ionicons
        key={i}
        name={i <= rating ? 'star' : 'star-outline'}
        size={18}
        color={Colors.accent}
        style={{ marginRight: 2 }}
      />
    );
  }
  return <View style={{ flexDirection: 'row', alignItems: 'center' }}>{stars}</View>;
};

function formatDateTime(dateStr: string, timeStr: string) {
  // Simple formatting, expects date as 'YYYY-MM-DD' or similar, time as 'HH:mm'
  const date = new Date(`${dateStr}T${timeStr}`);
  return date.toLocaleString();
}

function formatDistance(distance: number) {
  return `${distance.toFixed(2)} km`;
}

export default function HistoryDetailScreen({ route }: any) {
  const { ride } = route.params;
  // Example ride object fields (customize as needed):
  // ride.driverName, ride.driverRating, ride.driverPhone, ride.driverImage, ride.from, ride.fromAddress, ride.to, ride.toAddress, ride.date, ride.time, ride.distance, ride.fare, ride.paymentMethod, ride.chargeBreakdown, ride.rating, ride.feedback

  const handleCallDriver = () => {
    if (ride.driverPhone) {
      Linking.openURL(`tel:${ride.driverPhone}`);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      {/* Driver Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Driver</Text>
        <View style={styles.driverRow}>
          <Image
            source={ride.driverImage ? { uri: ride.driverImage } : require('../../../assets/images/iconAnimation1.png')}
            style={styles.driverImage}
          />
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={styles.driverName}>{ride.driverName || 'Driver Name'}</Text>
            <StarRating rating={ride.driverRating || 0} />
            <TouchableOpacity style={styles.callRow} onPress={handleCallDriver}>
              <Ionicons name="call" size={18} color={Colors.primary} />
              <Text style={styles.driverPhone}>{ride.driverPhone || 'N/A'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Ride Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ride Details</Text>
        <View style={styles.detailRow}>
          <Ionicons name="navigate" size={18} color={Colors.primary} style={{ marginRight: 8 }} />
          <Text style={styles.detailLabel}>Distance:</Text>
          <Text style={styles.detailValue}>{formatDistance(ride.distance)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="location" size={18} color={Colors.primary} style={{ marginRight: 8 }} />
          <Text style={styles.detailLabel}>Pickup:</Text>
          <Text style={styles.detailValue}>{ride.fromAddress || ride.from}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="flag" size={18} color={Colors.coral} style={{ marginRight: 8 }} />
          <Text style={styles.detailLabel}>Drop:</Text>
          <Text style={styles.detailValue}>{ride.toAddress || ride.to}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="calendar" size={18} color={Colors.primary} style={{ marginRight: 8 }} />
          <Text style={styles.detailLabel}>Date & Time:</Text>
          <Text style={styles.detailValue}>{formatDateTime(ride.date, ride.time)}</Text>
        </View>
      </View>

      {/* Payment Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment</Text>
        <View style={styles.detailRow}>
          <Ionicons name="cash" size={18} color={Colors.primary} style={{ marginRight: 8 }} />
          <Text style={styles.detailLabel}>Total:</Text>
          <Text style={styles.detailValue}>₹{ride.fare}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="card" size={18} color={Colors.primary} style={{ marginRight: 8 }} />
          <Text style={styles.detailLabel}>Method:</Text>
          <Text style={styles.detailValue}>{ride.paymentMethod || 'Cash'}</Text>
        </View>
        {ride.chargeBreakdown && Array.isArray(ride.chargeBreakdown) && ride.chargeBreakdown.length > 0 && (
          <View style={{ marginTop: 8 }}>
            {ride.chargeBreakdown.map((item: any, idx: number) => (
              <View key={idx} style={styles.detailRow}>
                <Text style={styles.detailLabel}>{item.label}:</Text>
                <Text style={styles.detailValue}>₹{item.amount}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Feedback Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Feedback</Text>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Your Rating:</Text>
          <StarRating rating={ride.rating || 0} />
        </View>
        {ride.feedback ? (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.detailLabel}>Comment:</Text>
            <Text style={styles.detailValue}>{ride.feedback}</Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Layout.spacing.lg,
  },
  section: {
    marginBottom: 28,
    backgroundColor: Colors.white,
    borderRadius: Layout.borderRadius.lg,
    padding: Layout.spacing.lg,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: Layout.fontSize.md,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 10,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.gray200,
  },
  driverName: {
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  callRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  driverPhone: {
    marginLeft: 8,
    color: Colors.primary,
    fontSize: Layout.fontSize.sm,
    textDecorationLine: 'underline',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontWeight: '500',
    color: Colors.text,
    marginRight: 6,
    fontSize: Layout.fontSize.sm,
  },
  detailValue: {
    color: Colors.textSecondary,
    fontSize: Layout.fontSize.sm,
    flex: 1,
    flexWrap: 'wrap',
  },
}); 