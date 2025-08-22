const RoutingService = require('../src/services/routingService');

async function testRoutingService() {
  console.log('🧪 Testing Routing Service...');
  
  const routingService = RoutingService.getInstance();
  
  // Test coordinates (Hyderabad area)
  const origin = { latitude: 17.4448, longitude: 78.3498 };
  const destination = { latitude: 17.4514, longitude: 78.3885 };
  
  console.log('📍 Origin:', origin);
  console.log('🎯 Destination:', destination);
  
  // Test curved path generation
  console.log('\n🛣️ Testing curved path generation...');
  const curvedPath = routingService.generateCurvedPath(origin, destination, 10);
  console.log('✅ Curved path generated with', curvedPath.length, 'points');
  console.log('📊 Path points:', curvedPath.slice(0, 3), '...', curvedPath.slice(-3));
  
  // Test route fetching (will fail without API key, but should fallback)
  console.log('\n🛣️ Testing route fetching (will fallback to curved path)...');
  try {
    const routeResponse = await routingService.getRoute(origin, destination, 'driving');
    console.log('📊 Route response:', routeResponse);
  } catch (error) {
    console.log('❌ Route API failed (expected without API key):', error.message);
  }
  
  console.log('\n✅ Routing service test completed!');
}

testRoutingService().catch(console.error);
