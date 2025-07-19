import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import { useLocationStore } from '../../store/useLocationStore';
import LocationPickerMap from '../../components/common/LocationPickerMap';
import ConnectionStatus from '../../components/common/ConnectionStatus';

const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

interface PlaceResult {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface PlaceDetails {
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  formatted_address: string;
}

export default function LocationSearchScreen({ navigation, route }: any) {
  const { type } = route.params; // 'pickup' or 'destination'
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [noResults, setNoResults] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { recentLocations } = useLocationStore();

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchQuery.length > 2) {
      debounceRef.current = setTimeout(() => {
        searchPlaces(searchQuery);
      }, 500); // Increased debounce time for better performance
    } else {
      setSearchResults([]);
      setNoResults(false);
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const searchPlaces = async (query: string) => {
    setIsSearching(true);
    setNoResults(false);
    try {
      // Default to New Delhi if no location
      const location = '28.6139,77.2090';
      const radius = 50000; // 50km
      
      console.log('🔍 Searching places for:', query);
      console.log('🔑 Using API key:', GOOGLE_MAPS_API_KEY ? 'Present' : 'Missing');
      
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&location=${location}&radius=${radius}&components=country:in&key=${GOOGLE_MAPS_API_KEY}`,
        {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          }
        }
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📡 Places API response:', data.status, data.error_message || 'No error');
      
      if (data.status === 'OK' && data.predictions && data.predictions.length > 0) {
        console.log('✅ Found', data.predictions.length, 'places');
        setSearchResults(data.predictions);
        setNoResults(false);
      } else if (data.status === 'REQUEST_DENIED') {
        console.error('❌ Places API access denied:', data.error_message);
        // Fallback to basic search
        await searchPlacesFallback(query);
      } else if (data.status === 'ZERO_RESULTS') {
        console.log('📭 No results found');
        setSearchResults([]);
        setNoResults(true);
      } else {
        console.error('❌ Places API error:', data.status, data.error_message);
        setSearchResults([]);
        setNoResults(true);
      }
    } catch (error: any) {
      console.error('❌ Network error:', error);
      if (error.name === 'AbortError') {
        console.log('⏰ Request timeout, trying offline fallback');
        await searchPlacesOffline(query);
      } else {
        setSearchResults([]);
        setNoResults(true);
      }
    } finally {
      setIsSearching(false);
    }
  };

  // Fallback search using Geocoding API
  const searchPlacesFallback = async (query: string) => {
    try {
      console.log('🔄 Using fallback geocoding search');
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&components=country:in&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const fallbackResults = data.results.slice(0, 5).map((result: any) => ({
          place_id: result.place_id,
          description: result.formatted_address,
          structured_formatting: {
            main_text: result.formatted_address.split(',')[0],
            secondary_text: result.formatted_address.split(',').slice(1).join(',').trim()
          }
        }));
        setSearchResults(fallbackResults);
        setNoResults(false);
      } else {
        // Try offline fallback
        await searchPlacesOffline(query);
      }
    } catch (error) {
      console.error('❌ Fallback search failed:', error);
      // Try offline fallback
      await searchPlacesOffline(query);
    }
  };

  // Offline fallback with common locations
  const searchPlacesOffline = async (query: string) => {
    console.log('📱 Using offline fallback search');
    
    const commonLocations = [
      { name: 'Delhi', address: 'Delhi, India', lat: 28.6139, lng: 77.2090 },
      { name: 'Mumbai', address: 'Mumbai, Maharashtra, India', lat: 19.0760, lng: 72.8777 },
      { name: 'Bangalore', address: 'Bangalore, Karnataka, India', lat: 12.9716, lng: 77.5946 },
      { name: 'Hyderabad', address: 'Hyderabad, Telangana, India', lat: 17.3850, lng: 78.4867 },
      { name: 'Chennai', address: 'Chennai, Tamil Nadu, India', lat: 13.0827, lng: 80.2707 },
      { name: 'Kolkata', address: 'Kolkata, West Bengal, India', lat: 22.5726, lng: 88.3639 },
      { name: 'Pune', address: 'Pune, Maharashtra, India', lat: 18.5204, lng: 73.8567 },
      { name: 'Ahmedabad', address: 'Ahmedabad, Gujarat, India', lat: 23.0225, lng: 72.5714 },
      { name: 'Jaipur', address: 'Jaipur, Rajasthan, India', lat: 26.9124, lng: 75.7873 },
      { name: 'Surat', address: 'Surat, Gujarat, India', lat: 21.1702, lng: 72.8311 }
    ];
    
    const filteredLocations = commonLocations.filter(location =>
      location.name.toLowerCase().includes(query.toLowerCase()) ||
      location.address.toLowerCase().includes(query.toLowerCase())
    );
    
    if (filteredLocations.length > 0) {
      const offlineResults = filteredLocations.slice(0, 5).map((location, index) => ({
        place_id: `offline_${index}`,
        description: location.address,
        structured_formatting: {
          main_text: location.name,
          secondary_text: location.address.replace(location.name + ', ', '')
        },
        // Add coordinates for direct use
        latitude: location.lat,
        longitude: location.lng,
        address: location.address
      }));
      setSearchResults(offlineResults);
      setNoResults(false);
    } else {
      setSearchResults([]);
      setNoResults(true);
    }
  };

  const getPlaceDetails = async (placeId: string): Promise<PlaceDetails | null> => {
    try {
      console.log('🔍 Getting place details for:', placeId);
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,formatted_address&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      console.log('📡 Place details response:', data.status, data.error_message || 'No error');
      
      if (data.status === 'OK' && data.result) {
        console.log('✅ Place details retrieved successfully');
        return data.result;
      } else if (data.status === 'REQUEST_DENIED') {
        console.error('❌ Place details API access denied:', data.error_message);
        return null;
      } else {
        console.error('❌ Place details API error:', data.status, data.error_message);
        return null;
      }
    } catch (error) {
      console.error('❌ Place details network error:', error);
      return null;
    }
  };

  const handleLocationSelect = async (item: PlaceResult | any) => {
    let location;
    
    // Handle offline results (they already have coordinates)
    if (item.place_id && item.place_id.startsWith('offline_')) {
      location = {
        latitude: item.latitude,
        longitude: item.longitude,
        address: item.address,
      };
    } else if (item.place_id) {
      const placeDetails = await getPlaceDetails(item.place_id);
      if (!placeDetails) return;
      location = {
        latitude: placeDetails.geometry.location.lat,
        longitude: placeDetails.geometry.location.lng,
        address: placeDetails.formatted_address,
      };
    } else {
      // Recent location
      location = item;
    }
    
    if (type === 'pickup') {
      useLocationStore.getState().setPickupLocation(location);
      navigation.goBack();
    } else if (type === 'destination') {
      useLocationStore.getState().setDropoffLocation(location);
      navigation.navigate('RideEstimate', { destination: location });
    }
  };

  const renderRecentLocation = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.resultItem} onPress={() => handleLocationSelect(item)}>
      <Ionicons name="time-outline" size={20} color={Colors.primary} style={{ marginRight: 12 }} />
      <View>
        <Text style={styles.resultMain}>{item.address || item.name}</Text>
        {item.address && <Text style={styles.resultSecondary}>{item.address}</Text>}
      </View>
    </TouchableOpacity>
  );

  const renderSearchResult = ({ item }: { item: PlaceResult }) => (
    <TouchableOpacity style={styles.resultItem} onPress={() => handleLocationSelect(item)}>
      <Ionicons name="location-outline" size={20} color={Colors.primary} style={{ marginRight: 12 }} />
      <View>
        <Text style={styles.resultMain}>{item.structured_formatting.main_text}</Text>
        <Text style={styles.resultSecondary}>{item.structured_formatting.secondary_text}</Text>
      </View>
    </TouchableOpacity>
  );

  // Combine recent locations and search results for FlatList
  const showRecent = searchQuery.length > 2 && recentLocations.length > 0;
  const combinedData = showRecent
    ? [
        { title: 'Recent Locations', data: recentLocations, isRecent: true },
        { title: 'Suggestions', data: searchResults, isRecent: false },
      ]
    : [{ title: 'Suggestions', data: searchResults, isRecent: false }];

  return (
    <SafeAreaView style={styles.container}>
      <ConnectionStatus />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {type === 'pickup' ? 'Pickup Location' : 'Where to?'}
        </Text>
      </View>
      {/* Search Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder={`Search for ${type} location`}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoFocus
          clearButtonMode="while-editing"
        />
      </View>
      {/* Map or Results */}
      <View style={{ flex: 1 }}>
        {searchQuery.length === 0 ? (
          <LocationPickerMap
            mode={type}
            onLocationSelected={(location) => {
              if (type === 'pickup') {
                useLocationStore.getState().setPickupLocation(location);
                navigation.goBack();
              } else if (type === 'destination') {
                useLocationStore.getState().setDropoffLocation(location);
                navigation.navigate('RideEstimate', { destination: location });
              }
            }}
          />
        ) : isSearching ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : noResults ? (
          <View style={styles.loadingContainer}>
            <Text style={{ color: Colors.textLight }}>No suggestions found</Text>
          </View>
        ) : (
          <FlatList
            data={showRecent ? recentLocations.concat(searchResults) : searchResults}
            keyExtractor={(item, idx) => item.place_id ? item.place_id : item.address + idx}
            renderItem={({ item, index }) =>
              item.place_id
                ? renderSearchResult({ item })
                : renderRecentLocation({ item })
            }
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              showRecent && recentLocations.length > 0 ? (
                <Text style={{ fontWeight: '600', color: Colors.text, marginBottom: 8 }}>
                  Recent Locations
                </Text>
              ) : null
            }
          />
        )}
        {/* Set location on the map button */}
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: '#23235B',
              paddingVertical: 16,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              zIndex: 10,
            }}
            onPress={() => navigation.navigate('DropPinLocation')}
          >
            <MaterialIcons name="my-location" size={22} color="#fff" style={{ marginRight: 8 }} />
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>
              Set location on the map
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
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
  inputContainer: {
    paddingHorizontal: Layout.spacing.lg,
    paddingTop: Layout.spacing.md,
    paddingBottom: Layout.spacing.sm,
  },
  textInput: {
    fontSize: 16,
    backgroundColor: Colors.gray50,
    borderRadius: Layout.borderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  listContent: {
    paddingHorizontal: Layout.spacing.lg,
    paddingTop: 8,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  resultMain: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  resultSecondary: {
    fontSize: 14,
    color: Colors.textLight,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
