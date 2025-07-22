import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const feedbackTags = [
  'Great ride',
  'On time',
  'Safe driving',
  'Friendly',
  'Clean vehicle',
  'Good route',
];

export default function RateDriverScreen({ navigation, route }: any) {
  const driver = route?.params?.driver || {
    name: 'Alex Robin',
    vehicleModel: 'Volkswagen',
    vehicleNumber: 'HG5045',
    photo: undefined,
  };
  const estimate = route?.params?.estimate;
  const destination = route?.params?.destination;
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = () => {
    setSubmitted(true);
    // Optionally, send rating/comment/tags to backend here
    setTimeout(() => {
      navigation.navigate('TabNavigator', { screen: 'Home' });
    }, 1500);
  };

  if (submitted) {
    return (
      <View style={styles.centered}>
        <Ionicons name="checkmark-circle" size={64} color="#22c55e" style={{ marginBottom: 16 }} />
        <Text style={styles.thankYou}>Thank you for your feedback!</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#fff' }} contentContainerStyle={{ padding: 24 }}>
      {/* Driver Info */}
      <View style={styles.driverCard}>
        {driver.photo ? (
          <Image source={{ uri: driver.photo }} style={styles.driverPhoto} />
        ) : (
          <Ionicons name="person-circle" size={64} color="#888" />
        )}
        <View style={{ marginLeft: 16 }}>
          <Text style={styles.driverName}>{driver.name}</Text>
          <Text style={styles.driverVehicle}>{driver.vehicleModel} • {driver.vehicleNumber}</Text>
        </View>
      </View>
      {/* Ride Info */}
      {(estimate || destination) && (
        <View style={styles.rideInfoCard}>
          {destination && (
            <View style={styles.rideInfoRow}>
              <Ionicons name="location" size={18} color="#22c55e" style={{ marginRight: 6 }} />
              <Text style={styles.rideInfoText}>To: {destination?.name || destination?.address || 'Destination'}</Text>
            </View>
          )}
          <View style={{ flexDirection: 'row', marginTop: 4 }}>
            {estimate?.distance && (
              <Text style={styles.rideInfoStat}>{estimate.distance} </Text>
            )}
            {estimate?.duration && (
              <Text style={styles.rideInfoStat}>• {estimate.duration} </Text>
            )}
            {estimate?.fare !== undefined && (
              <Text style={styles.rideInfoStat}>• ₹{estimate.fare}</Text>
            )}
          </View>
        </View>
      )}
      {/* Feedback Tags */}
      <Text style={styles.label}>What went well?</Text>
      <View style={styles.tagsRow}>
        {feedbackTags.map(tag => (
          <TouchableOpacity
            key={tag}
            style={[styles.tag, selectedTags.includes(tag) && styles.tagSelected]}
            onPress={() => handleTagToggle(tag)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tagText, selectedTags.includes(tag) && styles.tagTextSelected]}>{tag}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {/* Rating */}
      <Text style={styles.label}>How was your ride?</Text>
      <View style={styles.starsRow}>
        {[1,2,3,4,5].map(i => (
          <TouchableOpacity key={i} onPress={() => setRating(i)}>
            <Ionicons name={i <= rating ? 'star' : 'star-outline'} size={40} color="#fbbf24" style={{ marginHorizontal: 4 }} />
          </TouchableOpacity>
        ))}
      </View>
      {/* Comment */}
      <TextInput
        style={styles.commentBox}
        placeholder="Leave a comment (optional)"
        value={comment}
        onChangeText={setComment}
        multiline
      />
      <TouchableOpacity
        style={[styles.submitButton, { backgroundColor: rating > 0 ? '#22c55e' : '#ccc' }]}
        onPress={handleSubmit}
        disabled={rating === 0}
      >
        <Text style={styles.submitText}>Submit</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  driverCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, marginTop: 24 },
  driverPhoto: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#eee' },
  driverName: { fontSize: 20, fontWeight: 'bold', color: '#222' },
  driverVehicle: { fontSize: 16, color: '#666', marginTop: 2 },
  rideInfoCard: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, marginBottom: 18 },
  rideInfoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  rideInfoText: { fontSize: 15, color: '#222' },
  rideInfoStat: { fontSize: 14, color: '#666', marginRight: 8 },
  label: { fontSize: 17, fontWeight: '600', color: '#222', marginBottom: 10, marginTop: 10 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 18 },
  tag: { backgroundColor: '#f3f4f6', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 7, marginRight: 8, marginBottom: 8 },
  tagSelected: { backgroundColor: '#22c55e' },
  tagText: { color: '#222', fontWeight: '500' },
  tagTextSelected: { color: '#fff' },
  starsRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 18 },
  commentBox: { borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 12, minHeight: 60, fontSize: 16, marginBottom: 24, backgroundColor: '#fafafa' },
  submitButton: { paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  submitText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  thankYou: { fontSize: 22, fontWeight: 'bold', color: '#22c55e', marginTop: 8 },
}); 