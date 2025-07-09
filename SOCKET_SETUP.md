# Socket.IO Connection Setup

## Overview
This document explains the Socket.IO connection setup between the React Native user app and the Railway-deployed Socket.IO server.

## Server Configuration
- **URL**: `https://testsocketio-roqet.up.railway.app`
- **Port**: 9092 (default, Railway handles port mapping)
- **CORS**: Configured to allow all origins for development

## Client Configuration
The React Native app is configured to connect to the Railway server with the following features:

### Connection Settings
- **URL**: `https://testsocketio-roqet.up.railway.app`
- **Transports**: WebSocket with polling fallback
- **Reconnection**: Enabled with 5 attempts
- **Timeout**: 20 seconds

### Event Handlers
The server handles the following events:

1. **Connection Events**
   - `connect`: Logs successful connection
   - `disconnect`: Logs disconnection with reason
   - `connect_error`: Logs connection errors
   - `reconnect`: Logs successful reconnection
   - `reconnect_error`: Logs reconnection errors

2. **Ride Booking Events**
   - `book_ride`: Handles ride booking requests
   - `ride_booked`: Confirms successful booking
   - `new_ride_request`: Broadcasts to drivers

3. **Location & Status Events**
   - `driver_location`: Updates driver location
   - `ride_status_update`: Updates ride status

4. **Test Events**
   - `test_event`: For testing connection
   - `test_response`: Server response to test events

## Usage in React Native App

### Basic Connection
```typescript
import { connectSocket, getSocket, emitEvent, listenToEvent } from './src/utils/socket';

// Connect to server
const socket = connectSocket();

// Emit an event
const success = emitEvent('book_ride', {
  pickup: pickupLocation,
  drop: dropLocation,
  rideType: 'Bike',
  price: 50,
  userId: 'user123'
});

// Listen to events
const unsubscribe = listenToEvent('ride_booked', (data) => {
  console.log('Ride booked:', data);
});

// Clean up
unsubscribe();
```

### Testing Connection
1. Open the app and check console logs for connection status
2. Use the "Send Test Event" button in HomeScreen to test communication
3. Check both client and server console logs for confirmation

## Error Handling
- Automatic reconnection on connection loss
- Fallback to polling if WebSocket fails
- Error logging for debugging
- User-friendly error messages for failed operations

## Security Notes
- CORS is currently set to allow all origins for development
- In production, restrict CORS to specific domains
- Implement proper authentication for user identification
- Use environment variables for sensitive configuration

## Troubleshooting
1. **Connection fails**: Check Railway deployment status
2. **Events not received**: Verify event names match between client and server
3. **Reconnection issues**: Check network connectivity and server availability
4. **CORS errors**: Verify CORS configuration on server 