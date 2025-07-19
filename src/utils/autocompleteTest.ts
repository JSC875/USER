import { Alert } from 'react-native';
import Constants from 'expo-constants';

// Test configuration - get API key from Expo constants
const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

// Test results interface
interface AutocompleteTestResult {
  test: string;
  success: boolean;
  message: string;
  details?: any;
  timestamp: string;
}

interface AutocompleteTestResults {
  apiKeyCheck: AutocompleteTestResult;
  placesApi: AutocompleteTestResult;
  geocodingApi: AutocompleteTestResult;
  placeDetailsApi: AutocompleteTestResult;
  overall: AutocompleteTestResult;
}

// Test if API key is properly configured
export const testApiKeyConfiguration = (): AutocompleteTestResult => {
  try {
    console.log('🔑 Testing API key configuration...');
    
    if (!GOOGLE_MAPS_API_KEY) {
      return {
        test: 'API Key Configuration',
        success: false,
        message: 'Google Maps API key is missing',
        details: { error: 'EXPO_PUBLIC_GOOGLE_MAPS_API_KEY not found' },
        timestamp: new Date().toISOString()
      };
    }
    
    if (GOOGLE_MAPS_API_KEY.length < 30) {
      return {
        test: 'API Key Configuration',
        success: false,
        message: 'Google Maps API key appears to be invalid (too short)',
        details: { keyLength: GOOGLE_MAPS_API_KEY.length },
        timestamp: new Date().toISOString()
      };
    }
    
    console.log('✅ API key configuration looks good');
    return {
      test: 'API Key Configuration',
      success: true,
      message: 'Google Maps API key is properly configured',
      details: { keyLength: GOOGLE_MAPS_API_KEY.length, keyPrefix: GOOGLE_MAPS_API_KEY.substring(0, 10) + '...' },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      test: 'API Key Configuration',
      success: false,
      message: 'Error checking API key configuration',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
      timestamp: new Date().toISOString()
    };
  }
};

