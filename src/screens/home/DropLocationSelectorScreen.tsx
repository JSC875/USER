import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Dimensions, TextInput, ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, Animated, Modal, Button, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import MapView, { Marker } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import { Modal as RNModal } from 'react-native';

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

const GOOGLE_MAPS_API_KEY = 'AIzaSyDHN3SH_ODlqnHcU9Blvv2pLpnDNkg03lU';

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

// Add a helper for distance formatting (mock for now)
const formatDistance = (distance: number) => `${distance} mi`;

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
    if (!currentLocation) {
      setCurrentLocation(DEFAULT_LOCATION);
    }
  }, [currentLocation]);

  useEffect(() => {
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
  }, [route.params?.destination, currentLocation, forWhom, friendName, friendPhone]);

  useEffect(() => {
    if (editing && searchQuery.length > 2) {
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
      setCurrentLocation({
        latitude: 17.4448, // Example: Hyderabad
        longitude: 78.3498,
        address: 'Default Current Location',
        name: 'Current Location',
      });
    }
  }, []);

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
    setIsSearching(true);
    setNoResults(false);
    try {
      let location = '28.6139,77.2090'; // Default: Delhi
      const radius = 50000;
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&location=${location}&radius=${radius}&components=country:in&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      if (data.status === 'OK' && data.predictions.length > 0) {
        setSearchResults(data.predictions || []);
        setNoResults(false);
      } else {
        setSearchResults([]);
        setNoResults(true);
      }
    } catch (error) {
      setSearchResults([]);
      setNoResults(true);
    } finally {
      setIsSearching(false);
    }
  };

  const getPlaceDetails = async (placeId: string) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,formatted_address&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      if (data.status === 'OK') {
        return data.result;
      } else {
        return null;
      }
    } catch (error) {
      return null;
    }
  };

  const handleLocationSelect = async (item: any, autoProceed: boolean = false) => {
    let location;
    if (item.place_id) {
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
    }
    setSearchQuery(location.address || location.name || '');
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
    // Mock distance for UI (replace with real calculation if you have lat/lng)
    const mockDistance = 11 + (index % 3); // 11, 12, 13 km cycling

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
          <Text style={{ fontSize: 13, color: '#888', marginTop: 2 }}>{mockDistance} km</Text>
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
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }} // ensures content is not hidden behind the button
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ position: 'absolute', top: 20, left: 20, zIndex: 10 }}>
          <Ionicons name="arrow-back" size={28} color={Colors.text} />
        </TouchableOpacity>
        {/* Top Bar */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10, backgroundColor: '#fff' }}>
          <Text style={{ fontSize: 22, fontWeight: '700', color: '#222', flex: 1, textAlign: 'center', marginLeft: -26 }}>Drop Location</Text>
          <View style={{ width: 26 }} />
        </View>
        {/* Selectors */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 10 }}>
          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F7', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 8, marginRight: 8 }}>
            <MaterialCommunityIcons name="clock-outline" size={18} color="#222" style={{ marginRight: 6 }} />
            <Text style={{ fontWeight: '600', color: '#222' }}>Pick-up now</Text>
            <Ionicons name="chevron-down" size={16} color="#222" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F7', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 8 }}
            onPress={() => setShowForWhomModal(true)}
          >
            <MaterialCommunityIcons name="account-outline" size={18} color="#222" style={{ marginRight: 6 }} />
            <Text style={{ fontWeight: '600', color: '#222' }}>{forWhom === 'me' ? 'For me' : `For friend${friendName ? ': ' + friendName : ''}`}</Text>
            <Ionicons name="chevron-down" size={16} color="#222" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </View>
        {/* Location Card - Outlined, rounded, vertical icon style */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 16 }}>
          <View style={{ flex: 1 }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'stretch',
              backgroundColor: '#fff',
              borderRadius: 16,
              borderWidth: 2,
              borderColor: '#222',
              paddingVertical: 10,
              paddingHorizontal: 14,
              minHeight: 64,
            }}>
              {/* Vertical icons and line */}
              <View style={{ alignItems: 'center', marginRight: 10, width: 20 }}>
                <Ionicons name="ellipse" size={18} color="#222" style={{ marginBottom: 2 }} />
                <View style={{ width: 2, flex: 1, backgroundColor: '#E0E0E0', marginVertical: 2 }} />
                <Ionicons name="square" size={18} color="#222" style={{ marginTop: 2 }} />
              </View>
              {/* Pickup and Drop fields */}
              <View style={{ flex: 1, justifyContent: 'center' }}>
                {/* Pickup field */}
                <TouchableOpacity onPress={() => { setEditing('current'); setSearchQuery(currentLocation?.address || currentLocation?.name || ''); }} activeOpacity={0.8}>
                  {editing === 'current' ? (
                    <TextInput
                      style={{ color: '#222', fontWeight: 'bold', fontSize: 15, paddingVertical: 0, paddingHorizontal: 0, marginBottom: 0 }}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      placeholder={currentLocation?.address ? currentLocation.address : 'Current Location'}
                      autoFocus
                      clearButtonMode="while-editing"
                      onSubmitEditing={() => setEditing(null)}
                    />
                  ) : (
                    <Text style={{ color: '#222', fontWeight: 'bold', fontSize: 15 }}>{currentLocation?.address || currentLocation?.name || 'Current Location'}</Text>
                  )}
                </TouchableOpacity>
                {/* Add gap between pickup and drop fields */}
                <View style={{ height: 20 }} />
                {/* Drop field */}
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
        {/* Show suggestions OR recent/saved locations depending on typing state */}
        {editing === 'drop' && searchQuery.length > 2 ? (
          isSearching ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator color={Colors.primary} />
            </View>
          ) : noResults ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: Colors.textLight }}>No suggestions found</Text>
            </View>
          ) : (
            <FlatList
              data={searchResults}
              keyExtractor={item => item.place_id || item.address || item.name}
              renderItem={({ item, index }) => renderSearchResult({ item, index })}
              contentContainerStyle={{ paddingBottom: 16 }}
              keyboardShouldPersistTaps="handled"
            />
          )
        ) : (
          <>
            {RECENT_LOCATIONS.length > 0 && (
              <View style={{ marginHorizontal: 16, marginBottom: 10 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>Recent Locations</Text>
                {RECENT_LOCATIONS.map((loc, idx) => {
                  // Avoid showing if already in saved locations
                  const isDuplicate = (savedLocations.home && loc.address === savedLocations.home.address) ||
                    (savedLocations.work && loc.address === savedLocations.work.address) ||
                    (savedLocations.custom && savedLocations.custom.some((c) => c.address === loc.address));
                  if (isDuplicate) return null;
                  const { icon, bg } = getLocationIcon(loc.name);
                  return (
                    <TouchableOpacity
                      key={loc.id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#fff',
                        paddingVertical: 12,
                        paddingHorizontal: 0,
                        borderBottomWidth: 1,
                        borderBottomColor: '#eee',
                      }}
                      onPress={() => handleLocationSelect(loc, true)}
                    >
                      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', marginRight: 14, marginLeft: 0 }}>{icon}</View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#222' }}>{loc.name}</Text>
                        <Text style={{ fontSize: 14, color: '#888' }}>{loc.address}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
            {(savedLocations.home || savedLocations.work || (savedLocations.custom && savedLocations.custom.length > 0)) && (
              <View style={{ marginHorizontal: 16, marginBottom: 10 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>Saved Locations</Text>
                {savedLocations.home && (
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#fff',
                      paddingVertical: 12,
                      paddingHorizontal: 0,
                      borderBottomWidth: 1,
                      borderBottomColor: '#eee',
                    }}
                    onPress={() => handleLocationSelect(savedLocations.home, true)}
                  >
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#E53935', alignItems: 'center', justifyContent: 'center', marginRight: 14, marginLeft: 0 }}>
                      <MaterialIcons name="home" size={24} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#222' }}>{savedLocations.home.name}</Text>
                      <Text style={{ fontSize: 14, color: '#888' }}>{savedLocations.home.address}</Text>
                    </View>
                  </TouchableOpacity>
                )}
                {savedLocations.work && (
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#fff',
                      paddingVertical: 12,
                      paddingHorizontal: 0,
                      borderBottomWidth: 1,
                      borderBottomColor: '#eee',
                    }}
                    onPress={() => handleLocationSelect(savedLocations.work, true)}
                  >
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F57C00', alignItems: 'center', justifyContent: 'center', marginRight: 14, marginLeft: 0 }}>
                      <MaterialIcons name="work" size={24} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#222' }}>{savedLocations.work.name}</Text>
                      <Text style={{ fontSize: 14, color: '#888' }}>{savedLocations.work.address}</Text>
                    </View>
                  </TouchableOpacity>
                )}
                {savedLocations.custom && savedLocations.custom.map((loc, idx) => {
                  const { icon, bg } = getLocationIcon(loc.name);
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#fff',
                        paddingVertical: 12,
                        paddingHorizontal: 0,
                        borderBottomWidth: 1,
                        borderBottomColor: '#eee',
                      }}
                      onPress={() => handleLocationSelect(loc, true)}
                    >
                      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', marginRight: 14, marginLeft: 0 }}>
                        {icon}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#222' }}>{loc.name}</Text>
                        <Text style={{ fontSize: 14, color: '#888' }}>{loc.address}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </>
        )}
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
                <Ionicons name={forWhom === 'me' ? 'radio-button-on' : 'radio-button-off'} size={22} color="#23235B" style={{ marginRight: 10 }} />
                <Text style={{ fontSize: 16 }}>For me</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}
                onPress={() => setForWhom('friend')}
              >
                <Ionicons name={forWhom === 'friend' ? 'radio-button-on' : 'radio-button-off'} size={22} color="#23235B" style={{ marginRight: 10 }} />
                <Text style={{ fontSize: 16 }}>For a friend</Text>
              </TouchableOpacity>
              {forWhom === 'friend' && (
                <View style={{ marginTop: 10 }}>
                  <TextInput
                    placeholder="Friend's Name"
                    value={friendName}
                    onChangeText={setFriendName}
                    style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 10 }}
                  />
                  <TextInput
                    placeholder="Friend's Phone"
                    value={friendPhone}
                    onChangeText={setFriendPhone}
                    keyboardType="phone-pad"
                    style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 10 }}
                  />
                </View>
              )}
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
                <TouchableOpacity onPress={() => setShowForWhomModal(false)} style={{ marginRight: 16 }}>
                  <Text style={{ color: '#23235B', fontWeight: 'bold' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    if (forWhom === 'friend' && (!friendName.trim() || !friendPhone.trim())) {
                      Alert.alert('Please enter your friend\'s name and phone number.');
                      return;
                    }
                    setShowForWhomModal(false);
                  }}
                >
                  <Text style={{ color: '#23235B', fontWeight: 'bold' }}>OK</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </RNModal>
      </ScrollView>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', paddingBottom: 16, paddingTop: 8, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#eee', zIndex: 100 }}>
        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, width: '92%', borderRadius: 18, justifyContent: 'center' }} onPress={handleSelectOnMap}>
          <Ionicons name="location-sharp" size={22} color="#23235B" style={{ marginRight: 16 }} />
          <Text style={{ color: '#23235B', fontSize: 16, fontWeight: '700' }}>Set location on map</Text>
        </TouchableOpacity>
      </View>
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