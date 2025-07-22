import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Dimensions, TextInput, ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, Animated, Modal, Button, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Colors } from '../../constants/Colors';
import MapView, { Marker } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import { Modal as RNModal } from 'react-native';
import { getDistanceFromLatLonInKm, formatDistance } from '../../utils/helpers';
import * as Location from 'expo-location';

const { width } = Dimensions.get('window');

const RECENT_LOCATIONS = [
  {
    id: '1',
    name: 'DSR Tranquil',
    address: '901, KTR Colony, Mega Hills, Madhapur…',
    latitude: 17.4497,
    longitude: 78.3802,
  },
  {
    id: '2',
    name: 'Durgam Cheruvu Metro Station',
    address: 'Hitech City Road, Sri Sai Nagar, Madhapur…',
    latitude: 17.4369,
    longitude: 78.4031,
  },
  {
    id: '3',
    name: 'MIG-59',
    address: 'Dharma Reddy Colony Phase I, Kukatpally…',
    latitude: 17.4945,
    longitude: 78.3996,
  },
  
  
  
];

const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

// Add a helper to get icon and color for each location type
const getLocationIcon = (name: string) => {
  if (name.toLowerCase().includes('home')) {
    return { icon: <MaterialIcons name="home" size={24} color="#fff" />, bg: '#E53935' };
  }
  if (name.toLowerCase().includes('work') || name.toLowerCase().includes('office')) {
    return { icon: <MaterialIcons name="work" size={24} color="#fff" />, bg: '#F57C00' };
  }
  if (name.toLowerCase().includes('all saved')) {
    return { icon: <MaterialIcons name="bookmark" size={24} color="#fff" />, bg: '#23235B' };
  }
  if (name.toLowerCase().includes('recent') || name.toLowerCase().includes('kfc')) {
    return { icon: <MaterialIcons name="history" size={24} color="#fff" />, bg: '#BDBDBD' };
  }
  return { icon: <MaterialIcons name="bookmark" size={24} color="#fff" />, bg: '#BDBDBD' };
};

function isValidLocation(loc: any) {
  return (
    loc &&
    typeof loc.latitude === 'number' &&
    typeof loc.longitude === 'number'
  );
}

// Helper: Default location (Hyderabad)
const DEFAULT_LOCATION = {
  latitude: 17.4448,
  longitude: 78.3498,
  address: 'Default Current Location',
  name: 'Current Location',
};

