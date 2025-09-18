import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import { useLocationStore } from '../../store/useLocationStore';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import LocationPickerMap from '../../components/common/LocationPickerMap';
import ConnectionStatus from '../../components/common/ConnectionStatus';
import { HYDERABAD_POPULAR_PLACES, getCategoryIcon, getCategoryColor, getSubcategoryIcon } from '../../constants/HyderabadPopularPlaces';
import CategorizedLocationList from '../../components/common/CategorizedLocationList';
import { logger } from '../../utils/logger';

const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

// Get popular places for display when no search query
// const POPULAR_PLACES = HYDERABAD_POPULAR_PLACES.filter(place => place.isPopular);

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
  const [expandedCategories, setExpandedCategories] = useState<{ [key: string]: boolean }>({});
  const [isPopularPlacesExpanded, setIsPopularPlacesExpanded] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { recentLocations } = useLocationStore();

  // Local Hyderabad places search function
  const searchLocalHyderabadPlaces = (query: string) => {
    const lowercaseQuery = query.toLowerCase();
    
    // Search in our local Hyderabad places data
    const matches = HYDERABAD_POPULAR_PLACES.filter(place =>
      place.name.toLowerCase().includes(lowercaseQuery) ||
      place.address.toLowerCase().includes(lowercaseQuery) ||
      place.subcategory?.toLowerCase().includes(lowercaseQuery) ||
      place.description?.toLowerCase().includes(lowercaseQuery)
    );
    
    // Convert to the format expected by the UI
    return matches.slice(0, 10).map((place) => ({
      place_id: `local_hyderabad_${place.id}`,
      description: place.address,
      structured_formatting: {
        main_text: place.name,
        secondary_text: place.subcategory || place.address.split(',')[1]?.trim() || ''
      },
      latitude: place.latitude,
      longitude: place.longitude,
      address: place.address,
      category: place.category,
      subcategory: place.subcategory,
      isLocalHyderabadPlace: true
    }));
  };

  // Organize search results by categories
  const organizeResultsByCategory = (results: any[]) => {
    const categories: { [key: string]: any[] } = {};
    
    results.forEach(result => {
      let categoryKey = 'Other';
      
      if (result.isLocalHyderabadPlace) {
        // For local places, use subcategory if available, otherwise category
        categoryKey = result.subcategory || result.category || 'Other';
      } else {
        // For Google results, try to determine category from description
        const description = result.description.toLowerCase();
        if (description.includes('metro') || description.includes('station')) {
          categoryKey = 'Metro & Transport';
        } else if (description.includes('mall') || description.includes('shopping')) {
          categoryKey = 'Shopping';
        } else if (description.includes('hospital') || description.includes('medical')) {
          categoryKey = 'Healthcare';
        } else if (description.includes('hotel') || description.includes('restaurant')) {
          categoryKey = 'Food & Stay';
        } else if (description.includes('school') || description.includes('college') || description.includes('university')) {
          categoryKey = 'Education';
        } else if (description.includes('hostel') || description.includes('pg')) {
          categoryKey = 'Accommodation';
        } else {
          categoryKey = 'Other';
        }
      }
      
      if (!categories[categoryKey]) {
        categories[categoryKey] = [];
      }
      categories[categoryKey]!.push(result);
    });
    
    // Auto-expand categories with few items (5 or less) for better UX
    const newExpandedCategories = { ...expandedCategories };
    Object.keys(categories).forEach(categoryKey => {
      if (categories[categoryKey]!.length <= 5 && !(categoryKey in newExpandedCategories)) {
        newExpandedCategories[categoryKey] = true;
      }
    });
    setExpandedCategories(newExpandedCategories);
    
    return categories;
  };

  // Toggle category expansion
  const toggleCategory = (categoryKey: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryKey]: !prev[categoryKey]
    }));
  };

  // Get category icon and color
  const getCategoryDisplayInfo = (categoryKey: string) => {
    const categoryInfo: { [key: string]: { icon: string; color: string; count: number } } = {
      'Metro & Transport': { icon: '🚇', color: '#3B82F6', count: 0 },
      'Boys Hostel': { icon: '🏠', color: '#10B981', count: 0 },
      'Girls Hostel': { icon: '🏠', color: '#EC4899', count: 0 },
      'Boys PG': { icon: '🏠', color: '#8B5CF6', count: 0 },
      'Girls PG': { icon: '🏠', color: '#F59E0B', count: 0 },
      'Accommodation': { icon: '🏠', color: '#EF4444', count: 0 },
      'Shopping': { icon: '🛍️', color: '#EC4899', count: 0 },
      'Healthcare': { icon: '🏥', color: '#EF4444', count: 0 },
      'Education': { icon: '🎓', color: '#8B5CF6', count: 0 },
      'Food & Stay': { icon: '🍽️', color: '#F59E0B', count: 0 },
      'Metro Pillar': { icon: '📍', color: '#6B7280', count: 0 },
      'IT Hub': { icon: '💻', color: '#3B82F6', count: 0 },
      'Landmark': { icon: '🏛️', color: '#8B5CF6', count: 0 },
      'Other': { icon: '📍', color: '#6B7280', count: 0 }
    };
    
    return categoryInfo[categoryKey] || categoryInfo['Other'];
  };

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
      // Use Hyderabad coordinates and strict filtering
      const location = '17.3850,78.4867'; // Hyderabad coordinates
      const radius = 30000; // 30km radius around Hyderabad
      
      logger.debug('🔍 Searching Google Places API for Hyderabad places:', query);
      logger.debug('🔑 Using API key:', GOOGLE_MAPS_API_KEY ? 'Present' : 'Missing');
      
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      // Enhanced Google Places API call with strict Hyderabad-specific filters
      // Add hostel/PG specific terms to improve search results
      const enhancedQuery = `${query} Hyderabad`;
      
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(enhancedQuery)}&location=${location}&radius=${radius}&components=country:in|administrative_area:Telangana|locality:Hyderabad&types=establishment|geocode|lodging&key=${GOOGLE_MAPS_API_KEY}`,
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
      logger.debug('📡 Places API response:', data.status, data.error_message || 'No error');
      
      if (data.status === 'OK' && data.predictions && data.predictions.length > 0) {
        logger.debug('✅ Found', data.predictions.length, 'places from Google API');
        logger.debug('🔍 Raw Google results:', data.predictions.map((p: any) => p.description));
        
        // Strict filtering for Hyderabad locations only - reject any non-Hyderabad results
        const hyderabadOnly = data.predictions.filter((prediction: any) => {
          const description = prediction.description.toLowerCase();
          
          // First, check for non-Hyderabad cities and reject them
          const nonHyderabadCities = [
            'delhi', 'mumbai', 'bangalore', 'chennai', 'kolkata', 'pune',
            'ahmedabad', 'jaipur', 'surat', 'lucknow', 'kanpur', 'nagpur',
            'indore', 'thane', 'bhopal', 'visakhapatnam', 'pimpri', 'patna',
            'vadodara', 'ghaziabad', 'ludhiana', 'agra', 'nashik', 'faridabad',
            'meerut', 'rajkot', 'kalyan', 'vasai', 'varanasi', 'srinagar',
            'aurangabad', 'noida', 'solapur', 'ranchi', 'howrah', 'coimbatore',
            'raipur', 'jabalpur', 'gwalior', 'vijayawada', 'jodhpur', 'madurai',
            'guwahati', 'chandigarh', 'hubli', 'tiruchirappalli', 'mysore',
            'kozhikode', 'bhubaneswar', 'kochi', 'bhavnagar', 'salem', 'warangal',
            'guntur', 'bhiwandi', 'amravati', 'nanded', 'kolhapur', 'sangli',
            'malegaon', 'ulhasnagar', 'jalgaon', 'latur', 'ahmednagar', 'chandrapur',
            'parbhani', 'ichalkaranji', 'jalna', 'ambarnath', 'bhusawal', 'panvel',
            'satara', 'beed', 'yavatmal', 'kamptee', 'gondia', 'achalpur',
            'pandharpur', 'shahada', 'miraj', 'bhiwani', 'hisar', 'rohtak',
            'panipat', 'karnal', 'sonipat', 'ambala', 'bhiwani', 'hisar',
            'rohtak', 'panipat', 'karnal', 'sonipat', 'ambala', 'gurgaon',
            'faridabad', 'noida', 'ghaziabad', 'meerut', 'aligarh', 'agra',
            'kanpur', 'lucknow', 'varanasi', 'allahabad', 'bareilly', 'moradabad',
            'saharanpur', 'gorakhpur', 'firozabad', 'jhansi', 'muzaffarnagar',
            'mathura', 'shahjahanpur', 'rampur', 'mau', 'hapur', 'etawah',
            'mirzapur', 'bulandshahr', 'sambhal', 'amroha', 'hardoi', 'fatehpur',
            'raebareli', 'sitapur', 'bahraich', 'modinagar', 'unnao', 'jaunpur',
            'lakhimpur', 'hathras', 'bijnor', 'shamli', 'azamgarh', 'kasganj',
            'siddharthnagar', 'budaun', 'etah', 'kaushambi', 'ballia', 'deoria',
            'kushinagar', 'sant kabir nagar', 'mahrajganj', 'siddharthnagar',
            'bhadohi', 'chandauli', 'ghazipur', 'mau', 'ballia', 'deoria',
            'kushinagar', 'sant kabir nagar', 'mahrajganj', 'siddharthnagar',
            'bhadohi', 'chandauli', 'ghazipur', 'mau', 'ballia', 'deoria'
          ];
          
          // Reject if it contains non-Hyderabad cities
          if (nonHyderabadCities.some(city => description.includes(city))) {
            return false;
          }
          
          // Now check for Hyderabad-specific areas
          const hyderabadAreas = [
            'hyderabad', 'telangana', 'secunderabad', 'cyberabad',
            'gachibowli', 'hitec city', 'madhapur', 'kukatpally',
            'dilsukhnagar', 'banjara hills', 'jubilee hills', 'ameerpet',
            'lb nagar', 'uppal', 'malakpet', 'charminar', 'golconda',
            'ramoji film city', 'kondapur', 'begumpet', 'khairatabad',
            'lakdikapul', 'nampally', 'abids', 'afzalgunj', 'imlibun',
            'malkajgiri', 'alwal', 'bowenpally', 'tarnaka', 'sainikpuri',
            'kompally', 'raidurg', 'financial district', 'miyapur',
            'balanagar', 'moosapet', 'bharat nagar', 'erragadda',
            'esi hospital', 'sr nagar', 'punjagutta', 'irrum manzil',
            'assembly', 'gandhi bhavan', 'osmania medical college',
            'mgbs', 'new market', 'musarambagh', 'chaitanyapuri',
            'victoria memorial', 'durgam cheruvu', 'hussain sagar',
            'birla mandir', 'salar jung museum', 'iit hyderabad',
            'university of hyderabad', 'jntu', 'osmania university',
            'apollo hospitals', 'kims hospitals', 'yashoda hospitals',
            'continental hospitals', 'inorbit mall', 'forum sujana mall',
            'city center mall', 'south india mall', 'rajiv gandhi airport',
            'begumpet airport', 'secunderabad railway station',
            'hyderabad railway station', 'kacheguda railway station',
            'pillar 1', 'pillar 2', 'pillar 3', 'pillar 4', 'pillar 5',
            'pillar 6', 'pillar 7', 'pillar 8', 'pillar 9', 'pillar 10',
            'pillar 11', 'pillar 12', 'pillar 13', 'pillar 14', 'pillar 15',
            'pillar 16', 'pillar 17', 'pillar 18', 'pillar 19', 'pillar 20',
            'pillar 21', 'pillar 22', 'pillar 23', 'pillar 24', 'pillar 25',
            'pillar 26', 'pillar 27', 'pillar 28', 'pillar 29', 'pillar 30',
            'outer ring road', 'orr', 'metro pillar',
            'miyapur metro', 'jntu college metro', 'kukatpally metro',
            'balanagar metro', 'moosapet metro', 'bharat nagar metro',
            'erragadda metro', 'esi hospital metro', 'sr nagar metro',
            'ameerpet metro', 'punjagutta metro', 'irrum manzil metro',
            'khairatabad metro', 'lakdikapul metro', 'assembly metro',
            'nampally metro', 'gandhi bhavan metro', 'osmania medical college metro',
            'mgbs metro', 'malakpet metro', 'new market metro',
            'musarambagh metro', 'dilsukhnagar metro', 'chaitanyapuri metro',
            'victoria memorial metro', 'lb nagar metro', 'durgam cheruvu metro',
            'hitec city metro', 'raidurg metro',
            'boys hostel', 'girls hostel', 'boys pg', 'girls pg', 'hostel',
            'pg', 'paying guest', 'accommodation', 'lodging'
          ];
          
          // Only include if it contains Hyderabad-specific areas
          const hasHyderabadArea = hyderabadAreas.some(area => description.includes(area));
          
          // Additional strict check: must contain "hyderabad" or "telangana" or "secunderabad"
          const hasRequiredLocation = description.includes('hyderabad') || 
                                    description.includes('telangana') || 
                                    description.includes('secunderabad');
          
          return hasHyderabadArea && hasRequiredLocation;
        });
        
        if (hyderabadOnly.length > 0) {
          logger.debug('✅ Filtered to', hyderabadOnly.length, 'Hyderabad places');
          logger.debug('🏙️ Hyderabad results:', hyderabadOnly.map((p: any) => p.description));
          setSearchResults(hyderabadOnly);
          setNoResults(false);
        } else {
          logger.debug('📭 No Hyderabad places found in Google results, trying local data');
          logger.debug('❌ Rejected results:', data.predictions.map((p: any) => p.description));
          // Fallback to local Hyderabad data
          const localResults = searchLocalHyderabadPlaces(query);
          if (localResults.length > 0) {
            logger.debug('✅ Found', localResults.length, 'places in local Hyderabad data');
            setSearchResults(localResults);
            setNoResults(false);
          } else {
            logger.debug('📭 No Hyderabad places found');
            setSearchResults([]);
            setNoResults(true);
          }
        }
      } else if (data.status === 'REQUEST_DENIED') {
        console.error('❌ Places API access denied:', data.error_message);
        setSearchResults([]);
        setNoResults(true);
      } else if (data.status === 'ZERO_RESULTS') {
        logger.debug('📭 No results found');
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
        logger.debug('⏰ Request timeout');
      }
      setSearchResults([]);
      setNoResults(true);
    } finally {
      setIsSearching(false);
    }
  };


  const getPlaceDetails = async (placeId: string): Promise<PlaceDetails | null> => {
    try {
      logger.debug('🔍 Getting place details for:', placeId);
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,formatted_address&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      logger.debug('📡 Place details response:', data.status, data.error_message || 'No error');
      
      if (data.status === 'OK' && data.result) {
        logger.debug('✅ Place details retrieved successfully');
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
    
    // Handle local Hyderabad places (they already have coordinates)
    if (item.place_id && item.place_id.startsWith('local_hyderabad_')) {
      location = {
        latitude: item.latitude,
        longitude: item.longitude,
        address: item.address,
        name: item.structured_formatting?.main_text || item.name,
      };
    } else if (item.place_id) {
      // Handle Google Places results
      const placeDetails = await getPlaceDetails(item.place_id);
      if (!placeDetails) return;
      location = {
        latitude: placeDetails.geometry.location.lat,
        longitude: placeDetails.geometry.location.lng,
        address: placeDetails.formatted_address,
        name: item.structured_formatting?.main_text || placeDetails.formatted_address.split(',')[0],
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


  // Render category header
  const renderCategoryHeader = (categoryKey: string, items: any[]) => {
    const isExpanded = expandedCategories[categoryKey];
    const categoryInfo = getCategoryDisplayInfo(categoryKey);
    
    return (
      <TouchableOpacity 
        style={styles.categoryHeader} 
        onPress={() => toggleCategory(categoryKey)}
        activeOpacity={0.7}
      >
        <View style={styles.categoryHeaderContent}>
          <View style={[styles.categoryIconContainer, { backgroundColor: (categoryInfo?.color || '#6B7280') + '20' }]}>
            <Text style={styles.categoryIcon}>{categoryInfo?.icon || '📍'}</Text>
          </View>
          <View style={styles.categoryTextContainer}>
            <Text style={styles.categoryTitle}>{categoryKey}</Text>
            <Text style={styles.categoryCount}>{items.length} places</Text>
          </View>
          <Ionicons 
            name={isExpanded ? "chevron-up" : "chevron-down"} 
            size={20} 
            color={Colors.text} 
          />
        </View>
      </TouchableOpacity>
    );
  };

  // Render individual search result
  const renderSearchResult = ({ item }: { item: PlaceResult | any }) => (
    <TouchableOpacity style={styles.resultItem} onPress={() => handleLocationSelect(item)}>
      {item.place_id && item.place_id.startsWith('local_hyderabad_') ? (
        <View style={{ 
          width: 36, 
          height: 36, 
          borderRadius: 18, 
          backgroundColor: getCategoryColor(item.category) + '20',
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 12
        }}>
          <Text style={{ fontSize: 16 }}>{getSubcategoryIcon(item.subcategory) || getCategoryIcon(item.category)}</Text>
        </View>
      ) : (
        <Ionicons name="location-outline" size={20} color={Colors.primary} style={{ marginRight: 12 }} />
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.resultMain}>{item.structured_formatting.main_text}</Text>
        <Text style={styles.resultSecondary}>{item.structured_formatting.secondary_text}</Text>
        {item.subcategory && (
          <Text style={[styles.resultSecondary, { color: getCategoryColor(item.category), fontSize: 12 }]}>
            {item.subcategory}
          </Text>
        )}
        <Text style={[styles.resultSecondary, { color: '#10B981', fontSize: 12, fontWeight: '600' }]}>
          🏙️ Hyderabad
        </Text>
      </View>
    </TouchableOpacity>
  );

  // Render category with its items
  const renderCategory = (categoryKey: string, items: any[]) => {
    const isExpanded = expandedCategories[categoryKey];
    
    return (
      <View key={categoryKey} style={styles.categoryContainer}>
        {renderCategoryHeader(categoryKey, items)}
        {isExpanded && (
          <View style={styles.categoryItems}>
            {items.map((item, index) => (
              <View key={`${item.place_id || index}`}>
                {renderSearchResult({ item })}
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  // Combine recent locations and search results for display
  const showRecent = searchQuery.length > 2 && recentLocations.length > 0;

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
          <View style={{ flex: 1 }}>
            {/* Show categorized popular places when no search query */}
            <View style={{ flex: isPopularPlacesExpanded ? 0.7 : 0 }}>
              <TouchableOpacity 
                style={styles.popularPlacesHeader} 
                onPress={() => setIsPopularPlacesExpanded(!isPopularPlacesExpanded)}
                activeOpacity={0.7}
              >
                <View style={styles.popularPlacesHeaderContent}>
                  <View style={styles.popularPlacesIconContainer}>
                    <Text style={styles.popularPlacesIcon}>🏙️</Text>
                  </View>
                  <View style={styles.popularPlacesTextContainer}>
                    <Text style={styles.popularPlacesTitle}>Popular Places in Hyderabad</Text>
                    <Text style={styles.popularPlacesSubtitle}>Discover trending locations</Text>
                  </View>
                  <Ionicons 
                    name={isPopularPlacesExpanded ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color={Colors.text} 
                  />
                </View>
              </TouchableOpacity>
              {isPopularPlacesExpanded && (
                <CategorizedLocationList
                  onLocationSelect={(location) => handleLocationSelect(location)}
                  showAllCategories={false}
                  maxItemsPerCategory={2}
                />
              )}
            </View>
            {/* Map below popular places */}
            <View style={{ flex: isPopularPlacesExpanded ? 0.3 : 1 }}>
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
            </View>
          </View>
        ) : isSearching ? (
          <View style={styles.loadingContainer}>
            <LoadingSpinner size="small" />
          </View>
        ) : noResults ? (
          <View style={styles.loadingContainer}>
            <Text style={{ color: Colors.textLight, textAlign: 'center', paddingHorizontal: 20 }}>
              No places found in Hyderabad.{'\n'}
              We currently operate only in Hyderabad, Telangana.
            </Text>
          </View>
        ) : (
          <View style={styles.searchResultsContainer}>
            {showRecent && recentLocations.length > 0 && (
              <View style={styles.recentSection}>
                <Text style={styles.sectionTitle}>Recent Locations</Text>
                {recentLocations.map((location: any, index: number) => (
                  <View key={index}>
                    {renderRecentLocation({ item: location })}
                  </View>
                ))}
                <View style={styles.divider} />
              </View>
            )}
            
            {searchResults.length > 0 && (
              <View style={styles.categoriesSection}>
                <Text style={styles.sectionTitle}>Search Results</Text>
                {Object.entries(organizeResultsByCategory(searchResults)).map(([categoryKey, items]) => 
                  renderCategory(categoryKey, items)
                )}
              </View>
            )}
          </View>
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginHorizontal: Layout.spacing.lg,
    marginTop: Layout.spacing.md,
    marginBottom: Layout.spacing.sm,
  },
  searchResultsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  recentSection: {
    marginBottom: 16,
  },
  categoriesSection: {
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 16,
  },
  categoryContainer: {
    marginBottom: 8,
    backgroundColor: Colors.white,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  categoryHeader: {
    backgroundColor: Colors.gray50,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  categoryHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryIcon: {
    fontSize: 20,
  },
  categoryTextContainer: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  categoryCount: {
    fontSize: 12,
    color: Colors.textLight,
  },
  categoryItems: {
    backgroundColor: Colors.white,
  },
  popularPlacesHeader: {
    backgroundColor: Colors.gray50,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  popularPlacesHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  popularPlacesIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F620',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  popularPlacesIcon: {
    fontSize: 20,
  },
  popularPlacesTextContainer: {
    flex: 1,
  },
  popularPlacesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  popularPlacesSubtitle: {
    fontSize: 12,
    color: Colors.textLight,
  },
});
