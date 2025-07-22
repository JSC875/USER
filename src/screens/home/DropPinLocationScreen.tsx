import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator, Alert, ToastAndroid, Platform, TextInput, Button, Modal, Keyboard } from 'react-native';
import MapView, { Region, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
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
  const [isSaving, setIsSaving] = useState(false);

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

  // When user taps Select Drop, pass locationName, address, and coordinates back to DropLocationSelectorScreen
  const handleSelectDrop = () => {
    if (!region.latitude || !region.longitude || !address || address === 'Fetching address...' || address === 'not found') {
      Alert.alert('Error', 'Please select a valid location.');
      return;
    }
    navigation.replace('DropLocationSelector', {
      destination: {
        latitude: region.latitude,
        longitude: region.longitude,
        name: locationName,
        address,
      },
    });
  };

  // Save location handler
  const saveLocation = async (type: 'home' | 'work' | 'custom', customLabel?: string) => {
    if (isSaving) return;
    setIsSaving(true);
    const locationToSave = {
      latitude: region.latitude,
      longitude: region.longitude,
      address,
      name: type === 'custom' ? (customLabel || 'Custom') : (type === 'home' ? 'Home' : 'Work'),
      label: type === 'custom' ? (customLabel || 'Custom') : type,
    };
    try {
      if (!address || address === 'Fetching address...' || address === 'not found') {
        Alert.alert('Error', 'Cannot save an invalid address.');
        setIsSaving(false);
        return;
      }
      if (type === 'custom' && (!customLabel || !customLabel.trim())) {
        Alert.alert('Label required', 'Please enter a label for the location.');
        setIsSaving(false);
        return;
      }
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
    } finally {
      setIsSaving(false);
    }
  };

  // Handler for Add New
  const handleAddNew = async () => {
    // Get existing saved locations
    const existing = await AsyncStorage.getItem('@saved_locations');
    let saved = existing ? JSON.parse(existing) : {};
    let customCount = saved.custom ? saved.custom.length + 1 : 1;
    const defaultLabel = `Saved Location ${customCount}`;
    await saveLocation('custom', defaultLabel);
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
        {/* Floating Center Pin */}
        <View pointerEvents="none" style={styles.pinContainer}>
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            {/* Outer white circle with border */}
            <View style={{
              width: 26,
              height: 26,
              borderRadius: 18,
              backgroundColor: Colors.white,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: Colors.white,
              shadowColor: Colors.shadow,
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.15,
              shadowRadius: 2,
              elevation: 2,
            }}>
              {/* Inner primary color circle */}
              <View style={{
                width: 24,
                height: 24,
                borderRadius: 14,
                backgroundColor: Colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {/* White center */}
                <View style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: Colors.white,
                }} />
              </View>
            </View>
            {/* Black stick */}
            <View style={{
              width: 3,
              height: 16,
              backgroundColor: Colors.black,
              marginTop: -2,
              borderRadius: 2,
            }} />
          </View>
        </View>
        {/* My Location Button */}
        <TouchableOpacity style={styles.myLocationBtn} onPress={handleMyLocation}>
          <Ionicons name="locate" size={Layout.iconSize.lg} color={Colors.primary} />
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
              <Ionicons name="location-sharp" size={Layout.iconSize.md} color={Colors.white} />
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
            <TouchableOpacity style={styles.saveBtn} onPress={() => saveLocation('home')} disabled={isSaving}>
              <Text style={styles.saveBtnIcon}>🏠</Text>
              <Text style={styles.saveBtnText}> Home</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={() => saveLocation('work')} disabled={isSaving}>
              <Text style={styles.saveBtnIcon}>💼</Text>
              <Text style={styles.saveBtnText}> Work</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleAddNew} disabled={isSaving}>
              <Text style={styles.saveBtnIcon}>➕</Text>
              <Text style={styles.saveBtnText}> Add New</Text>
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity 
          style={[styles.selectDropButton, isSaving && styles.selectDropButtonDisabled]} 
          onPress={handleSelectDrop} 
          activeOpacity={0.8}
          disabled={isSaving}
        >
          <Text style={styles.selectDropButtonText}>Select Drop</Text>
        </TouchableOpacity>
      </View>
      {showAddAddressInput && (
        <View style={{ marginVertical: Layout.spacing.md }}>
          <TextInput
            value={newAddress}
            onChangeText={setNewAddress}
            placeholder="Enter new address"
            style={styles.addressInput}
            editable={!isSaving}
          />
          <Button
            title={isSaving ? 'Saving...' : 'Save'}
            onPress={async () => {
              if (!newAddress.trim()) {
                Alert.alert('Label required', 'Please enter a label for the location.');
                return;
              }
              await saveLocation('custom', newAddress.trim());
              setNewAddress('');
              setShowAddAddressInput(false);
            }}
            disabled={isSaving || !newAddress.trim()}
          />
          <Button title="Cancel" onPress={() => setShowAddAddressInput(false)} disabled={isSaving} />
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
    backgroundColor: Colors.gray100,
    elevation: 4,
    shadowColor: Colors.shadow,
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
    right: Layout.spacing.md,
    bottom: Layout.spacing.xl,
    backgroundColor: Colors.white,
    borderRadius: 22,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.shadow,
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
    backgroundColor: Colors.white,
    borderTopLeftRadius: Layout.borderRadius.lg,
    borderTopRightRadius: Layout.borderRadius.lg,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingVertical: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.md,
    elevation: 10,
    shadowColor: Colors.shadow,
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
    marginBottom: Layout.spacing.sm,
  },
  addressLabel: {
    fontSize: Layout.fontSize.md,
    color: Colors.text,
    fontWeight: '700',
  },
  changeText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: Layout.fontSize.sm,
  },
  selectedAddressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderRadius: Layout.borderRadius.md,
    padding: Layout.spacing.xl,
    marginBottom: Layout.spacing.sm,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Layout.spacing.md,
  },
  selectedAddressTitle: {
    fontSize: Layout.fontSize.sm,
    color: Colors.text,
    fontWeight: '700',
    marginBottom: 0,
  },
  selectedAddressSubtitle: {
    fontSize: Layout.fontSize.xs,
    color: Colors.gray400,
    fontWeight: '400',
    width: width - 120,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.gray200,
    marginVertical: Layout.spacing.sm,
    borderRadius: 1,
  },
  saveLabel: {
    fontSize: Layout.fontSize.xs,
    color: Colors.gray400,
    marginBottom: Layout.spacing.xs,
    fontWeight: '500',
  },
  saveRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 0,
    marginBottom: Layout.spacing.xs,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderRadius: Layout.borderRadius.md,
    paddingVertical: Layout.spacing.xs,
    paddingHorizontal: Layout.spacing.md,
    marginRight: Layout.spacing.sm,
    elevation: 0,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  saveBtnIcon: {
    fontSize: Layout.fontSize.sm,
  },
  saveBtnText: {
    fontSize: Layout.fontSize.xs,
    color: Colors.text,
    fontWeight: '500',
  },
  selectDropButton: {
    width: '90%',
    backgroundColor: Colors.primary,
    borderRadius: Layout.borderRadius.md,
    paddingVertical: Layout.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Layout.spacing.md,
    alignSelf: 'center',
    elevation: 0,
    marginBottom: Layout.spacing.md,
  },
  selectDropButtonDisabled: {
    backgroundColor: Colors.gray300,
  },
  selectDropButtonText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: Layout.fontSize.md,
    letterSpacing: 0.1,
  },
  addressInput: {
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: Layout.borderRadius.md,
    padding: Layout.spacing.md,
    marginBottom: Layout.spacing.md,
    backgroundColor: Colors.white,
    fontSize: Layout.fontSize.md,
    color: Colors.text,
  },
});