export default function DropLocationSelectorScreen({ navigation, route }: any) {
  const [dropLocation, setDropLocation] = useState<any>(null);
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [editing, setEditing] = useState<'drop' | 'current' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [noResults, setNoResults] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [savedLocations, setSavedLocations] = useState<{ home?: any; work?: any; custom?: any[] }>({});
  const isFocused = useIsFocused();
  const [fadeAnim] = useState(new Animated.Value(0));
  const [showSavedModal, setShowSavedModal] = useState(false);
  const autoProceedHandled = useRef(false);
  const [forWhom, setForWhom] = useState<'me' | 'friend'>('me');
  const [showForWhomModal, setShowForWhomModal] = useState(false);
  const [friendName, setFriendName] = useState('');
  const [friendPhone, setFriendPhone] = useState('');

  useEffect(() => {
    if (route.params?.pickup) {
      setCurrentLocation(route.params.pickup);
      setEditing(null);
      setSearchQuery(route.params.pickup.address || route.params.pickup.name || '');
      // Do not auto-proceed for pickup
    }
    if (route.params?.destination) {
      setDropLocation(route.params.destination);
      if (editing === 'drop') setSearchQuery(route.params.destination.address || route.params.destination.name || '');
      // Always auto-proceed to RideOptions if destination is set from map
      if (!autoProceedHandled.current) {
        autoProceedHandled.current = true;
        setTimeout(() => {
          // Defensive: fallback to default if currentLocation is null
          const pickup = isValidLocation(currentLocation) ? currentLocation : DEFAULT_LOCATION;
          if (!isValidLocation(pickup) || !isValidLocation(route.params.destination)) {
            Alert.alert('Error', 'Current location or drop location is missing or invalid.');
            return;
          }
          navigation.replace('RideOptions', {
            pickup,
            drop: route.params.destination,
            forWhom,
            friendName,
            friendPhone,
          });
        }, 300);
      }
    } else {
      autoProceedHandled.current = false;
    }
  }, [route.params?.pickup, route.params?.destination, currentLocation, forWhom, friendName, friendPhone]);

  useEffect(() => {
    if ((editing === 'drop' || editing === 'current') && searchQuery.length > 2) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        searchPlaces(searchQuery);
      }, 300);
    } else {
      setSearchResults([]);
      setNoResults(false);
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, editing]);

  useEffect(() => {
    console.log('dropLocation changed:', dropLocation);
  }, [dropLocation]);

  useEffect(() => {
    if (!currentLocation) {
      setCurrentLocation(DEFAULT_LOCATION);
    }
  }, [currentLocation]);

  useEffect(() => {
    // Load saved locations from AsyncStorage every time screen is focused
    const loadSavedLocations = async () => {
      try {
        const data = await AsyncStorage.getItem('@saved_locations');
        if (data) {
          setSavedLocations(JSON.parse(data));
        } else {
          setSavedLocations({});
        }
      } catch (e) {
        setSavedLocations({});
      }
    };
    if (isFocused) {
      loadSavedLocations();
    }
  }, [isFocused]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const searchPlaces = async (query: string) => {
    if (query.length < 3) return;
    setIsSearching(true);
    setNoResults(false);
    try {
      let location = '28.6139,77.2090'; // Default: Delhi
      const radius = 50000;
      
      console.log('🔍 Searching places for:', query);
      console.log('🔑 Using API key:', GOOGLE_MAPS_API_KEY ? 'Present' : 'Missing');
      
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&location=${location}&radius=${radius}&components=country:in&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      console.log('📡 Places API response:', data.status, data.error_message || 'No error');
      
      if (data.status === 'OK' && data.predictions && data.predictions.length > 0) {
        console.log('✅ Found', data.predictions.length, 'places');
        // Fetch coordinates for each result
        const resultsWithCoords = await Promise.all(
          data.predictions.slice(0, 5).map(async (prediction: any) => {
            try {
              const details = await getPlaceDetails(prediction.place_id);
              if (details && details.geometry) {
                return {
                  ...prediction,
                  latitude: details.geometry.location.lat,
                  longitude: details.geometry.location.lng,
                  address: details.formatted_address
                };
              }
              return prediction;
            } catch (error) {
              console.log('Failed to get details for:', prediction.place_id);
              return prediction;
            }
          })
        );
        setSearchResults(resultsWithCoords);
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
    } catch (error) {
      console.error('❌ Network error:', error);
      setSearchResults([]);
      setNoResults(true);
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
          },
          latitude: result.geometry.location.lat,
          longitude: result.geometry.location.lng,
          address: result.formatted_address
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

  const getPlaceDetails = async (placeId: string) => {
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

  const handleLocationSelect = async (item: any, autoProceed: boolean = false) => {
    let location;
    
    // If user selects 'Current Location' as pickup
    if (editing === 'current' && (item.name === 'Current Location' || item.address === 'Current Location')) {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission to access location was denied');
        return;
      }
      let loc = await Location.getCurrentPositionAsync({});
      location = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        address: 'Current Location',
        name: 'Current Location',
      };
      setCurrentLocation(location);
      setSearchQuery('Current Location');
      setEditing(null);
      setSearchResults([]);
      setNoResults(false);
      Keyboard.dismiss();
      return;
    }
    // Handle offline results (they already have coordinates)
    if (item.place_id && item.place_id.startsWith('offline_')) {
      location = {
        latitude: item.latitude,
        longitude: item.longitude,
        address: item.address,
        name: item.structured_formatting?.main_text || item.description,
      };
    } else if (item.place_id) {
      const placeDetails = await getPlaceDetails(item.place_id);
      if (!placeDetails) return;
      location = {
        latitude: placeDetails.geometry.location.lat,
        longitude: placeDetails.geometry.location.lng,
        address: placeDetails.formatted_address,
        name: item.structured_formatting?.main_text || item.description,
      };
    } else {
      location = item;
    }
    if (editing === 'drop' || autoProceed) {
      setDropLocation(location);
      setEditing(null);
      setSearchQuery(location.address || location.name || '');
      setSearchResults([]);
      setNoResults(false);
      Keyboard.dismiss();
      // Defensive: fallback to default if currentLocation is null
      const pickup = isValidLocation(currentLocation) ? currentLocation : DEFAULT_LOCATION;
      if (isValidLocation(pickup) && isValidLocation(location)) {
        navigation.replace('RideOptions', {
          pickup,
          drop: location,
          forWhom,
          friendName,
          friendPhone,
        });
      } else {
        Alert.alert('Error', 'Current location or drop location is missing or invalid.');
      }
      return;
    } else if (editing === 'current') {
      setCurrentLocation(location);
      setSearchQuery(location.address || location.name || ''); // update input with selected value
    }
    setEditing(null);
    setSearchResults([]);
    setNoResults(false);
    Keyboard.dismiss();
  };

  const handleSelectOnMap = () => {
    navigation.navigate('DropPinLocation');
  };

  const handleConfirmDrop = () => {
    // Defensive: fallback to default if currentLocation is null
    const pickup = isValidLocation(currentLocation) ? currentLocation : DEFAULT_LOCATION;
    if (isValidLocation(pickup) && isValidLocation(dropLocation)) {
      navigation.replace('RideOptions', {
        pickup,
        drop: dropLocation,
        forWhom,
        friendName,
        friendPhone,
      });
    } else {
      Alert.alert('Error', 'Current location or drop location is missing or invalid.');
    }
  };

  // Update renderSearchResult to match the desired UI
  const renderSearchResult = ({ item, index }: { item: any, index: number }) => {
    // Debug: log what data we have
    console.log('Search result item:', item);
    console.log('Current location:', currentLocation);
    
    // Calculate real distance if possible
    let realDistance = null;
    if (
      currentLocation &&
      typeof currentLocation.latitude === 'number' &&
      typeof currentLocation.longitude === 'number' &&
      typeof item.latitude === 'number' &&
      typeof item.longitude === 'number'
    ) {
      realDistance = getDistanceFromLatLonInKm(
        currentLocation.latitude,
        currentLocation.longitude,
        item.latitude,
        item.longitude
      );
      console.log('Calculated distance:', realDistance);
    } else {
      console.log('Cannot calculate distance - missing coordinates');
    }
    
    return (
      <TouchableOpacity
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#fff',
          borderRadius: 16,
          paddingVertical: 14,
          paddingHorizontal: 16,
          marginHorizontal: 16,
          marginBottom: 10,
          elevation: 2,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 4,
        }}
        onPress={() => handleLocationSelect(item)}
      >
        {/* Location pin and distance */}
        <View style={{ alignItems: 'center', width: 40 }}>
          <Ionicons name="location-outline" size={20} color="#888" />
          <Text style={{ fontSize: 13, color: '#888', marginTop: 2 }}>
            {realDistance !== null ? formatDistance(realDistance) : '...'}
          </Text>
        </View>
        {/* Main content */}
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#222' }}>
            {item.structured_formatting?.main_text || item.name || item.description}
          </Text>
          <Text style={{ fontSize: 14, color: '#888' }} numberOfLines={1}>
            {item.structured_formatting?.secondary_text || item.address}
          </Text>
        </View>
        {/* Heart icon */}
        <Ionicons name="heart-outline" size={20} color="#bbb" style={{ marginLeft: 10 }} />
      </TouchableOpacity>
    );
  };

  const renderLocation = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.locationItemModern}
      onPress={() => {
        setDropLocation({
          ...item,
          latitude: item.latitude,
          longitude: item.longitude,
        });
        setEditing('drop');
        setSearchQuery(item.address || item.name || '');
        setSearchResults([]);
        setNoResults(false);
        Keyboard.dismiss();
      }}
    >
      <Ionicons name="time-outline" size={22} color={Colors.gray400} style={{ marginRight: 14 }} />
      <View style={{ flex: 1 }}>
        <Text style={styles.locationNameModern}>{item.name}</Text>
        <Text style={styles.locationAddressModern} numberOfLines={1}>{item.address}</Text>
      </View>
      <Ionicons name="heart-outline" size={22} color={Colors.gray400} />
    </TouchableOpacity>
  );

  const getListData = () => {
    let data: any[] = [];
    if (savedLocations.home) data.push({ ...savedLocations.home, id: 'home' });
    if (savedLocations.work) data.push({ ...savedLocations.work, id: 'work' });
    if (savedLocations.custom && Array.isArray(savedLocations.custom)) {
      data = data.concat(savedLocations.custom.map((loc, idx) => ({ ...loc, id: `custom_${idx}` })));
    }
    // Removed dummy recents/hardcoded
    return data;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F7F7F7' }}>
      {/* Back button at the top left */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={{ position: 'absolute', top: 20, left: 20, zIndex: 10 }}>
        <Ionicons name="arrow-back" size={28} color={Colors.text} />
      </TouchableOpacity>
      <FlatList
        data={(() => {
          // Sectioned data: recents first, then saved
          let flatListData = [];
          // Add recents (avoid duplicates with saved)
          RECENT_LOCATIONS.forEach((loc) => {
            const isDuplicate = (savedLocations.home && loc.address === savedLocations.home.address) ||
              (savedLocations.work && loc.address === savedLocations.work.address) ||
              (savedLocations.custom && savedLocations.custom.some((c) => c.address === loc.address));
            if (!isDuplicate) flatListData.push({ ...loc, type: 'recent' });
          });
          // Add saved locations
          if (savedLocations.home) flatListData.push({ ...savedLocations.home, type: 'saved', id: 'home' });
          if (savedLocations.work) flatListData.push({ ...savedLocations.work, type: 'saved', id: 'work' });
          if (savedLocations.custom && Array.isArray(savedLocations.custom)) {
            savedLocations.custom.forEach((loc, idx) => flatListData.push({ ...loc, type: 'saved', id: `custom_${idx}` }));
          }
          return (editing === 'drop' || editing === 'current') && searchQuery.length > 2 ? searchResults : flatListData;
        })()}
        keyExtractor={(item, index) => {
          if (item.place_id) return item.place_id;
          if (item.id) return String(item.id);
          return `${item.address || ''}_${item.name || ''}_${index}`;
        }}
        renderItem={({ item, index }) => {
          // Section heading logic
          let showRecentHeading = false;
          let showSavedHeading = false;
          const flatListData = (() => {
            let d = [];
            RECENT_LOCATIONS.forEach((loc) => {
              const isDuplicate = (savedLocations.home && loc.address === savedLocations.home.address) ||
                (savedLocations.work && loc.address === savedLocations.work.address) ||
                (savedLocations.custom && savedLocations.custom.some((c) => c.address === loc.address));
              if (!isDuplicate) d.push({ ...loc, type: 'recent' });
            });
            if (savedLocations.home) d.push({ ...savedLocations.home, type: 'saved', id: 'home' });
            if (savedLocations.work) d.push({ ...savedLocations.work, type: 'saved', id: 'work' });
            if (savedLocations.custom && Array.isArray(savedLocations.custom)) {
              savedLocations.custom.forEach((loc, idx) => d.push({ ...loc, type: 'saved', id: `custom_${idx}` }));
            }
            return d;
          })();
          if (item.type === 'recent') {
            showRecentHeading =
              index === 0 || (flatListData[index - 1] && flatListData[index - 1].type !== 'recent');
          }
          if (item.type === 'saved') {
            showSavedHeading =
              index === 0 || (flatListData[index - 1] && flatListData[index - 1].type !== 'saved');
          }
          return (
            <View>
              {showRecentHeading && (
                <Text style={{ marginLeft: 16, marginTop: 12, fontWeight: '700', color: '#23235B', fontSize: 15 }}>Recent</Text>
              )}
              {showSavedHeading && (
                <Text style={{ marginLeft: 16, marginTop: 12, fontWeight: '700', color: '#23235B', fontSize: 15 }}>Saved</Text>
              )}
              <TouchableOpacity style={{ padding: 16, flexDirection: 'row', alignItems: 'center' }} onPress={() => handleLocationSelect(item)}>
                <Ionicons name="location-sharp" size={20} color="#4CAF50" style={{ marginRight: 12 }} />
                <View>
                  <Text style={{ fontWeight: '600', color: '#222', fontSize: 15 }}>{item.name || item.address}</Text>
                  {item.address && <Text style={{ color: '#888', fontSize: 13 }}>{item.address}</Text>}
                </View>
              </TouchableOpacity>
            </View>
          );
        }}
        ListHeaderComponent={
          <>
            {/* Top selectors and editing indicator */}
            <View style={{
              marginHorizontal: 16,
              marginTop: 24,
              marginBottom: 18,
              borderRadius: 20,
              backgroundColor: '#fff',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 4,
              paddingVertical: 18,
              paddingHorizontal: 18,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, marginRight: 8, flex: 1 }}>
                <Ionicons name="location-sharp" size={20} color="#4CAF50" style={{ marginRight: 8 }} />
                <Text style={{ fontWeight: '700', color: '#222', fontSize: 16 }}>Pick-up now</Text>
                <Ionicons name="chevron-down" size={18} color="#4CAF50" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
              <View style={{ width: 12 }} />
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, flex: 1 }}
                onPress={() => setShowForWhomModal(true)}
              >
                <Ionicons name="person-circle" size={20} color="#4CAF50" style={{ marginRight: 8 }} />
                <Text style={{ fontWeight: '700', color: '#222', fontSize: 16 }}>{forWhom === 'me' ? 'For me' : `For friend${friendName ? ': ' + friendName : ''}`}</Text>
                <Ionicons name="chevron-down" size={18} color="#4CAF50" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            </View>
            {editing && (
              <View style={{ marginHorizontal: 16, marginBottom: 8 }}>
                <Text style={{
                  fontSize: 14,
                  color: editing === 'current' ? '#E53935' : '#23235B',
                  fontWeight: '600',
                  textAlign: 'center'
                }}>
                  {editing === 'current' ? 'Editing pickup location...' : 'Editing drop location...'}
                </Text>
              </View>
            )}
            {/* Location Card - Outlined, rounded, vertical icon style */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'stretch',
                  backgroundColor: '#fff',
                  borderRadius: 16,
                  borderWidth: 2,
                  borderColor: editing === 'current' ? '#E53935' : editing === 'drop' ? '#23235B' : '#222',
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  minHeight: 64,
                }}>
                  <View style={{ alignItems: 'center', marginRight: 10, width: 20 }}>
                    <Ionicons name="ellipse" size={18} color={'#22c55e'} style={{ marginBottom: 2 }} />
                    <View style={{ width: 2, flex: 1, backgroundColor: '#E0E0E0', marginVertical: 2 }} />
                    <Ionicons name="square" size={18} color={'#E53935'} style={{ marginTop: 2 }} />
                  </View>
                  <View style={{ flex: 1, justifyContent: 'center' }}>
                    <TouchableOpacity onPress={() => { setEditing('current'); setSearchQuery(currentLocation?.address || currentLocation?.name || ''); }} activeOpacity={0.8}>
                      {editing === 'current' ? (
                        <TextInput
                          style={{ color: '#222', fontWeight: 'bold', fontSize: 15, paddingVertical: 0, paddingHorizontal: 0, marginBottom: 0 }}
                          value={searchQuery}
                          onChangeText={setSearchQuery}
                          autoFocus
                          clearButtonMode="while-editing"
                          onSubmitEditing={() => setEditing(null)}
                        />
                      ) : (
                        <Text style={{ color: '#222', fontWeight: 'bold', fontSize: 15 }}>{currentLocation?.address || currentLocation?.name || 'Current Location'}</Text>
                      )}
                    </TouchableOpacity>
                    <View style={{ height: 20 }} />
                    <TouchableOpacity onPress={() => { setEditing('drop'); setSearchQuery(dropLocation?.address || dropLocation?.name || ''); }} activeOpacity={0.8}>
                      {editing === 'drop' ? (
                        <TextInput
                          style={{ color: '#888', fontSize: 15, paddingVertical: 0, paddingHorizontal: 0, marginTop: 2 }}
                          value={searchQuery}
                          onChangeText={setSearchQuery}
                          placeholder="Where to?"
                          autoFocus
                          clearButtonMode="while-editing"
                          returnKeyType="send"
                          onSubmitEditing={() => {
                            if (dropLocation) {
                              navigation.replace('RideOptions', {
                                pickup: currentLocation,
                                drop: dropLocation,
                                forWhom,
                                friendName,
                                friendPhone,
                              });
                            }
                          }}
                        />
                      ) : (
                        <Text style={{ color: '#888', fontSize: 15, marginTop: 2 }}>{dropLocation ? dropLocation.address || dropLocation.name : 'Where to?'}</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          </>
        }
        ListEmptyComponent={
          isSearching ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 40 }}>
              <ActivityIndicator color={Colors.primary} />
            </View>
          ) : noResults ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 40 }}>
              <Text style={{ color: Colors.textLight }}>No suggestions found</Text>
            </View>
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
      />
      {/* Set location on map button at the bottom */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', paddingBottom: 16, paddingTop: 8, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#eee', zIndex: 100 }}>
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, width: '92%', borderRadius: 18, justifyContent: 'center' }}
          onPress={() => {
            if (editing === 'current') {
              navigation.navigate('DropPinLocation', { mode: 'pickup' });
            } else if (editing === 'drop') {
              navigation.navigate('DropPinLocation', { mode: 'drop' });
            } else {
              navigation.navigate('DropPinLocation', { mode: 'drop' });
            }
          }}
        >
          <Ionicons name="location-sharp" size={22} color="#23235B" style={{ marginRight: 16 }} />
          <Text style={{ color: '#23235B', fontSize: 16, fontWeight: '700' }}>Set location on map</Text>
        </TouchableOpacity>
      </View>
      {/* For Whom Modal (unchanged) */}
      <RNModal
        visible={showForWhomModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowForWhomModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '85%' }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>Who is this ride for?</Text>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}
              onPress={() => { setForWhom('me'); setShowForWhomModal(false); }}
            >
              <Ionicons name="person" size={22} color={forWhom === 'me' ? '#23235B' : '#bbb'} style={{ marginRight: 10 }} />
              <Text style={{ fontWeight: '600', color: forWhom === 'me' ? '#23235B' : '#bbb' }}>For me</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}
              onPress={() => { setForWhom('friend'); setShowForWhomModal(false); }}
            >
              <Ionicons name="person-add" size={22} color={forWhom === 'friend' ? '#23235B' : '#bbb'} style={{ marginRight: 10 }} />
              <Text style={{ fontWeight: '600', color: forWhom === 'friend' ? '#23235B' : '#bbb' }}>For a friend</Text>
            </TouchableOpacity>
            {forWhom === 'friend' && (
              <>
                <TextInput
                  style={{ borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 10, marginBottom: 10, marginTop: 4 }}
                  placeholder="Friend's Name"
                  value={friendName}
                  onChangeText={setFriendName}
                />
                <TextInput
                  style={{ borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 10, marginBottom: 10 }}
                  placeholder="Friend's Phone Number"
                  value={friendPhone}
                  onChangeText={setFriendPhone}
                  keyboardType="phone-pad"
                />
              </>
            )}
            <Button title="Done" onPress={() => setShowForWhomModal(false)} />
          </View>
        </View>
      </RNModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: Colors.background,
  },
  navIcon: {
    padding: 4,
  },
  navTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  navDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  navDropdownText: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500',
  },
  summaryCardModern: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 24,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
  },
  summaryIcons: {
    alignItems: 'center',
    marginRight: 14,
    height: 60,
    justifyContent: 'space-between',
  },
  iconShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  dottedLine: {
    width: 2,
    flex: 1,
    borderStyle: 'dotted',
    borderWidth: 1,
    borderColor: Colors.gray300,
    marginVertical: 2,
    borderRadius: 1,
  },
  summaryTextCol: {
    flex: 1,
    justifyContent: 'space-between',
  },
  summaryTitleModern: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: Colors.gray200,
    marginVertical: 2,
    borderRadius: 1,
  },
  summarySubtitleModern: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.coral,
    marginTop: 8,
  },
  inputModern: {
    color: Colors.text,
    backgroundColor: Colors.gray50,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 16,
    height: 40,
    marginVertical: 4,
  },
  listContentModern: {
    paddingHorizontal: 8,
    paddingBottom: 24,
    marginTop: 8,
  },
  locationItemModern: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 18,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  locationNameModern: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 2,
  },
  locationAddressModern: {
    fontSize: 14,
    color: Colors.gray400,
    fontWeight: '400',
  },
  iconCircleModern: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 18,
  },
  allSavedModern: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 18,
    backgroundColor: '#fff',
    marginTop: 10,
    borderRadius: 18,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  allSavedTextModern: {
    fontSize: 16,
    fontWeight: '700',
    color: '#23235B',
    flex: 1,
  },
  searchBarModern: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    borderRadius: 16,
    marginHorizontal: 16,
    paddingHorizontal: 16,
    height: 48,
    marginBottom: 12,
    marginTop: 8,
  },
  searchInputModern: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  floatingButtonModern: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 12,
  },
  setOnMapButtonModern: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#23235B',
    paddingVertical: 18,
    width: '92%',
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
  },
  setOnMapButtonTextModern: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.2,
  },
}); 