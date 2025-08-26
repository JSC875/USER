# Driver App Location Setup Guide

## 🚗 **Add Location Broadcasting to Your Driver App (`ridersony`)**

Your driver app needs to send location updates to the Socket.IO server. Here's what you need to add:

## 📱 **1. Install Required Dependencies**

In your `ridersony` app, install these packages:

```bash
cd ridersony
npm install socket.io-client expo-location
```

## 🔧 **2. Create Socket Connection Utility**

Create `src/utils/socket.ts` in your driver app:

```typescript
import { io, Socket } from "socket.io-client";
import Constants from 'expo-constants';

const SOCKET_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_SOCKET_URL || 
                   process.env.EXPO_PUBLIC_SOCKET_URL || 
                   'https://testsocketio-roqet.up.railway.app';

let socket: Socket | null = null;

export const connectDriverSocket = (driverId: string) => {
  if (socket) {
    socket.disconnect();
  }

  const isProduction = !__DEV__;
  
  socket = io(SOCKET_URL, {
    transports: isProduction ? ["websocket", "polling"] : ["websocket"],
    query: {
      type: 'driver',
      id: driverId,
      platform: isProduction ? 'android-apk' : 'react-native',
      version: '1.0.0',
      clientType: isProduction ? 'APK' : 'ReactNative'
    },
    reconnection: true,
    reconnectionAttempts: isProduction ? 25 : 15,
    reconnectionDelay: isProduction ? 500 : 1000,
    reconnectionDelayMax: isProduction ? 2000 : 5000,
    timeout: isProduction ? 10000 : 20000,
    upgrade: isProduction ? false : true,
    rememberUpgrade: isProduction ? false : true,
    extraHeaders: {
      "User-Agent": isProduction ? "ReactNative-APK" : "ReactNative",
      "X-Platform": "Android",
      "X-Environment": isProduction ? "production" : "development",
      "X-App-Version": "1.0.0",
      "X-Client-Type": isProduction ? "APK" : "ReactNative"
    }
  });

  socket.on('connect', () => {
    console.log('🚗 Driver socket connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('🚗 Driver socket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.log('🚗 Driver socket connection error:', error);
  });

  return socket;
};

export const getDriverSocket = () => socket;

export const disconnectDriverSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
```

## 📍 **3. Create Location Service**

Create `src/services/locationService.ts`:

```typescript
import * as Location from 'expo-location';
import { getDriverSocket } from '../utils/socket';

let locationSubscription: Location.LocationSubscription | null = null;
let currentRide: any = null;
let driverId: string = '';

export const startLocationTracking = async (driverIdParam: string, rideData?: any) => {
  driverId = driverIdParam;
  currentRide = rideData;
  
  console.log('🚗 Starting location tracking for driver:', driverId);
  
  // Request location permissions
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    console.error('❌ Location permission denied');
    return;
  }

  // Get current location
  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });

  console.log('🚗 Initial location:', location.coords);

  // Start watching location
  locationSubscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: 3000, // Update every 3 seconds
      distanceInterval: 10, // Update every 10 meters
    },
    (location) => {
      sendLocationUpdate(location.coords);
    }
  );

  console.log('🚗 Location tracking started');
};

export const stopLocationTracking = () => {
  if (locationSubscription) {
    locationSubscription.remove();
    locationSubscription = null;
  }
  currentRide = null;
  console.log('🚗 Location tracking stopped');
};

export const sendLocationUpdate = (coords: Location.LocationObjectCoords) => {
  const socket = getDriverSocket();
  
  if (socket && currentRide) {
    const locationData = {
      driverId: driverId,
      userId: currentRide.userId,
      latitude: coords.latitude,
      longitude: coords.longitude,
      timestamp: Date.now(),
      accuracy: coords.accuracy,
      speed: coords.speed,
      heading: coords.heading
    };

    console.log('🚗 Sending location update:', locationData);
    
    socket.emit('driver_location', locationData);
  } else {
    console.log('🚗 Cannot send location: socket or ride not available');
  }
};

export const setCurrentRide = (ride: any) => {
  currentRide = ride;
  console.log('🚗 Current ride set:', ride);
};
```

## 🎯 **4. Add to Your Driver Screen**

In your main driver screen (where you accept rides), add this:

