import { io, Socket } from "socket.io-client";
import { getUserIdFromJWT, getUserTypeFromJWT } from "./jwtDecoder";
import { Alert } from "react-native";

// Configuration for socket connection
const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL!; // From env

console.log('🔧 Socket URL configured:', SOCKET_URL, 'DEV mode:', __DEV__);

let socket: Socket | null = null;

// Enhanced connection state tracking
let isConnecting = false;
let lastConnectedUserId: string | null = null;
let connectionRetryCount = 0;
let maxRetryAttempts = 5;
let connectionState: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected';
let lastConnectionAttempt = 0;

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

export type DriverDisconnectedCallback = (data: {
  rideId: string;
  driverId: string;
}) => void;

export type RideTimeoutCallback = (data: { 
  rideId: string; 
  message: string 
}) => void;

export type RideCompletedCallback = (data: {
  rideId: string;
  status: string;
  message: string;
  timestamp: number;
}) => void;

// Event callbacks
let onRideBookedCallback: RideBookedCallback | null = null;
let onRideAcceptedCallback: RideAcceptedCallback | null = null;
let onDriverLocationCallback: DriverLocationCallback | null = null;
let onRideStatusCallback: RideStatusCallback | null = null;
let onDriverOfflineCallback: DriverOfflineCallback | null = null;
let onDriverDisconnectedCallback: DriverDisconnectedCallback | null = null;
let onRideTimeoutCallback: RideTimeoutCallback | null = null;
let onRideCompletedCallback: RideCompletedCallback | null = null;

