import { io, Socket } from "socket.io-client";
import { getUserIdFromJWT, getUserTypeFromJWT } from "./jwtDecoder";
import { Alert } from "react-native";

const SOCKET_URL = "https://testsocketio-roqet.up.railway.app";

let socket: Socket | null = null;

// Event callback types
export type RideBookedCallback = (data: {
  success: boolean;
  rideId: string;
  price: number;
  message: string;
}) => void;

export type RideAcceptedCallback = (data: {
  rideId: string;
  driverId: string;
  driverName: string;
  driverPhone: string;
  estimatedArrival: string;
}) => void;

export type DriverLocationCallback = (data: {
  driverId: string;
  latitude: number;
  longitude: number;
  timestamp: number;
}) => void;

export type RideStatusCallback = (data: {
  rideId: string;
  status: string;
  message: string;
  timestamp: number;
}) => void;

export type DriverOfflineCallback = (data: {
  rideId: string;
  driverId: string;
}) => void;

// Event callbacks
let onRideBookedCallback: RideBookedCallback | null = null;
let onRideAcceptedCallback: RideAcceptedCallback | null = null;
let onDriverLocationCallback: DriverLocationCallback | null = null;
let onRideStatusCallback: RideStatusCallback | null = null;
let onDriverOfflineCallback: DriverOfflineCallback | null = null;

export const connectSocket = (userId: string = "user123", userType: string = "customer") => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ["polling"], // Use polling only for Railway compatibility
      query: {
        type: userType,
        id: userId,
      },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 30000,
      forceNew: true,
    });

    // Add connection event listeners
    socket.on("connect", () => {
      console.log("🟢 Socket.IO connected to Railway server");
      if (socket?.io?.engine?.transport) {
        console.log("📡 Transport:", socket.io.engine.transport.name);
      }
      if (socket?.id) {
        console.log("🔗 Socket ID:", socket.id);
      }
    });

    socket.on("ride_response_error", (data) => {
      console.log("❌ Ride response error:", data);
      Alert.alert('Ride Error', data.message || 'Ride could not be accepted.');
    });
    socket.on("disconnect", (reason) => {
      console.log("🔴 Socket.IO disconnected:", reason);
      Alert.alert('Disconnected', 'Lost connection to server. Please check your internet.');
    });
    socket.on("connect_error", (error) => {
      console.error("❌ Socket.IO connection error:", error);
      Alert.alert('Connection Error', 'Could not connect to server.');
    });

    socket.on("reconnect", (attemptNumber) => {
      console.log("🔄 Socket.IO reconnected after", attemptNumber, "attempts");
    });

    socket.on("reconnect_error", (error) => {
      console.error("❌ Socket.IO reconnection error:", error);
    });

    socket.on("reconnect_attempt", (attemptNumber) => {
      console.log("🔄 Socket.IO reconnection attempt:", attemptNumber);
    });

    socket.on("reconnect_failed", () => {
      console.error("❌ Socket.IO reconnection failed after all attempts");
    });

    // Ride booking events
    socket.on("ride_booked", (data) => {
      console.log("✅ Ride booked:", data);
      onRideBookedCallback?.(data);
    });

    socket.on("ride_accepted", (data) => {
      console.log("✅ Ride accepted by driver:", data);
      onRideAcceptedCallback?.(data);
    });

    socket.on("driver_location_update", (data) => {
      console.log("📍 Driver location update:", data);
      onDriverLocationCallback?.(data);
    });

    socket.on("ride_status_update", (data) => {
      console.log("🔄 Ride status update:", data);
      onRideStatusCallback?.(data);
    });

    socket.on("driver_offline", (data) => {
      console.log("🔴 Driver went offline:", data);
      onDriverOfflineCallback?.(data);
    });

    // Test events
    socket.on("test_response", (data) => {
      console.log("🧪 Test response:", data);
    });
  }
  return socket;
};

// New helper to connect socket using JWT
export const connectSocketWithJWT = async (getToken: any) => {
  const userId = await getUserIdFromJWT(getToken);
  const userType = await getUserTypeFromJWT(getToken);
  return connectSocket(userId, userType);
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// Helper function to emit events with error handling
export const emitEvent = (eventName: string, data: any) => {
  const socket = getSocket();
  if (socket && socket.connected) {
    socket.emit(eventName, data);
    console.log(`📤 Emitted event: ${eventName}`, data);
    return true;
  } else {
    console.warn("Socket not connected, cannot emit event:", eventName);
    return false;
  }
};

// Helper function to check connection status
export const isConnected = () => {
  const socket = getSocket();
  return socket ? socket.connected : false;
};

// Helper function to get connection status
export const getConnectionStatus = () => {
  const socket = getSocket();
  if (!socket) return "Not initialized";
  if (socket.connected) return "Connected";
  return "Disconnected";
};

// Helper function to listen to events
export const listenToEvent = (eventName: string, callback: (data: any) => void) => {
  const socket = getSocket();
  if (socket) {
    socket.on(eventName, callback);
    return () => socket.off(eventName, callback);
  }
  return () => {};
};

// Ride booking specific functions
export const bookRide = (rideData: {
  pickup: string;
  drop: string;
  rideType: string;
  price: number;
  userId: string;
}) => {
  return emitEvent("book_ride", rideData);
};

// Event callback setters
export const onRideBooked = (callback: RideBookedCallback) => {
  onRideBookedCallback = callback;
};

export const onRideAccepted = (callback: RideAcceptedCallback) => {
  onRideAcceptedCallback = callback;
};

export const onDriverLocation = (callback: DriverLocationCallback) => {
  onDriverLocationCallback = callback;
};

export const onRideStatus = (callback: RideStatusCallback) => {
  onRideStatusCallback = callback;
};

export const onDriverOffline = (callback: DriverOfflineCallback) => {
  onDriverOfflineCallback = callback;
};

// Clear all callbacks
export const clearCallbacks = () => {
  onRideBookedCallback = null;
  onRideAcceptedCallback = null;
  onDriverLocationCallback = null;
  onRideStatusCallback = null;
  onDriverOfflineCallback = null;
}; 