import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Dimensions, TextInput, ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, Animated, Modal, Button, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import MapView, { Marker } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';

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
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [cityQuery, setCityQuery] = useState('');
  const [searchCity, setSearchCity] = useState(''); // The city to use for search
  const autoProceedHandled = useRef(false);

  useEffect(() => {
    if (route.params?.destination) {
      setDropLocation(route.params.destination);
      if (editing === 'drop') setSearchQuery(route.params.destination.address || route.params.destination.name || '');
      if (route.params?.autoProceed && !autoProceedHandled.current) {
        autoProceedHandled.current = true;
        setTimeout(() => {
          navigation.navigate('RideOptions', {
            pickup: currentLocation,
            drop: route.params.destination,
          });
        }, 300);
      }
    }
  }, [route.params?.destination]);

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
      if (searchCity) {
        // Use Google Geocoding API to get lat/lng for the city
        const geoRes = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(searchCity)}&key=${GOOGLE_MAPS_API_KEY}`
        );
        const geoData = await geoRes.json();
        if (geoData.status === 'OK' && geoData.results.length > 0) {
          const loc = geoData.results[0].geometry.location;
          location = `${loc.lat},${loc.lng}`;
        }
      }
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

  const handleLocationSelect = async (item: any) => {
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
    if (editing === 'drop') {
      setDropLocation(location);
      setEditing(null);
      setSearchQuery(location.address || location.name || '');
      setSearchResults([]);
      setNoResults(false);
      Keyboard.dismiss();
      if (currentLocation && location) {
        navigation.navigate('RideOptions', {
          pickup: currentLocation,
          drop: location,
        });
      } else {
        Alert.alert('Error', 'Current location or drop location is missing.');
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
    if (dropLocation && currentLocation) {
      navigation.navigate('RideOptions', {
        pickup: currentLocation,
        drop: dropLocation,
      });
    } else {
      Alert.alert('Error', 'Current location or drop location is missing.');
    }
  };

  const renderSearchResult = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.locationItemModern} onPress={() => handleLocationSelect(item)}>
      <Ionicons name="location-outline" size={22} color={Colors.primary} style={{ marginRight: 14 }} />
      <View style={{ flex: 1 }}>
        <Text style={styles.locationNameModern}>{item.structured_formatting?.main_text || item.name || item.description}</Text>
        <Text style={styles.locationAddressModern} numberOfLines={1}>{item.structured_formatting?.secondary_text || item.address}</Text>
      </View>
    </TouchableOpacity>
  );

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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
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
        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F7', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 8 }}>
          <MaterialCommunityIcons name="account-outline" size={18} color="#222" style={{ marginRight: 6 }} />
          <Text style={{ fontWeight: '600', color: '#222' }}>For me</Text>
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
                        navigation.navigate('RideOptions', {
                          pickup: currentLocation,
                          drop: dropLocation,
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
      {/* Search Results or Recent Locations List */}
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
            renderItem={renderSearchResult}
            contentContainerStyle={{ paddingBottom: 16 }}
            keyboardShouldPersistTaps="handled"
          />
        )
      ) : (
        <FlatList
          data={getListData()}
          keyExtractor={item => item.id}
          renderItem={({ item }) => {
            const { icon, bg } = getLocationIcon(item.name);
            return (
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
                onPress={() => handleLocationSelect(item)}
              >
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', marginRight: 14, marginLeft: 16 }}>{icon}</View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#222' }}>{item.name}</Text>
                  <Text style={{ fontSize: 14, color: '#888' }}>{item.address}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={{ paddingTop: 0, paddingBottom: 80 }}
          showsVerticalScrollIndicator={false}
        />
      )}
      {/* Bottom Options */}
      <View style={{ marginTop: 12 }}>
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16 }}
          onPress={() => setCityModalVisible(true)}
        >
          <MaterialCommunityIcons name="earth" size={22} color="#222" style={{ marginRight: 16 }} />
          <Text style={{ color: '#222', fontSize: 16 }}>Search in a different city</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16 }} onPress={handleSelectOnMap}>
          <Ionicons name="location-sharp" size={22} color="#222" style={{ marginRight: 16 }} />
          <Text style={{ color: '#222', fontSize: 16 }}>Set location on map</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16 }}
          onPress={() => setShowSavedModal(true)}
        >
          <MaterialCommunityIcons name="star-outline" size={22} color="#222" style={{ marginRight: 16 }} />
          <Text style={{ color: '#222', fontSize: 16 }}>Saved locations</Text>
        </TouchableOpacity>
      </View>
      <Modal
        visible={cityModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCityModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' }}>
          <View style={{ margin: 20, backgroundColor: 'white', borderRadius: 10, padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>Enter City Name</Text>
            <TextInput
              value={cityQuery}
              onChangeText={setCityQuery}
              placeholder="e.g. Mumbai"
              style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 20 }}
            />
            <Button
              title="Set City"
              onPress={() => {
                setSearchCity(cityQuery);
                setCityModalVisible(false);
              }}
            />
            <Button title="Cancel" onPress={() => setCityModalVisible(false)} />
          </View>
        </View>
      </Modal>
      <Modal
        visible={showSavedModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSavedModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' }}>
          <View style={{ margin: 20, backgroundColor: 'white', borderRadius: 10, padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>Saved Locations</Text>
            {(!savedLocations.home && !savedLocations.work && (!savedLocations.custom || savedLocations.custom.length === 0)) ? (
              <Text style={{ fontSize: 16, color: '#888', marginBottom: 20 }}>No saved locations.</Text>
            ) : (
              <>
                {savedLocations.home && (
                  <TouchableOpacity
                    style={{ paddingVertical: 10 }}
                    onPress={() => {
                      setDropLocation(savedLocations.home);
                      setSearchQuery(savedLocations.home.address || savedLocations.home.name);
                      setShowSavedModal(false);
                      setEditing(null);
                      setSearchResults([]);
                      setNoResults(false);
                      Keyboard.dismiss();
                      navigation.navigate('RideOptions', {
                        pickup: currentLocation,
                        drop: savedLocations.home,
                      });
                    }}
                  >
                    <Text style={{ fontSize: 16 }}>🏠 {savedLocations.home.name} - {savedLocations.home.address}</Text>
                  </TouchableOpacity>
                )}
                {savedLocations.work && (
                  <TouchableOpacity
                    style={{ paddingVertical: 10 }}
                    onPress={() => {
                      setDropLocation(savedLocations.work);
                      setSearchQuery(savedLocations.work.address || savedLocations.work.name);
                      setShowSavedModal(false);
                      setEditing(null);
                      setSearchResults([]);
                      setNoResults(false);
                      Keyboard.dismiss();
                      navigation.navigate('RideOptions', {
                        pickup: currentLocation,
                        drop: savedLocations.work,
                      });
                    }}
                  >
                    <Text style={{ fontSize: 16 }}>💼 {savedLocations.work.name} - {savedLocations.work.address}</Text>
                  </TouchableOpacity>
                )}
                {savedLocations.custom && savedLocations.custom.map((loc, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={{ paddingVertical: 10 }}
                    onPress={() => {
                      setDropLocation(loc);
                      setSearchQuery(loc.address || loc.name);
                      setShowSavedModal(false);
                      setEditing(null);
                      setSearchResults([]);
                      setNoResults(false);
                      Keyboard.dismiss();
                      navigation.navigate('RideOptions', {
                        pickup: currentLocation,
                        drop: loc,
                      });
                    }}
                  >
                    <Text style={{ fontSize: 16 }}>⭐ {loc.name} - {loc.address}</Text>
                  </TouchableOpacity>
                ))}
              </>
            )}
            <Button title="Close" onPress={() => setShowSavedModal(false)} />
          </View>
        </View>
      </Modal>
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