export const connectSocket = (userId: string, userType: string = "customer") => {
  // Prevent duplicate connections for the same user
  if (isConnecting) {
    console.log("🔄 Connection already in progress, ignoring duplicate request");
    return socket;
  }
  
  if (socket && socket.connected && lastConnectedUserId === userId) {
    console.log("🔄 Socket already connected for this user, reusing existing connection");
    return socket;
  }

  // Disconnect existing socket if it exists
  if (socket) {
    console.log("🔄 Disconnecting existing socket before creating new one");
    socket.disconnect();
    socket = null;
  }

  isConnecting = true;
  connectionState = 'connecting';
  lastConnectedUserId = userId;
  lastConnectionAttempt = Date.now();
  
  // Reset retry count for new connection attempt
  connectionRetryCount = 0;

  console.log(`🔗 Connecting socket for user: ${userId}, type: ${userType}`);
  console.log(`🌐 Socket URL: ${SOCKET_URL}`);
  console.log(`🏗️ Environment: ${__DEV__ ? 'Development' : 'Production'}`);
  
  // Adjust configuration based on environment
  const isProduction = !__DEV__;
  const userAgent = isProduction ? 'ReactNative-APK' : 'ReactNative';
  
  socket = io(SOCKET_URL, {
    transports: ["websocket"], // Force WebSocket only for better reliability
    query: {
      type: userType,
      id: userId,
    },
    reconnection: true,
    reconnectionAttempts: isProduction ? 20 : 15, // More retries in production
    reconnectionDelay: isProduction ? 2000 : 1000, // Longer delay in production
    reconnectionDelayMax: isProduction ? 10000 : 5000, // Longer max delay in production
    timeout: isProduction ? 30000 : 20000, // Longer timeout in production
    forceNew: true,
    upgrade: false, // Disable upgrade to prevent transport switching issues
    rememberUpgrade: false,
    autoConnect: true,
    path: "/socket.io/",
    extraHeaders: {
      "Access-Control-Allow-Origin": "*",
      "User-Agent": userAgent,
      "X-Platform": "Android",
      "X-Environment": isProduction ? "production" : "development"
    },
    // Additional options for better Android compatibility
    withCredentials: false,
    rejectUnauthorized: false
  });

  // Add connection event listeners
  socket.on("connect", () => {
    console.log("🟢 Socket.IO connected to server");
    console.log("🔗 Socket ID:", socket?.id || 'None');
    console.log("📡 Transport:", socket?.io?.engine?.transport?.name || 'Unknown');
    console.log("🌐 Server URL:", SOCKET_URL);
    console.log("👤 User ID:", userId);
    console.log("👤 User Type:", userType);
    
    isConnecting = false;
    connectionState = 'connected';
    connectionRetryCount = 0; // Reset retry count on successful connection
    clearTimeout(connectionTimeout);
  });

  socket.on("ride_response_error", (data) => {
    console.log("❌ Ride response error:", data);
    Alert.alert('Ride Error', data.message || 'Ride could not be processed.');
  });

  socket.on("ride_cancellation_error", (data) => {
    console.log("❌ Ride cancellation error:", data);
    Alert.alert('Cancellation Error', data.message || 'Ride could not be cancelled.');
  });

  socket.on("ride_cancellation_success", (data) => {
    console.log("✅ Ride cancellation successful:", data);
    const message = data.cancellationFee > 0 
      ? `${data.message}\n\nCancellation fee: ₹${data.cancellationFee}`
      : data.message;
    Alert.alert('Ride Cancelled', message);
  });
  
  socket.on("disconnect", (reason) => {
    console.log("🔴 Socket.IO disconnected:", reason);
    isConnecting = false;
    connectionState = 'disconnected';
    
    // Only show alert if it's not a normal disconnection
    if (reason !== 'io client disconnect' && reason !== 'io server disconnect') {
      Alert.alert('Disconnected', 'Lost connection to server. Please check your internet.');
    }
  });
  
  socket.on("connect_error", (error) => {
    console.error("❌ Socket.IO connection error:", error);
    console.error("❌ Error details:", {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    isConnecting = false;
    connectionState = 'error';
    
    // Handle specific error types
    if (error.message.includes('websocket error')) {
      console.log("🔄 WebSocket connection error detected, will retry automatically");
      console.log("💡 This is common in production builds, retrying...");
    } else if (error.message.includes('timeout')) {
      console.log("⏰ Connection timeout, will retry automatically");
    } else if (error.message.includes('connection failed')) {
      console.log("🔌 Connection failed, will retry automatically");
    } else if (error.message.includes('xhr poll error')) {
      console.log("🔄 XHR poll error detected - this is expected in React Native");
      console.log("💡 Using WebSocket transport to avoid this issue");
    } else {
      console.log("❌ Unknown connection error:", error.message);
      // Only show alert for non-retryable errors
      if (!error.message.includes('websocket error') && !error.message.includes('timeout')) {
        Alert.alert('Connection Error', 'Could not connect to server. Please check your internet connection.');
      }
    }
  });

  socket.on("reconnect", (attemptNumber) => {
    console.log("🔄 Socket.IO reconnected after", attemptNumber, "attempts");
    connectionState = 'connected';
  });

  socket.on("reconnect_error", (error) => {
    console.error("❌ Socket.IO reconnection error:", error);
    connectionState = 'error';
  });

  socket.on("reconnect_attempt", (attemptNumber) => {
    console.log("🔄 Socket.IO reconnection attempt:", attemptNumber);
    connectionState = 'connecting';
  });

  socket.on("reconnect_failed", () => {
    console.error("❌ Socket.IO reconnection failed after all attempts");
    isConnecting = false;
    connectionState = 'error';
    Alert.alert('Connection Failed', 'Unable to connect to server after multiple attempts. Please check your internet connection and try again.');
  });
  
  // Add connection timeout
  const connectionTimeout = setTimeout(() => {
    if (isConnecting && socket && !socket.connected) {
      console.log("⏰ Connection timeout, attempting retry");
      isConnecting = false;
      connectionState = 'error';
      retryConnection(userId, userType);
    }
  }, 30000); // 30 second timeout

  // Ride booking events
  socket.on("ride_request_created", (data) => {
    console.log("✅ Ride request created:", data);
    onRideBookedCallback?.(data);
  });

  // Legacy event for backward compatibility
  socket.on("ride_booked", (data) => {
    console.log("✅ Ride booked (legacy):", data);
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
    console.log("📊 Ride status update:", data);
    onRideStatusCallback?.(data);
  });

  socket.on("driver_offline", (data) => {
    console.log("🔴 Driver went offline:", data);
    onDriverOfflineCallback?.(data);
  });

  socket.on("driver_disconnected", (data) => {
    console.log("🔌 Driver disconnected:", data);
    onDriverDisconnectedCallback?.(data);
  });

  socket.on("ride_timeout", (data) => {
    console.log("⏰ Ride timeout:", data);
    onRideTimeoutCallback?.(data);
  });

  socket.on("ride_completed", (data) => {
    console.log("✅ Ride completed:", data);
    onRideCompletedCallback?.(data);
  });

  return socket;
};

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
  isConnecting = false;
  connectionRetryCount = 0;
  connectionState = 'disconnected';
  lastConnectedUserId = null;
};

export const retryConnection = (userId: string, userType: string = "customer") => {
  if (connectionRetryCount >= maxRetryAttempts) {
    console.log("❌ Max retry attempts reached, giving up");
    Alert.alert('Connection Failed', 'Unable to connect to server after multiple attempts. Please check your internet connection and try again.');
    return null;
  }
  
  connectionRetryCount++;
  console.log(`🔄 Retrying connection (attempt ${connectionRetryCount}/${maxRetryAttempts})`);
  
  // Disconnect existing socket
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  
  // Wait a bit before retrying with exponential backoff
  const delay = Math.min(1000 * Math.pow(2, connectionRetryCount - 1), 10000); // Exponential backoff with max 10s
  console.log(`⏰ Waiting ${delay}ms before retry...`);
  
  setTimeout(() => {
    console.log(`🔄 Attempting retry ${connectionRetryCount}...`);
    return connectSocket(userId, userType);
  }, delay);
  
  return socket;
};

// Helper function to emit events with error handling
export const emitEvent = (eventName: string, data: any) => {
  const socket = getSocket();
  console.log(`📤 Attempting to emit event: ${eventName}`);
  console.log("🔍 Current socket status:", {
    exists: !!socket,
    connected: socket?.connected || false,
    id: socket?.id || 'None',
    transport: socket?.io?.engine?.transport?.name || 'Unknown',
    url: SOCKET_URL,
    connectionState: connectionState
  });
  
  if (socket && socket.connected) {
    try {
      socket.emit(eventName, data);
      console.log(`✅ Successfully emitted event: ${eventName}`, data);
      return true;
    } catch (error) {
      console.error(`❌ Error emitting event ${eventName}:`, error);
      return false;
    }
  } else {
    console.warn("⚠️ Socket not connected, cannot emit event:", eventName);
    console.log("🔍 Socket status:", {
      exists: !!socket,
      connected: socket?.connected || false,
      id: socket?.id || 'None',
      transport: socket?.io?.engine?.transport?.name || 'Unknown',
      connectionState: connectionState
    });
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

// Enhanced connection status function
export const getDetailedConnectionStatus = () => {
  return {
    socketExists: !!socket,
    connected: socket?.connected || false,
    id: socket?.id || 'None',
    transport: socket?.io?.engine?.transport?.name || 'Unknown',
    connectionState: connectionState,
    isConnecting: isConnecting,
    lastConnectedUserId: lastConnectedUserId,
    connectionRetryCount: connectionRetryCount,
    lastConnectionAttempt: lastConnectionAttempt
  };
};

// Helper function to ensure socket is connected
export const ensureSocketConnected = async (getToken: any) => {
  const socket = getSocket();
  console.log('🔍 Ensuring socket connection...');
  console.log('🔍 Current socket status:', getDetailedConnectionStatus());
  
  if (socket && socket.connected) {
    console.log('✅ Socket already connected');
    return socket;
  }
  
  console.log('🔌 Socket not connected, attempting to connect...');
  try {
    const connectedSocket = await connectSocketWithJWT(getToken);
    console.log('✅ Socket connected successfully');
    
    // Wait a bit to ensure connection is stable
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Verify connection is still active
    const currentSocket = getSocket();
    if (currentSocket && currentSocket.connected) {
      console.log('✅ Socket connection verified and stable');
      return connectedSocket;
    } else {
      console.log('⚠️ Socket connection not stable, attempting retry...');
      // Try one more time
      const retrySocket = await connectSocketWithJWT(getToken);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return retrySocket;
    }
  } catch (error) {
    console.error('❌ Failed to connect socket:', error);
    throw new Error('Unable to connect to server. Please check your internet connection.');
  }
};

// Force reconnect function for debugging
export const forceReconnect = async (getToken: any) => {
  console.log('🔄 Force reconnecting socket...');
  
  // Disconnect existing socket
  if (socket) {
    console.log('🔄 Disconnecting existing socket...');
    socket.disconnect();
    socket = null;
  }
  
  // Reset connection state
  isConnecting = false;
  connectionRetryCount = 0;
  lastConnectedUserId = null;
  connectionState = 'disconnected';
  
  // Wait a moment before reconnecting
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Reconnect
  try {
    const connectedSocket = await connectSocketWithJWT(getToken);
    console.log('✅ Force reconnect successful');
    
    // Wait a bit more to ensure connection is fully established
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verify connection
    const currentSocket = getSocket();
    if (currentSocket && currentSocket.connected) {
      console.log('✅ Force reconnect verified - socket is connected');
      connectionState = 'connected';
    } else {
      console.log('⚠️ Force reconnect completed but socket not verified as connected');
    }
    
    return connectedSocket;
  } catch (error) {
    console.error('❌ Force reconnect failed:', error);
    connectionState = 'error';
    throw error;
  }
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
type PickupDropLocation = {
  latitude: number;
  longitude: number;
  address: string;
  name: string;
  id?: string;
  type?: string;
};

export const requestRide = (rideData: {
  pickup: PickupDropLocation;
  drop: PickupDropLocation;
  rideType: string;
  price: number;
  userId: string;
}) => {
  return emitEvent("request_ride", rideData);
};

// Legacy function for backward compatibility
export const bookRide = (rideData: {
  pickup: PickupDropLocation;
  drop: PickupDropLocation;
  rideType: string;
  price: number;
  userId: string;
}) => {
  return requestRide(rideData);
};

export const cancelRide = (rideId: string, reason: string = '') => {
  return emitEvent("cancel_ride", { rideId, reason });
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

export const onDriverDisconnected = (callback: DriverDisconnectedCallback) => {
  onDriverDisconnectedCallback = callback;
};

export const onRideTimeout = (callback: RideTimeoutCallback) => {
  onRideTimeoutCallback = callback;
};

export const onRideCompleted = (callback: RideCompletedCallback) => {
  onRideCompletedCallback = callback;
};

// Clear all callbacks
export const clearCallbacks = () => {
  onRideBookedCallback = null;
  onRideAcceptedCallback = null;
  onDriverLocationCallback = null;
  onRideStatusCallback = null;
  onDriverOfflineCallback = null;
  onDriverDisconnectedCallback = null;
  onRideTimeoutCallback = null;
  onRideCompletedCallback = null;
};

// Test connection function
export const testConnection = (userId: string, userType: string = "customer") => {
  console.log("🧪 Testing Socket.IO connection...");
  
  const testSocket = io(SOCKET_URL, {
    transports: ["websocket", "polling"],
    query: {
      type: userType,
      id: userId,
    },
    timeout: 10000,
    forceNew: true,
  });

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      testSocket.disconnect();
      resolve(false);
    }, 10000);

    testSocket.on("connect", () => {
      clearTimeout(timeout);
      console.log("✅ Test connection successful");
      testSocket.disconnect();
      resolve(true);
    });

    testSocket.on("connect_error", (error) => {
      clearTimeout(timeout);
      console.log("❌ Test connection failed:", error);
      resolve(false);
    });
  });
};

// Debug function to log current socket state
export const debugSocketConnection = () => {
  console.log("🔍 Socket Debug Information:");
  console.log("🌐 Socket URL:", SOCKET_URL);
  console.log("📊 Connection State:", connectionState);
  console.log("🔄 Is Connecting:", isConnecting);
  console.log("👤 Last Connected User ID:", lastConnectedUserId);
  console.log("🔄 Connection Retry Count:", connectionRetryCount);
  console.log("⏰ Last Connection Attempt:", new Date(lastConnectionAttempt).toISOString());
  console.log("🏗️ Environment:", __DEV__ ? 'Development' : 'Production');
  
  const socket = getSocket();
  if (socket) {
    console.log("🔗 Socket Details:");
    console.log("- Exists: true");
    console.log("- Connected:", socket.connected);
    console.log("- ID:", socket.id || 'None');
    console.log("- Transport:", socket.io?.engine?.transport?.name || 'Unknown');
  } else {
    console.log("🔗 Socket: null");
  }
  
  console.log("📡 Detailed Status:", getDetailedConnectionStatus());
};

// Function to handle APK-specific connection issues
export const handleAPKConnection = async (getToken: any) => {
  console.log("🔧 Handling APK connection...");
  
  // For APK builds, we need to be more aggressive with connection
  if (!__DEV__) {
    console.log("🏗️ Running in production mode - using APK-specific handling");
    
    // Force disconnect any existing connection
    if (socket) {
      console.log("🔄 Force disconnecting existing socket for APK...");
      socket.disconnect();
      socket = null;
    }
    
    // Reset all state
    isConnecting = false;
    connectionRetryCount = 0;
    lastConnectedUserId = null;
    connectionState = 'disconnected';
    
    // Wait before reconnecting
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Connect with APK-specific settings
    try {
      const connectedSocket = await connectSocketWithJWT(getToken);
      
      // Wait longer for APK builds
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Verify connection
      const currentSocket = getSocket();
      if (currentSocket && currentSocket.connected) {
        console.log("✅ APK connection successful and verified");
        return connectedSocket;
      } else {
        console.log("⚠️ APK connection not verified, attempting one more time...");
        return await connectSocketWithJWT(getToken);
      }
    } catch (error) {
      console.error("❌ APK connection failed:", error);
      throw error;
    }
  } else {
    // For development, use normal connection
    return await ensureSocketConnected(getToken);
  }
}; 