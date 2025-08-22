const io = require('socket.io-client');

// Test configuration
const SOCKET_URL = 'https://testsocketio-roqet.up.railway.app';
const TEST_DRIVER_ID = '943742b3-259e-45a3-801e-f5d98637cda6'; // Use the actual driver ID from logs
const TEST_USER_ID = 'test_user_001';

console.log('🧪 Testing Driver Location Tracking Implementation');
console.log('🔗 Socket URL:', SOCKET_URL);

// Create test socket connections
const driverSocket = io(SOCKET_URL, {
  query: {
    type: 'driver',
    id: TEST_DRIVER_ID,
    platform: 'test',
    version: '1.0.0'
  },
  transports: ['websocket']
});

const customerSocket = io(SOCKET_URL, {
  query: {
    type: 'customer',
    id: TEST_USER_ID,
    platform: 'test',
    version: '1.0.0'
  },
  transports: ['websocket']
});

// Test data
const testLocations = [
  { latitude: 17.4448, longitude: 78.3498 }, // Hyderabad center
  { latitude: 17.4448 + 0.001, longitude: 78.3498 + 0.001 },
  { latitude: 17.4448 + 0.002, longitude: 78.3498 + 0.002 },
  { latitude: 17.4448 + 0.003, longitude: 78.3498 + 0.003 },
  { latitude: 17.4448 + 0.004, longitude: 78.3498 + 0.004 },
];

let locationIndex = 0;
let receivedUpdates = 0;

// Driver socket event handlers
driverSocket.on('connect', () => {
  console.log('✅ Driver socket connected');
  console.log('🔗 Driver socket ID:', driverSocket.id);
  
  // Start sending location updates
  sendLocationUpdate();
});

driverSocket.on('disconnect', () => {
  console.log('❌ Driver socket disconnected');
});

driverSocket.on('connect_error', (error) => {
  console.error('❌ Driver socket connection error:', error.message);
});

// Customer socket event handlers
customerSocket.on('connect', () => {
  console.log('✅ Customer socket connected');
  console.log('🔗 Customer socket ID:', customerSocket.id);
  
  // Listen for driver location updates
  customerSocket.on('driver_location_update', (data) => {
    receivedUpdates++;
    console.log(`📍 Customer received location update #${receivedUpdates}:`, {
      driverId: data.driverId,
      latitude: data.latitude,
      longitude: data.longitude,
      timestamp: new Date(data.timestamp).toLocaleTimeString()
    });
    
    // Check if we received all test locations
    if (receivedUpdates >= testLocations.length) {
      console.log('✅ All test location updates received successfully!');
      console.log('📊 Test Summary:');
      console.log(`   - Total updates sent: ${testLocations.length}`);
      console.log(`   - Total updates received: ${receivedUpdates}`);
      console.log(`   - Success rate: ${(receivedUpdates / testLocations.length * 100).toFixed(1)}%`);
      
      // Clean up and exit
      setTimeout(() => {
        driverSocket.disconnect();
        customerSocket.disconnect();
        process.exit(0);
      }, 2000);
    }
  });
});

customerSocket.on('disconnect', () => {
  console.log('❌ Customer socket disconnected');
});

customerSocket.on('connect_error', (error) => {
  console.error('❌ Customer socket connection error:', error.message);
});

// Function to send location updates
function sendLocationUpdate() {
  if (locationIndex < testLocations.length) {
    const location = testLocations[locationIndex];
    
    console.log(`📤 Driver sending location update #${locationIndex + 1}:`, location);
    
    driverSocket.emit('driver_location', {
      latitude: location.latitude,
      longitude: location.longitude,
      userId: TEST_USER_ID,
      driverId: TEST_DRIVER_ID
    });
    
    locationIndex++;
    
    // Send next update after 2 seconds
    setTimeout(sendLocationUpdate, 2000);
  }
}

// Error handling
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Timeout after 30 seconds
setTimeout(() => {
  console.log('⏰ Test timeout reached');
  driverSocket.disconnect();
  customerSocket.disconnect();
  process.exit(1);
}, 30000);

console.log('🚀 Starting driver location tracking test...');
console.log('⏱️ Test will run for up to 30 seconds');
console.log('📱 Make sure both driver and customer apps are ready to receive updates');
