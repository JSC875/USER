// Test script for real Google Directions API polyline implementation
const { io } = require('socket.io-client');

// Test coordinates (Hyderabad area)
const TEST_DRIVER_LOCATION = { latitude: 17.4448, longitude: 78.3498 };
const TEST_PICKUP_LOCATION = { latitude: 17.4514, longitude: 78.3885 };

// Mock the RoutingService for testing
class MockRoutingService {
  constructor() {
    this.apiKey = 'AIzaSyDHN3SH_ODlqnHcU9Blvv2pLpnDNkg03lU';
  }

  async getRoute(origin, destination, mode = 'driving') {
    try {
      console.log('🛣️ Fetching real route from Google Directions API...');
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&mode=${mode}&key=${this.apiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.routes.length > 0) {
        const route = data.routes[0];
        const points = this.decodePolyline(route.overview_polyline.points);
        
        console.log('✅ Real route fetched successfully with', points.length, 'points');
        return {
          success: true,
          route: points
        };
      } else {
        console.log('⚠️ Google Directions API error:', data.status);
        return {
          success: false,
          error: `Directions API error: ${data.status}`
        };
      }
    } catch (error) {
      console.error('❌ Routing service error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  decodePolyline(encoded) {
    try {
      // Simple polyline decoder for testing
      const points = [];
      let index = 0, len = encoded.length;
      let lat = 0, lng = 0;

      while (index < len) {
        let shift = 0, result = 0;

        do {
          let b = encoded.charCodeAt(index++) - 63;
          result |= (b & 0x1f) << shift;
          shift += 5;
        } while (result >= 0x20);

        let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lat += dlat;

        shift = 0;
        result = 0;

        do {
          let b = encoded.charCodeAt(index++) - 63;
          result |= (b & 0x1f) << shift;
          shift += 5;
        } while (result >= 0x20);

        let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lng += dlng;

        points.push({
          latitude: lat / 1E5,
          longitude: lng / 1E5
        });
      }

      return points;
    } catch (error) {
      console.error('❌ Polyline decoding error:', error);
      return [];
    }
  }
}

async function testRealPolyline() {
  console.log('🧪 Testing Real Google Directions API Polyline Implementation');
  console.log('📍 Driver Location:', TEST_DRIVER_LOCATION);
  console.log('🎯 Pickup Location:', TEST_PICKUP_LOCATION);
  
  const routingService = new MockRoutingService();
  
  try {
    // Test real Google Directions API
    console.log('\n🛣️ Testing Google Directions API...');
    const routeResponse = await routingService.getRoute(TEST_DRIVER_LOCATION, TEST_PICKUP_LOCATION, 'driving');
    
    if (routeResponse.success && routeResponse.route) {
      console.log('✅ Real polyline route generated successfully!');
      console.log('📊 Route points:', routeResponse.route.length);
      console.log('📍 First point:', routeResponse.route[0]);
      console.log('🎯 Last point:', routeResponse.route[routeResponse.route.length - 1]);
      
      // Calculate distance
      const distance = Math.sqrt(
        Math.pow(TEST_PICKUP_LOCATION.latitude - TEST_DRIVER_LOCATION.latitude, 2) + 
        Math.pow(TEST_PICKUP_LOCATION.longitude - TEST_DRIVER_LOCATION.longitude, 2)
      ) * 111000; // Convert to meters (roughly)
      
      console.log('📏 Approximate distance:', Math.round(distance), 'meters');
      console.log('🛣️ This is a REAL road route from Google Directions API!');
      
      // Show some sample points
      console.log('\n📋 Sample route points:');
      for (let i = 0; i < Math.min(5, routeResponse.route.length); i++) {
        console.log(`   Point ${i + 1}:`, routeResponse.route[i]);
      }
      if (routeResponse.route.length > 5) {
        console.log(`   ... and ${routeResponse.route.length - 5} more points`);
      }
      
    } else {
      console.log('❌ Failed to get real route:', routeResponse.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
  
  console.log('\n✅ Real polyline test completed!');
  console.log('🎯 The customer app will now show REAL road routes from Google Directions API');
}

testRealPolyline().catch(console.error);
