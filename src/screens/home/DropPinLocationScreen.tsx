import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator, Alert, ToastAndroid, Platform, TextInput, Button, Modal, Keyboard } from 'react-native';
import MapView, { Region, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');
const MAP_HEIGHT = height - 270; // 270px for bottom sheet height
const PIN_SIZE = 44;

const DEFAULT_REGION = {
  latitude: 28.6139,
  longitude: 77.2090,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

function parseAddress(address: string): { house: string; rest: string } {
  if (!address) return { house: '', rest: '' };
  const match = address.match(/^\s*(.+?)[,\s]+(.+)$/);
  if (match) {
    return { house: match[1], rest: match[2] };
  }
  return { house: address, rest: '' };
}

export default function DropPinLocationScreen({ navigation }: any) {
  const [region, setRegion] = useState(DEFAULT_REGION);
  const [address, setAddress] = useState('Fetching address...');
  const [locationName, setLocationName] = useState('Address');
  const [isFetching, setIsFetching] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapRef = useRef<MapView>(null);
  const [showAddAddressInput, setShowAddAddressInput] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [savedLocations, setSavedLocations] = useState<{ home?: any; work?: any; custom?: any[] }>({});
  const [showSavedModal, setShowSavedModal] = useState(false);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        // Permission denied, keep default region
        return;
      }
      let loc = await Location.getCurrentPositionAsync({});
      const newRegion = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 800);
      // Fetch address for the initial location
      reverseGeocode(loc.coords.latitude, loc.coords.longitude);
    })();
  }, []);

  // Reverse geocode using provided API key
  const reverseGeocode = async (lat: number, lng: number) => {
    setIsFetching(true);
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=AIzaSyDHN3SH_ODlqnHcU9Blvv2pLpnDNkg03lU`
      );
      const data = await response.json();
      if (data.status === 'OK' && data.results.length > 0) {
        const result = data.results[0];
        // Location name: use locality or first part of formatted_address
        let locName = '';
        const locality = result.address_components?.find((comp: any) =>
          comp.types.includes('locality') || comp.types.includes('sublocality')
        );
        if (locality) {
          locName = locality.long_name;
        } else {
          locName = result.formatted_address.split(',')[0];
        }
        setLocationName(locName);
        setAddress(result.formatted_address);
      } else {
        setLocationName('Address');
        setAddress('not found');
      }
    } catch (e) {
      setLocationName('Address');
      setAddress('not found');
    } finally {
      setIsFetching(false);
    }
  };

  const handleRegionChangeComplete = (newRegion: Region) => {
    setRegion(newRegion);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      reverseGeocode(newRegion.latitude, newRegion.longitude);
    }, 400);
  };

  // My Location button: get user's real current location
  const handleMyLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      alert('Permission to access location was denied');
      return;
    }
    let loc = await Location.getCurrentPositionAsync({});
    const newRegion = {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
    mapRef.current?.animateToRegion(newRegion, 800);
    setRegion(newRegion);
  };

  // When user taps Select Drop, pass locationName, address, and coordinates back to HomeScreen
  const handleSelectDrop = () => {
    navigation.navigate('RideOptions', {
      drop: {
        latitude: region.latitude,
        longitude: region.longitude,
        name: locationName,
        address,
      },
    });
  };

  // Save location handler
  const saveLocation = async (type: 'home' | 'work' | 'custom', customLabel?: string) => {
    const locationToSave = {
      latitude: region.latitude,
      longitude: region.longitude,
      address,
      name: type === 'custom' ? (customLabel || 'Custom') : (type === 'home' ? 'Home' : 'Work'),
      label: type === 'custom' ? (customLabel || 'Custom') : type,
    };
    try {
      // Get existing saved locations
      const existing = await AsyncStorage.getItem('@saved_locations');
      let saved = existing ? JSON.parse(existing) : {};
      if (type === 'home' || type === 'work') {
        saved[type] = locationToSave;
      } else if (type === 'custom' && customLabel) {
        if (!saved.custom) saved.custom = [];
        saved.custom.push(locationToSave);
      }
      await AsyncStorage.setItem('@saved_locations', JSON.stringify(saved));
      if (Platform.OS === 'android') {
        ToastAndroid.show('Location saved!', ToastAndroid.SHORT);
      } else {
        Alert.alert('Success', 'Location saved!');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to save location');
    }
  };

  // Handler for Add New
  const handleAddNew = () => {
    Alert.prompt(
      'Save Location',
      'Enter a label for this location:',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Save',
          onPress: (label) => {
            if (label && label.trim().length > 0) {
              saveLocation('custom', label.trim());
            } else {
              Alert.alert('Label required', 'Please enter a label for the location.');
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const { house, rest } = parseAddress(address);

 

  return (
    <View style={styles.screen}>
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFill}
          initialRegion={region}
          onRegionChangeComplete={handleRegionChangeComplete}
          showsUserLocation
          showsMyLocationButton={false}
        />
        {/* Floating Center Pin (emoji for Rapido style) */}
        <View pointerEvents="none" style={styles.pinContainer}>
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            {/* Outer red circle with white border */}
            <View style={{
              width: 26,
              height: 26,
              borderRadius: 18,
              backgroundColor: '#fff',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: '#fff',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.15,
              shadowRadius: 2,
              elevation: 2,
            }}>
              {/* Inner red circle */}
              <View style={{
                width: 24,
                height: 24,
                borderRadius: 14,
                backgroundColor: '#E53935',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {/* White center */}
                <View style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: '#fff',
                }} />
              </View>
            </View>
            {/* Black stick */}
            <View style={{
              width: 3,
              height: 16,
              backgroundColor: '#222',
              marginTop: -2,
              borderRadius: 2,
            }} />
          </View>
        </View>
        {/* My Location Button */}
        <TouchableOpacity style={styles.myLocationBtn} onPress={handleMyLocation}>
          <Ionicons name="locate" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>
      {/* Bottom Sheet */}
      <View style={styles.bottomSheet}>
        <View style={styles.addressCard}>
          <View style={styles.addressRow}>
            <Text style={styles.addressLabel}>Select your location</Text>
            <TouchableOpacity>
              <Text style={styles.changeText}>Change</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.selectedAddressBox}>
            <View style={styles.iconCircle}>
              <Ionicons name="location-sharp" size={20} color="#fff" />
            </View>
            <View>
              <Text style={styles.selectedAddressTitle}>
                {isFetching ? <ActivityIndicator size="small" color={Colors.primary} /> : locationName}
              </Text>
              <Text style={styles.selectedAddressSubtitle} numberOfLines={1}>
                {isFetching ? 'Fetching address...' : address || 'not found'}
              </Text>
            </View>
          </View>
          <View style={styles.divider} />
          <Text style={styles.saveLabel}>Save location as</Text>
          <View style={styles.saveRow}>
            <TouchableOpacity style={styles.saveBtn} onPress={() => saveLocation('home')}><Text style={styles.saveBtnIcon}>🏠</Text><Text style={styles.saveBtnText}> Home</Text></TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={() => saveLocation('work')}><Text style={styles.saveBtnIcon}>💼</Text><Text style={styles.saveBtnText}> Work</Text></TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleAddNew}><Text style={styles.saveBtnIcon}>➕</Text><Text style={styles.saveBtnText}> Add New</Text></TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity style={styles.selectDropButton} onPress={handleSelectDrop} activeOpacity={0.8}>
          <Text style={styles.selectDropButtonText}>Select Drop</Text>
        </TouchableOpacity>
      </View>
      {showAddAddressInput && (
        <View style={{ marginVertical: 10 }}>
          <TextInput
            value={newAddress}
            onChangeText={setNewAddress}
            placeholder="Enter new address"
            style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 10 }}
          />
          <Button
            title="Save"
            onPress={async () => {
              if (newAddress.trim()) {
                // Load existing saved locations
                let existing = await AsyncStorage.getItem('@saved_locations');
                let saved = existing ? JSON.parse(existing) : {};
                if (!saved.custom) saved.custom = [];
                // Add the new custom location with current region and address
                saved.custom.push({
                  latitude: region.latitude,
                  longitude: region.longitude,
                  address,
                  name: newAddress.trim(),
                  label: newAddress.trim(),
                });
                await AsyncStorage.setItem('@saved_locations', JSON.stringify(saved));
                setNewAddress('');
                setShowAddAddressInput(false);
                if (Platform.OS === 'android') {
                  ToastAndroid.show('Location saved!', ToastAndroid.SHORT);
                } else {
                  Alert.alert('Success', 'Location saved!');
                }
              }
            }}
          />
          <Button title="Cancel" onPress={() => setShowAddAddressInput(false)} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    position: 'relative',
  },
  mapContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: MAP_HEIGHT,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    overflow: 'hidden',
    backgroundColor: '#eee',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  pinContainer: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginLeft: -PIN_SIZE / 2,
    marginTop: -PIN_SIZE,
    zIndex: 10,
    elevation: 10,
  },
  myLocationBtn: {
    position: 'absolute',
    right: 18,
    bottom: 40,
    backgroundColor: '#fff',
    borderRadius: 22,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingBottom: 0,
    zIndex: 100,
  },
  addressCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingVertical: 16,
    paddingHorizontal: 18,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gray100,
    alignItems: 'stretch',
    alignSelf: 'center',
  },
  addressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  addressLabel: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '700',
  },
  changeText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  selectedAddressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderRadius: 14,
    padding: 30,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  selectedAddressTitle: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '700',
    marginBottom: 0,
  },
  selectedAddressSubtitle: {
    fontSize: 11,
    color: Colors.gray400,
    fontWeight: '400',
    width: width - 120,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.gray200,
    marginVertical: 8,
    borderRadius: 1,
  },
  saveLabel: {
    fontSize: 11,
    color: Colors.gray400,
    marginBottom: 4,
    fontWeight: '500',
  },
  saveRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 0,
    marginBottom: 4,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderRadius: 14,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginRight: 6,
    elevation: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  saveBtnIcon: {
    fontSize: 14,
  },
  saveBtnText: {
    fontSize: 11,
    color: Colors.text,
    fontWeight: '500',
  },
  selectDropButton: {
    width: '90%',
    backgroundColor: '#FFD600',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    alignSelf: 'center',
    elevation: 0,
    marginBottom: 18,
  },
  selectDropButtonText: {
    color: '#222',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.1,
  },
});