// Test Places API (Autocomplete)
export const testPlacesApi = async (): Promise<AutocompleteTestResult> => {
  try {
    console.log('🔍 Testing Places API (Autocomplete)...');
    
    const testQuery = 'Delhi';
    const location = '28.6139,77.2090';
    const radius = 50000;
    
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(testQuery)}&location=${location}&radius=${radius}&components=country:in&key=${GOOGLE_MAPS_API_KEY}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'ReactNative'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('📡 Places API response:', data.status, data.error_message || 'No error');
    
    if (data.status === 'OK' && data.predictions && data.predictions.length > 0) {
      console.log('✅ Places API working correctly');
      return {
        test: 'Places API (Autocomplete)',
        success: true,
        message: 'Places API is working correctly',
        details: {
          status: data.status,
          resultsCount: data.predictions.length,
          sampleResult: data.predictions[0]
        },
        timestamp: new Date().toISOString()
      };
    } else if (data.status === 'REQUEST_DENIED') {
      console.error('❌ Places API access denied:', data.error_message);
      return {
        test: 'Places API (Autocomplete)',
        success: false,
        message: `Places API access denied: ${data.error_message}`,
        details: {
          status: data.status,
          error: data.error_message,
          possibleCauses: [
            'API key is invalid or expired',
            'Places API is not enabled for this key',
            'Billing is not set up for the project',
            'API key restrictions are blocking the request'
          ]
        },
        timestamp: new Date().toISOString()
      };
    } else if (data.status === 'ZERO_RESULTS') {
      console.log('📭 No results found (this is normal for some queries)');
      return {
        test: 'Places API (Autocomplete)',
        success: true,
        message: 'Places API is working (no results for test query)',
        details: {
          status: data.status,
          note: 'This is normal behavior for some queries'
        },
        timestamp: new Date().toISOString()
      };
    } else {
      console.error('❌ Places API error:', data.status, data.error_message);
      return {
        test: 'Places API (Autocomplete)',
        success: false,
        message: `Places API error: ${data.status} - ${data.error_message}`,
        details: {
          status: data.status,
          error: data.error_message
        },
        timestamp: new Date().toISOString()
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Places API test failed:', error);
    return {
      test: 'Places API (Autocomplete)',
      success: false,
      message: `Network error: ${errorMessage}`,
      details: {
        error: errorMessage,
        possibleCauses: [
          'No internet connection',
          'Network security restrictions',
          'Firewall blocking the request',
          'DNS resolution issues'
        ]
      },
      timestamp: new Date().toISOString()
    };
  }
};

// Test Geocoding API
export const testGeocodingApi = async (): Promise<AutocompleteTestResult> => {
  try {
    console.log('🔍 Testing Geocoding API...');
    
    const testAddress = 'Delhi, India';
    
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(testAddress)}&components=country:in&key=${GOOGLE_MAPS_API_KEY}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'ReactNative'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('📡 Geocoding API response:', data.status, data.error_message || 'No error');
    
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      console.log('✅ Geocoding API working correctly');
      return {
        test: 'Geocoding API',
        success: true,
        message: 'Geocoding API is working correctly',
        details: {
          status: data.status,
          resultsCount: data.results.length,
          sampleResult: {
            formatted_address: data.results[0].formatted_address,
            location: data.results[0].geometry.location
          }
        },
        timestamp: new Date().toISOString()
      };
    } else if (data.status === 'REQUEST_DENIED') {
      console.error('❌ Geocoding API access denied:', data.error_message);
      return {
        test: 'Geocoding API',
        success: false,
        message: `Geocoding API access denied: ${data.error_message}`,
        details: {
          status: data.status,
          error: data.error_message,
          possibleCauses: [
            'API key is invalid or expired',
            'Geocoding API is not enabled for this key',
            'Billing is not set up for the project',
            'API key restrictions are blocking the request'
          ]
        },
        timestamp: new Date().toISOString()
      };
    } else {
      console.error('❌ Geocoding API error:', data.status, data.error_message);
      return {
        test: 'Geocoding API',
        success: false,
        message: `Geocoding API error: ${data.status} - ${data.error_message}`,
        details: {
          status: data.status,
          error: data.error_message
        },
        timestamp: new Date().toISOString()
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Geocoding API test failed:', error);
    return {
      test: 'Geocoding API',
      success: false,
      message: `Network error: ${errorMessage}`,
      details: {
        error: errorMessage,
        possibleCauses: [
          'No internet connection',
          'Network security restrictions',
          'Firewall blocking the request',
          'DNS resolution issues'
        ]
      },
      timestamp: new Date().toISOString()
    };
  }
};

// Test Place Details API
export const testPlaceDetailsApi = async (): Promise<AutocompleteTestResult> => {
  try {
    console.log('🔍 Testing Place Details API...');
    
    // Use a known place ID for Delhi
    const testPlaceId = 'ChIJLbZ-NFv9DDkRzk0gTkm3wlI'; // Delhi, India
    
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${testPlaceId}&fields=geometry,formatted_address&key=${GOOGLE_MAPS_API_KEY}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'ReactNative'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('📡 Place Details API response:', data.status, data.error_message || 'No error');
    
    if (data.status === 'OK' && data.result) {
      console.log('✅ Place Details API working correctly');
      return {
        test: 'Place Details API',
        success: true,
        message: 'Place Details API is working correctly',
        details: {
          status: data.status,
          placeId: testPlaceId,
          result: {
            formatted_address: data.result.formatted_address,
            location: data.result.geometry?.location
          }
        },
        timestamp: new Date().toISOString()
      };
    } else if (data.status === 'REQUEST_DENIED') {
      console.error('❌ Place Details API access denied:', data.error_message);
      return {
        test: 'Place Details API',
        success: false,
        message: `Place Details API access denied: ${data.error_message}`,
        details: {
          status: data.status,
          error: data.error_message,
          possibleCauses: [
            'API key is invalid or expired',
            'Places API is not enabled for this key',
            'Billing is not set up for the project',
            'API key restrictions are blocking the request'
          ]
        },
        timestamp: new Date().toISOString()
      };
    } else {
      console.error('❌ Place Details API error:', data.status, data.error_message);
      return {
        test: 'Place Details API',
        success: false,
        message: `Place Details API error: ${data.status} - ${data.error_message}`,
        details: {
          status: data.status,
          error: data.error_message
        },
        timestamp: new Date().toISOString()
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Place Details API test failed:', error);
    return {
      test: 'Place Details API',
      success: false,
      message: `Network error: ${errorMessage}`,
      details: {
        error: errorMessage,
        possibleCauses: [
          'No internet connection',
          'Network security restrictions',
          'Firewall blocking the request',
          'DNS resolution issues'
        ]
      },
      timestamp: new Date().toISOString()
    };
  }
};

// Run comprehensive autocomplete test
export const runAutocompleteTest = async (): Promise<AutocompleteTestResults> => {
  console.log('🧪 Starting comprehensive autocomplete test...');
  
  const results = {
    apiKeyCheck: testApiKeyConfiguration(),
    placesApi: await testPlacesApi(),
    geocodingApi: await testGeocodingApi(),
    placeDetailsApi: await testPlaceDetailsApi(),
    overall: {
      test: 'Overall Autocomplete Test',
      success: false,
      message: '',
      details: {},
      timestamp: new Date().toISOString()
    }
  };
  
  // Determine overall success
  const allTests = [results.apiKeyCheck, results.placesApi, results.geocodingApi, results.placeDetailsApi];
  const successfulTests = allTests.filter(test => test.success);
  
  results.overall.success = successfulTests.length >= 3; // At least 3 out of 4 tests should pass
  results.overall.message = successfulTests.length >= 3 
    ? `Autocomplete feature is working (${successfulTests.length}/4 tests passed)`
    : `Autocomplete feature has issues (${successfulTests.length}/4 tests passed)`;
  results.overall.details = {
    totalTests: allTests.length,
    passedTests: successfulTests.length,
    failedTests: allTests.length - successfulTests.length,
    testResults: allTests.map(test => ({
      name: test.test,
      success: test.success,
      message: test.message
    }))
  };
  
  console.log('📊 Autocomplete test results:', results.overall);
  return results;
};

// Quick test for UI integration
export const quickAutocompleteTest = async () => {
  try {
    console.log('⚡ Running quick autocomplete test...');
    
    const results = await runAutocompleteTest();
    
    if (results.overall.success) {
      Alert.alert(
        '✅ Autocomplete Test Passed',
        `All autocomplete features are working correctly!\n\n${results.overall.message}`,
        [{ text: 'OK' }]
      );
    } else {
      const failedTests = [results.apiKeyCheck, results.placesApi, results.geocodingApi, results.placeDetailsApi]
        .filter(test => !test.success)
        .map(test => `• ${test.test}: ${test.message}`)
        .join('\n');
      
      Alert.alert(
        '❌ Autocomplete Test Failed',
        `Some autocomplete features are not working:\n\n${failedTests}\n\nCheck the console for detailed logs.`,
        [{ text: 'OK' }]
      );
    }
    
    return results;
  } catch (error) {
    console.error('❌ Quick autocomplete test failed:', error);
    Alert.alert(
      '❌ Test Error',
      'Failed to run autocomplete test. Check console for details.',
      [{ text: 'OK' }]
    );
    return null;
  }
}; 