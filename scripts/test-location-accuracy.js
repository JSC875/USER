const { io } = require('socket.io-client');

// Configuration
const SOCKET_URL = 'https://testsocketio-roqet.up.railway.app';
const TEST_DRIVER_ID = 'test-driver-001';
const TEST_USER_ID = 'test-user-001';
const TEST_RIDE_ID = 'test-ride-001';

// Test coordinates (Hyderabad area)
const TEST_LOCATIONS = [
  { latitude: 17.4448, longitude: 78.3498, name: 'Hyderabad Center' },
  { latitude: 17.4458, longitude: 78.3508, name: '100m North-East' },
  { latitude: 17.4438, longitude: 78.3488, name: '100m South-West' },
  { latitude: 17.4468, longitude: 78.3518, name: '200m North-East' },
];

console.log('🧪 Starting Location Accuracy Test');
console.log('🔗 Socket URL:', SOCKET_URL);
console.log('👤 Test Driver ID:', TEST_DRIVER_ID);
console.log('👤 Test User ID:', TEST_USER_ID);
console.log('🚗 Test Ride ID:', TEST_RIDE_ID);

// Create driver socket
const driverSocket = io(SOCKET_URL, {
  transports: ['websocket'],
  query: {
    userId: TEST_DRIVER_ID,
    userType: 'driver'
  }
});

// Create customer socket
const customerSocket = io(SOCKET_URL, {
  transports: ['websocket'],
  query: {
    userId: TEST_USER_ID,
    userType: 'customer'
  }
});

let locationUpdateCount = 0;
let receivedLocations = [];

// Customer socket event listeners
customerSocket.on('connect', () => {
  console.log('✅ Customer connected to socket');
  console.log('🆔 Customer socket ID:', customerSocket.id);
});

customerSocket.on('driver_location_update', (data) => {
  locationUpdateCount++;
  receivedLocations.push(data);
  
  console.log(`📍 Location Update #${locationUpdateCount} received:`);
  console.log('   Driver ID:', data.driverId);
  console.log('   Latitude:', data.latitude);
  console.log('   Longitude:', data.longitude);
  console.log('   Timestamp:', new Date(data.timestamp).toISOString());
  console.log('   Expected Driver ID:', TEST_DRIVER_ID);
  console.log('   Driver ID Match:', data.driverId === TEST_DRIVER_ID);
  console.log('---');
});

customerSocket.on('disconnect', () => {
  console.log('❌ Customer disconnected from socket');
});

// Driver socket event listeners
driverSocket.on('connect', () => {
  console.log('✅ Driver connected to socket');
  console.log('🆔 Driver socket ID:', driverSocket.id);
  
  // Start sending location updates
  sendLocationUpdates();
});

driverSocket.on('disconnect', () => {
  console.log('❌ Driver disconnected from socket');
});

// Function to send location updates
function sendLocationUpdates() {
  console.log('🚀 Starting location update simulation...');
  
  TEST_LOCATIONS.forEach((location, index) => {
    setTimeout(() => {
      const locationData = {
        latitude: location.latitude,
        longitude: location.longitude,
        userId: TEST_USER_ID,
        driverId: TEST_DRIVER_ID,
        accuracy: 5.0,
        speed: 5.0,
        heading: 45.0,
        timestamp: Date.now()
      };
      
      console.log(`📍 Sending location update #${index + 1}:`);
      console.log('   Location:', location.name);
      console.log('   Latitude:', locationData.latitude);
      console.log('   Longitude:', locationData.longitude);
      console.log('   User ID:', locationData.userId);
      console.log('   Driver ID:', locationData.driverId);
      console.log('---');
      
      driverSocket.emit('driver_location', locationData);
    }, (index + 1) * 2000); // Send every 2 seconds
  });
  
  // End test after all locations sent
  setTimeout(() => {
    console.log('\n📊 Test Results:');
    console.log('Total location updates sent:', TEST_LOCATIONS.length);
    console.log('Total location updates received:', locationUpdateCount);
    console.log('Success rate:', `${((locationUpdateCount / TEST_LOCATIONS.length) * 100).toFixed(1)}%`);
    
    if (receivedLocations.length > 0) {
      console.log('\n📍 Received Locations:');
      receivedLocations.forEach((loc, index) => {
        console.log(`   ${index + 1}. Lat: ${loc.latitude}, Lng: ${loc.longitude}, Driver ID: ${loc.driverId}`);
      });
    }
    
    // Check for accuracy issues
    const accuracyIssues = receivedLocations.filter(loc => 
      loc.driverId !== TEST_DRIVER_ID ||
      typeof loc.latitude !== 'number' ||
      typeof loc.longitude !== 'number' ||
      isNaN(loc.latitude) ||
      isNaN(loc.longitude)
    );
    
    if (accuracyIssues.length > 0) {
      console.log('\n⚠️ Accuracy Issues Found:');
      accuracyIssues.forEach((issue, index) => {
        console.log(`   ${index + 1}. Driver ID mismatch or invalid coordinates`);
        console.log(`      Expected Driver ID: ${TEST_DRIVER_ID}`);
        console.log(`      Received Driver ID: ${issue.driverId}`);
        console.log(`      Latitude: ${issue.latitude} (valid: ${typeof issue.latitude === 'number' && !isNaN(issue.latitude)})`);
        console.log(`      Longitude: ${issue.longitude} (valid: ${typeof issue.longitude === 'number' && !isNaN(issue.longitude)})`);
      });
    } else {
      console.log('\n✅ No accuracy issues detected');
    }
    
    // Disconnect sockets
    driverSocket.disconnect();
    customerSocket.disconnect();
    
    console.log('\n🏁 Test completed');
    process.exit(0);
  }, (TEST_LOCATIONS.length + 1) * 2000);
}

// Handle errors
driverSocket.on('connect_error', (error) => {
  console.error('❌ Driver connection error:', error.message);
});

customerSocket.on('connect_error', (error) => {
  console.error('❌ Customer connection error:', error.message);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted by user');
  driverSocket.disconnect();
  customerSocket.disconnect();
  process.exit(0);
});

console.log('⏳ Waiting for connections...');