```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { connectDriverSocket, disconnectDriverSocket } from '../utils/socket';
import { startLocationTracking, stopLocationTracking, setCurrentRide } from '../services/locationService';

const DriverScreen = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [currentRide, setCurrentRideState] = useState(null);
  const driverId = 'driver123'; // Replace with actual driver ID

  useEffect(() => {
    // Connect to socket when component mounts
    const socket = connectDriverSocket(driverId);
    
    socket.on('connect', () => {
      setIsConnected(true);
      console.log('🚗 Driver connected to server');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('🚗 Driver disconnected from server');
    });

    // Listen for ride requests
    socket.on('ride_request', (data) => {
      console.log('🚗 Received ride request:', data);
      // Show ride request to driver
      Alert.alert(
        'New Ride Request',
        `Pickup: ${data.pickup}\nDrop: ${data.destination}\nPrice: ₹${data.price}`,
        [
          { text: 'Decline', style: 'cancel' },
          { 
            text: 'Accept', 
            onPress: () => acceptRide(data) 
          }
        ]
      );
    });

    return () => {
      disconnectDriverSocket();
      stopLocationTracking();
    };
  }, []);

  const acceptRide = (rideData: any) => {
    console.log('🚗 Accepting ride:', rideData);
    
    // Set current ride
    setCurrentRideState(rideData);
    setCurrentRide(rideData);
    
    // Start location tracking
    startLocationTracking(driverId, rideData);
    
    // Accept ride on server
    const socket = getDriverSocket();
    if (socket) {
      socket.emit('accept_ride', {
        rideId: rideData.rideId,
        driverId: driverId
      });
    }
  };

  const completeRide = () => {
    console.log('🚗 Completing ride');
    
    // Stop location tracking
    stopLocationTracking();
    setCurrentRideState(null);
    
    // Complete ride on server
    const socket = getDriverSocket();
    if (socket && currentRide) {
      socket.emit('complete_ride', {
        rideId: currentRide.rideId,
        driverId: driverId
      });
    }
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
        Driver Dashboard
      </Text>
      
      <Text style={{ marginTop: 10 }}>
        Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
      </Text>
      
      {currentRide && (
        <View style={{ marginTop: 20 }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold' }}>
            Active Ride
          </Text>
          <Text>Pickup: {currentRide.pickup}</Text>
          <Text>Destination: {currentRide.destination}</Text>
          
          <TouchableOpacity 
            style={{ 
              backgroundColor: 'red', 
              padding: 10, 
              borderRadius: 5, 
              marginTop: 10 
            }}
            onPress={completeRide}
          >
            <Text style={{ color: 'white', textAlign: 'center' }}>
              Complete Ride
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default DriverScreen;
```

## 🧪 **5. Test the Setup**

### **Step 1: Start Your Server**
```bash
cd testsocket.io
npm start
```

### **Step 2: Start Driver App**
```bash
cd ridersony
npx expo start
```

### **Step 3: Start User App**
```bash
cd testinguser
npx expo start
```

### **Step 4: Test Flow**
1. **Book ride** from user app
2. **Accept ride** from driver app
3. **Watch console** for location updates

## 🔍 **Expected Logs**

### **Driver App Console:**
```bash
🚗 Driver socket connected: AsnjB6BYoTaqeIQFAAEw
🚗 Starting location tracking for driver: driver123
🚗 Initial location: { latitude: 17.4448, longitude: 78.3498 }
🚗 Location tracking started
🚗 Sending location update: { driverId: "driver123", latitude: 17.4448, ... }
```

### **Server Console:**
```bash
[timestamp] DRIVER_LOCATION_UPDATE: {
  driverId: "driver123",
  userId: "user_31GhofPb9tV1kryNa3l3XtvaxOy",
  latitude: 17.4448,
  longitude: 78.3498,
  timestamp: 1703123456789
}
```

### **User App Console:**
```bash
📍 LiveTrackingScreen received driver location: {
  driverId: "driver123",
  latitude: 17.4448,
  longitude: 78.3498,
  timestamp: 1703123456789
}
✅ DriverId matches, updating location with animation
```

## 🚀 **Key Points**

1. **Location Permission**: Make sure to request location permissions
2. **Socket Connection**: Driver must connect before sending location
3. **Ride Context**: Location is only sent when there's an active ride
4. **Update Frequency**: Location updates every 3 seconds
5. **Error Handling**: Handle connection errors and permission denials

## 🔧 **Troubleshooting**

### **No Location Updates:**
- Check location permissions
- Verify socket connection
- Ensure ride is active
- Check console for errors

### **Permission Issues:**
- Add location permission to `app.json`
- Request permissions explicitly
- Handle permission denial gracefully

### **Socket Issues:**
- Check server URL
- Verify driver ID
- Monitor connection status
- Check network connectivity

Once you implement this in your `ridersony` driver app, you should see the `driver_location` events in your server logs and real-time location updates in your user app! 🚗✨
