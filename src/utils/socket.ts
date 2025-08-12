import { io, Socket } from "socket.io-client";
import { getUserIdFromJWT, getUserTypeFromJWT } from "./jwtDecoder";
import { Alert } from "react-native";
import Constants from 'expo-constants';

// Get socket URL from Constants first, then fallback to process.env
const SOCKET_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_SOCKET_URL || process.env.EXPO_PUBLIC_SOCKET_URL;

// Get socket configuration from Constants or use defaults
const socketConfig = {
  url: SOCKET_URL,
  timeout: parseInt(Constants.expoConfig?.extra?.EXPO_PUBLIC_SOCKET_TIMEOUT || process.env.EXPO_PUBLIC_SOCKET_TIMEOUT || '20000'),
  reconnectionAttempts: parseInt(Constants.expoConfig?.extra?.EXPO_PUBLIC_SOCKET_RECONNECTION_ATTEMPTS || process.env.EXPO_PUBLIC_SOCKET_RECONNECTION_ATTEMPTS || '15'),
  reconnectionDelay: parseInt(Constants.expoConfig?.extra?.EXPO_PUBLIC_SOCKET_RECONNECTION_DELAY || process.env.EXPO_PUBLIC_SOCKET_RECONNECTION_DELAY || '1000'),
  reconnectionDelayMax: parseInt(Constants.expoConfig?.extra?.EXPO_PUBLIC_SOCKET_RECONNECTION_DELAY_MAX || process.env.EXPO_PUBLIC_SOCKET_RECONNECTION_DELAY_MAX || '5000'),
  pingTimeout: parseInt(Constants.expoConfig?.extra?.EXPO_PUBLIC_SOCKET_PING_TIMEOUT || process.env.EXPO_PUBLIC_SOCKET_PING_TIMEOUT || '60000'),
  pingInterval: parseInt(Constants.expoConfig?.extra?.EXPO_PUBLIC_SOCKET_PING_INTERVAL || process.env.EXPO_PUBLIC_SOCKET_PING_INTERVAL || '25000'),
};

// Check if we're in development mode
const isDevelopment = __DEV__;

// Conditional logging function
const log = (message: string, data?: any) => {
  if (isDevelopment) {
    if (data) {
      console.log(message, data);
    } else {
      console.log(message);
    }
  }
};

// Validate socket URL and log configuration
console.log('🔧 Socket Configuration Debug:');
console.log('🔧 Constants.expoConfig?.extra?.EXPO_PUBLIC_SOCKET_URL:', Constants.expoConfig?.extra?.EXPO_PUBLIC_SOCKET_URL);
console.log('🔧 process.env.EXPO_PUBLIC_SOCKET_URL:', process.env.EXPO_PUBLIC_SOCKET_URL);
console.log('🔧 Final SOCKET_URL:', SOCKET_URL);
console.log('🔧 socketConfig:', socketConfig);

if (!SOCKET_URL || SOCKET_URL === 'undefined') {
  console.error('❌ CRITICAL: Socket URL is not configured properly!');
  console.error('❌ Socket URL from config:', SOCKET_URL);
  console.error('❌ Constants.expoConfig?.extra:', Constants.expoConfig?.extra);
}

let socket: Socket | null = null;

// Enhanced connection state tracking
let isConnecting = false;
let lastConnectedUserId: string | null = null;
let connectionRetryCount = 0;
let maxRetryAttempts = 5;
let connectionState: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected';
let lastConnectionAttempt = 0;
let connectionTimeout: ReturnType<typeof setTimeout> | null = null;
let backgroundRetryInterval: ReturnType<typeof setInterval> | null = null;
let connectionPromise: Promise<Socket | null> | null = null; // Add connection promise tracking

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

export type PaymentStatusCallback = (data: {
  rideId: string;
  paymentId: string;
  status: string;
  amount: number;
  message: string;
}) => void;

export type PaymentFailedCallback = (data: {
  rideId: string;
  error: string;
  message: string;
}) => void;



export type PaymentCompletedCallback = (data: {
  rideId: string;
  orderId: string;
  paymentId: string;
  amount: number;
  currency: string;
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
let onPaymentStatusCallback: PaymentStatusCallback | null = null;
let onPaymentFailedCallback: PaymentFailedCallback | null = null;
let onPaymentSuccessCallback: ((data: any) => void) | null = null;


let onPaymentCompletedCallback: PaymentCompletedCallback | null = null;

// Chat-related event callbacks
let onChatMessageCallback: ((message: any) => void) | null = null;
let onChatHistoryCallback: ((data: any) => void) | null = null;
let onTypingIndicatorCallback: ((data: any) => void) | null = null;
let onMessagesReadCallback: ((data: any) => void) | null = null;

export const connectSocket = (userId: string, userType: string = "customer") => {
  // Prevent duplicate connections for the same user
  if (isConnecting) {
    log("🔄 Connection already in progress, returning existing promise");
    return connectionPromise;
  }
  
  if (socket && socket.connected && lastConnectedUserId === userId) {
    log("🔄 Socket already connected for this user, reusing existing connection");
    return Promise.resolve(socket);
  }

  // If there's an existing connection promise, return it
  if (connectionPromise) {
    log("🔄 Connection promise already exists, returning it");
    return connectionPromise;
  }

  // Disconnect existing socket if it exists
  if (socket) {
    log("🔄 Disconnecting existing socket before creating new one");
    socket.disconnect();
    socket = null;
  }

  // Clear any existing timeout
  if (connectionTimeout) {
    clearTimeout(connectionTimeout);
    connectionTimeout = null;
  }

  isConnecting = true;
  connectionState = 'connecting';
  lastConnectedUserId = userId;
  lastConnectionAttempt = Date.now();
  
  // Reset retry count for new connection attempt
  connectionRetryCount = 0;

  log(`🔗 Connecting socket for user: ${userId}, type: ${userType}`);
  log(`🌐 Socket URL: ${SOCKET_URL}`);
  log(`🏗️ Environment: ${__DEV__ ? 'Development' : 'Production'}`);
  
  // Validate socket URL before attempting connection
  if (!SOCKET_URL || SOCKET_URL === 'undefined' || SOCKET_URL === 'null') {
    console.error('❌ Cannot connect: Socket URL is invalid');
    console.error('❌ SOCKET_URL:', SOCKET_URL);
    console.error('❌ Socket configuration:', socketConfig);
    isConnecting = false;
    connectionState = 'error';
    throw new Error('Socket URL is not configured. Please check environment variables.');
  }

  // Create connection promise
  connectionPromise = new Promise<Socket | null>((resolve, reject) => {
    // Adjust configuration based on environment
    const isProduction = !__DEV__;
    const userAgent = isProduction ? 'ReactNative-APK' : 'ReactNative';
    
    // Enhanced socket configuration for better APK compatibility
    const socketOptions = {
      transports: isProduction ? ["polling", "websocket"] : ["websocket"], // Allow polling fallback for APK
      query: {
        type: userType,
        id: userId,
        platform: isProduction ? 'android-apk' : 'react-native',
        version: '1.0.0',
        clientType: isProduction ? 'APK' : 'ReactNative'
      },
      reconnection: true,
      reconnectionAttempts: isProduction ? socketConfig.reconnectionAttempts * 2 : socketConfig.reconnectionAttempts,
      reconnectionDelay: isProduction ? socketConfig.reconnectionDelay * 1.5 : socketConfig.reconnectionDelay,
      reconnectionDelayMax: isProduction ? socketConfig.reconnectionDelayMax * 1.6 : socketConfig.reconnectionDelayMax,
      timeout: isProduction ? socketConfig.timeout * 1.25 : socketConfig.timeout,
      forceNew: true,
      upgrade: isProduction ? true : false, // Enable upgrade for APK builds
      rememberUpgrade: isProduction ? true : false, // Remember upgrade for APK
      autoConnect: true,
      path: "/socket.io/",
      extraHeaders: {
        "Access-Control-Allow-Origin": "*",
        "User-Agent": userAgent,
        "X-Platform": "Android",
        "X-Environment": isProduction ? "production" : "development",
        "X-App-Version": "1.0.0",
        "X-Client-Type": isProduction ? "APK" : "ReactNative"
      },
      // Additional options for better Android compatibility
      withCredentials: false,
      rejectUnauthorized: false,
      // APK-specific settings
      ...(isProduction && {
        pingTimeout: socketConfig.pingTimeout * 1.5, // Increase ping timeout for APK
        pingInterval: socketConfig.pingInterval * 0.8, // Decrease ping interval for more frequent pings
        maxReconnectionAttempts: socketConfig.reconnectionAttempts * 2,
        reconnectionAttempts: socketConfig.reconnectionAttempts * 2,
        // Additional APK-specific options
        closeOnBeforeunload: false,
        autoUnref: false,
        // Network security settings for APK
        secure: true,
        rejectUnauthorized: false,
        // Additional headers for APK
        extraHeaders: {
          "Access-Control-Allow-Origin": "*",
          "User-Agent": userAgent,
          "X-Platform": "Android",
          "X-Environment": "production",
          "X-App-Version": "1.0.0",
          "X-Client-Type": "APK",
          "X-APK-Build": "true"
        }
      })
    };

    log('🔧 Socket configuration:', socketOptions);
    
    socket = io(SOCKET_URL, socketOptions);

    // Add connection event listeners
    socket.on("connect", () => {
      log("🟢 Socket.IO connected to server");
      log("🔗 Socket ID:", socket?.id || 'None');
      log("📡 Transport:", socket?.io?.engine?.transport?.name || 'Unknown');
      log("🌐 Server URL:", SOCKET_URL);
      log("👤 User ID:", userId);
      log("👤 User Type:", userType);
      
      isConnecting = false;
      connectionState = 'connected';
      connectionRetryCount = 0; // Reset retry count on successful connection
      
      // Clear connection timeout
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
        connectionTimeout = null;
      }

      // Clear connection promise
      connectionPromise = null;
      
      // Add chat event listeners
      addChatEventListeners();
      

      
      resolve(socket);
    });

    socket.on("ride_response_error", (data) => {
      log("❌ Ride response error:", data);
      Alert.alert('Ride Error', data.message || 'Ride could not be processed.');
    });

    socket.on("ride_cancellation_error", (data) => {
      log("❌ Ride cancellation error:", data);
      Alert.alert('Cancellation Error', data.message || 'Ride could not be cancelled.');
    });

    socket.on("ride_cancellation_success", (data) => {
      log("✅ Ride cancellation successful:", data);
      const message = data.cancellationFee > 0 
        ? `${data.message}\n\nCancellation fee: ₹${data.cancellationFee}`
        : data.message;
      Alert.alert('Ride Cancelled', message);
    });
    
    socket.on("disconnect", (reason) => {
      log("🔌 Socket.IO disconnected");
      log("📋 Disconnect reason:", reason);
      log("🔍 Socket ID:", socket?.id || 'None');
      log("👤 User ID:", userId);
      log("👤 User Type:", userType);
      log("🏗️ Environment:", __DEV__ ? 'Development' : 'Production');
      
      isConnecting = false;
      connectionState = 'disconnected';
      
      // Clear connection promise
      connectionPromise = null;
      
      // Handle specific disconnect reasons
      if (reason === 'io server disconnect') {
        log("🔄 Server initiated disconnect - will attempt to reconnect");
        // The server disconnected us, we need to manually reconnect
        setTimeout(() => {
          const currentSocket = getSocket();
          if (currentSocket && !currentSocket.connected) {
            log("🔄 Attempting manual reconnection after server disconnect...");
            connectSocket(userId, userType).catch(error => {
              console.error("❌ Manual reconnection failed:", error);
            });
          }
        }, 2000);
      } else if (reason === 'io client disconnect') {
        log("🔄 Client initiated disconnect");
      } else if (reason === 'ping timeout') {
        log("⏰ Ping timeout - connection may be unstable");
        // For APK builds, be more aggressive with reconnection
        if (!__DEV__) {
                  setTimeout(() => {
          const currentSocket = getSocket();
          if (currentSocket && !currentSocket.connected) {
            log("🔄 APK: Attempting reconnection after ping timeout...");
            connectSocket(userId, userType).catch(error => {
              console.error("❌ APK reconnection after ping timeout failed:", error);
            });
          }
        }, 3000);
        }
      } else if (reason === 'transport close') {
        log("🔌 Transport closed - network issue detected");
      } else if (reason === 'transport error') {
        log("❌ Transport error - connection issue detected");
      } else {
        log("❓ Unknown disconnect reason:", reason);
      }
      
      // Show user-friendly message for certain disconnect reasons
      if (reason === 'ping timeout' || reason === 'transport close' || reason === 'transport error') {
        if (!__DEV__) {
          // Only show alert in production for network-related issues
          Alert.alert(
            'Connection Lost', 
            'Your connection to the server was lost. We\'re trying to reconnect automatically.',
            [{ text: 'OK' }]
          );
        }
      }
    });

    socket.on("connect_error", (error) => {
      log("❌ Socket.IO connection error:", error);
      log("❌ Error details:", {
        message: error.message,
        name: error.name,
        type: (error as any).type,
        context: (error as any).context
      });
      
      connectionState = 'error';
      isConnecting = false;
      
      // Clear connection timeout
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
        connectionTimeout = null;
      }

      // Clear connection promise
      connectionPromise = null;
      
      // Handle specific error types
      if (error.message.includes('websocket error')) {
        log("🔄 WebSocket connection error detected, will retry automatically");
        log("💡 This is common in production builds, retrying...");
      } else if (error.message.includes('timeout')) {
        log("⏰ Connection timeout, will retry automatically");
      } else if (error.message.includes('connection failed')) {
        log("🔌 Connection failed, will retry automatically");
      } else if (error.message.includes('xhr poll error')) {
        log("🔄 XHR poll error detected - this is expected in React Native");
        log("💡 Using WebSocket transport to avoid this issue");
      } else {
        log("❌ Unknown connection error:", error.message);
        // Only show alert for non-retryable errors
        if (!error.message.includes('websocket error') && !error.message.includes('timeout')) {
          Alert.alert('Connection Error', 'Could not connect to server. Please check your internet connection.');
        }
      }

      reject(error);
    });

    socket.on("reconnect", (attemptNumber) => {
      log(`🔄 Socket.IO reconnected after ${attemptNumber} attempts`);
      connectionState = 'connected';
      isConnecting = false;
    });

    socket.on("reconnect_error", (error) => {
      console.error("❌ Socket.IO reconnection error:", error);
      connectionState = 'error';
    });

    socket.on("reconnect_attempt", (attemptNumber) => {
      log("🔄 Socket.IO reconnection attempt:", attemptNumber);
      connectionState = 'connecting';
    });

    socket.on("reconnect_failed", () => {
      console.error("❌ Socket.IO reconnection failed after all attempts");
      isConnecting = false;
      connectionState = 'error';
      Alert.alert('Connection Failed', 'Unable to connect to server after multiple attempts. Please check your internet connection and try again.');
      reject(new Error('Socket reconnection failed'));
    });
    
    // Add connection timeout with better handling
    connectionTimeout = setTimeout(() => {
      if (isConnecting && socket && !socket.connected) {
        log("⏰ Connection timeout, attempting retry");
        isConnecting = false;
        connectionState = 'error';
        connectionPromise = null;
        retryConnection(userId, userType);
      }
    }, isProduction ? 30000 : 25000); // Longer timeout for production

    // Ride booking events
    socket.on("ride_request_created", (data) => {
      log("✅ Ride request created:", data);
      onRideBookedCallback?.(data);
    });

    // Legacy event for backward compatibility
    socket.on("ride_booked", (data) => {
      log("✅ Ride booked (legacy):", data);
      onRideBookedCallback?.(data);
    });

    socket.on("ride_accepted", (data) => {
      log("✅ Ride accepted by driver:", data);
      onRideAcceptedCallback?.(data);
    });

    socket.on("driver_location_update", (data) => {
      log("📍 Driver location update:", data);
      onDriverLocationCallback?.(data);
    });

    socket.on("ride_status_update", (data) => {
      log("📊 Ride status update:", data);
      onRideStatusCallback?.(data);
    });

    socket.on("driver_offline", (data) => {
      log("🔴 Driver went offline:", data);
      onDriverOfflineCallback?.(data);
    });

    socket.on("driver_disconnected", (data) => {
      log("🔌 Driver disconnected:", data);
      onDriverDisconnectedCallback?.(data);
    });

    socket.on("ride_timeout", (data) => {
      log("⏰ Ride timeout:", data);
      onRideTimeoutCallback?.(data);
    });

    socket.on("ride_completed", (data) => {
      log("✅ Ride completed:", data);
      onRideCompletedCallback?.(data);
    });

    socket.on("payment_status", (data) => {
      log("💰 Payment status update:", data);
      onPaymentStatusCallback?.(data);
    });

    socket.on("payment_failed", (data) => {
      log("❌ Payment failed:", data);
      onPaymentFailedCallback?.(data);
    });

    socket.on("payment_success", (data) => {
      log("✅ Payment success:", data);
      onPaymentSuccessCallback?.(data);
    });
  });

  return connectionPromise;
};

export const connectSocketWithJWT = async (getToken: any) => {
  const userId = await getUserIdFromJWT(getToken);
  const userType = await getUserTypeFromJWT(getToken);
  return connectSocket(userId, userType);
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    log("🔌 Disconnecting socket");
    socket.disconnect();
    socket = null;
  }
  isConnecting = false;
  connectionState = 'disconnected';
  lastConnectedUserId = null;
  connectionRetryCount = 0;
  
  // Clear background retry interval
  if (backgroundRetryInterval) {
    clearInterval(backgroundRetryInterval);
    backgroundRetryInterval = null;
  }
};

export const retryConnection = (userId: string, userType: string = "customer") => {
  if (connectionRetryCount >= maxRetryAttempts) {
    console.log("❌ Max retry attempts reached, giving up");
    Alert.alert('Connection Failed', 'Unable to connect to server after multiple attempts. Please check your internet connection and try again.');
    return null;
  }
  
  connectionRetryCount++;
  log(`🔄 Retrying connection (attempt ${connectionRetryCount}/${maxRetryAttempts})`);
  
  // Disconnect existing socket
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  
  // Wait a bit before retrying with exponential backoff
  const delay = Math.min(1000 * Math.pow(2, connectionRetryCount - 1), 10000); // Exponential backoff with max 10s
  log(`⏰ Waiting ${delay}ms before retry...`);
  
  setTimeout(() => {
    log(`🔄 Attempting retry ${connectionRetryCount}...`);
    return connectSocket(userId, userType);
  }, delay);
  
  return socket;
};

// Helper function to emit events with error handling
export const emitEvent = (eventName: string, data: any) => {
  const socket = getSocket();
  log(`📤 Attempting to emit event: ${eventName}`);
  log("🔍 Current socket status:", {
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
      log(`✅ Successfully emitted event: ${eventName}`, data);
      return true;
    } catch (error) {
      console.error(`❌ Error emitting event ${eventName}:`, error);
      return false;
    }
  } else {
    log("⚠️ Socket not connected, cannot emit event:", eventName);
    log("🔍 Socket status:", {
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
  log('🔍 Ensuring socket connection...');
  log('🔍 Current socket status:', getDetailedConnectionStatus());
  
  if (socket && socket.connected) {
    log('✅ Socket already connected');
    return socket;
  }
  
  log('🔌 Socket not connected, attempting to connect...');
  try {
    const connectedSocket = await connectSocketWithJWT(getToken);
    log('✅ Socket connected successfully');
    
    // Wait a bit to ensure connection is stable
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Verify connection is still active
    const currentSocket = getSocket();
    if (currentSocket && currentSocket.connected) {
      log('✅ Socket connection verified and stable');
      return connectedSocket;
    } else {
      log('⚠️ Socket connection not stable, attempting retry...');
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
  log('🔄 Force reconnecting socket...');
  
  // Disconnect existing socket
  if (socket) {
    log('🔄 Disconnecting existing socket...');
    socket.disconnect();
    socket = null;
  }
  
  // Clear any existing timeout
  if (connectionTimeout) {
    clearTimeout(connectionTimeout);
    connectionTimeout = null;
  }
  
  // Reset connection state
  isConnecting = false;
  connectionRetryCount = 0;
  lastConnectedUserId = null;
  connectionState = 'disconnected';
  
  // Wait a moment before reconnecting
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Reconnect with APK-specific handling
  try {
    const connectedSocket = await connectSocketWithJWT(getToken);
    log('✅ Force reconnect successful');
    
    // Wait longer for APK builds to ensure connection is fully established
    const waitTime = !__DEV__ ? 3000 : 2000;
    await new Promise(resolve => setTimeout(resolve, waitTime));
    
    // Verify connection
    const currentSocket = getSocket();
    if (currentSocket && currentSocket.connected) {
      log('✅ Force reconnect verified - socket is connected');
      connectionState = 'connected';
    } else {
      log('⚠️ Force reconnect completed but socket not verified as connected');
      
      // For APK builds, try one more time
      if (!__DEV__) {
        log('🔄 APK: Attempting one more reconnection...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        const retrySocket = await connectSocketWithJWT(getToken);
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const finalSocket = getSocket();
        if (finalSocket && finalSocket.connected) {
          log('✅ APK: Second reconnection attempt successful');
          connectionState = 'connected';
          return retrySocket;
        }
      }
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

export const onPaymentStatus = (callback: PaymentStatusCallback) => {
  onPaymentStatusCallback = callback;
};

export const onPaymentFailed = (callback: PaymentFailedCallback) => {
  onPaymentFailedCallback = callback;
};

export const onPaymentSuccess = (callback: (data: any) => void) => {
  onPaymentSuccessCallback = callback;
  return () => {
    onPaymentSuccessCallback = null;
  };
};



export const onPaymentCompleted = (callback: PaymentCompletedCallback) => {
  onPaymentCompletedCallback = callback;
  return () => {
    onPaymentCompletedCallback = null;
  };
};

// Chat event callback setters
export const onChatMessage = (callback: (message: any) => void) => {
  onChatMessageCallback = callback;
};

export const onChatHistory = (callback: (data: any) => void) => {
  onChatHistoryCallback = callback;
};

export const onTypingIndicator = (callback: (data: any) => void) => {
  onTypingIndicatorCallback = callback;
};

export const onMessagesRead = (callback: (data: any) => void) => {
  onMessagesReadCallback = callback;
};

// Chat message functions
export const sendChatMessage = (messageData: {
  rideId: string;
  senderId: string;
  senderType: 'user' | 'driver';
  message: string;
}) => {
  return emitEvent("send_chat_message", messageData);
};

export const getChatHistory = (data: {
  rideId: string;
  requesterId: string;
  requesterType: 'user' | 'driver';
}) => {
  return emitEvent("get_chat_history", data);
};

export const markMessagesAsRead = (data: {
  rideId: string;
  readerId: string;
  readerType: 'user' | 'driver';
}) => {
  return emitEvent("mark_messages_read", data);
};

export const sendTypingStart = (data: {
  rideId: string;
  senderId: string;
  senderType: 'user' | 'driver';
}) => {
  return emitEvent("typing_start", data);
};

export const sendTypingStop = (data: {
  rideId: string;
  senderId: string;
  senderType: 'user' | 'driver';
}) => {
  return emitEvent("typing_stop", data);
};

// Add chat event listeners to the socket connection
const addChatEventListeners = () => {
  if (!socket) return;

  socket.on("chat_message", (message) => {
    log("💬 Received chat message:", message);
    onChatMessageCallback?.(message);
  });

  socket.on("chat_history", (data) => {
    log("📚 Received chat history:", data);
    onChatHistoryCallback?.(data);
  });

  socket.on("typing_indicator", (data) => {
    log("⌨️ Typing indicator:", data);
    onTypingIndicatorCallback?.(data);
  });

  socket.on("messages_read", (data) => {
    log("👁️ Messages read:", data);
    onMessagesReadCallback?.(data);
  });

  socket.on("payment_completed", (data) => {
    log("✅ Payment completed:", data);
    onPaymentCompletedCallback?.(data);
  });

  socket.on("payment_success", (data) => {
    log("🎉 Payment success:", data);
    onPaymentSuccessCallback?.(data);
  });

  socket.on("payment_failed", (data) => {
    log("❌ Payment failed:", data);
    onPaymentFailedCallback?.(data);
  });
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
  onPaymentStatusCallback = null;
  onPaymentFailedCallback = null;
  onPaymentSuccessCallback = null;
};

// Test connection function
export const testConnection = (userId: string, userType: string = "customer") => {
  log("🧪 Testing Socket.IO connection...");
  
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
      log("✅ Test connection successful");
      testSocket.disconnect();
      resolve(true);
    });

    testSocket.on("connect_error", (error: any) => {
      clearTimeout(timeout);
      log("❌ Test connection failed:", error);
      resolve(false);
    });
  });
};

// Debug function to log current socket state
export const debugSocketConnection = () => {
  log("🔍 Socket Debug Information:");
  log("🌐 Socket URL:", SOCKET_URL);
  log("📊 Connection State:", connectionState);
  log("🔄 Is Connecting:", isConnecting);
  log("👤 Last Connected User ID:", lastConnectedUserId);
  log("🔄 Connection Retry Count:", connectionRetryCount);
  log("⏰ Last Connection Attempt:", new Date(lastConnectionAttempt).toISOString());
  log("🏗️ Environment:", __DEV__ ? 'Development' : 'Production');
  
  const socket = getSocket();
  if (socket) {
    log("🔗 Socket Details:");
    log("- Exists: true");
    log("- Connected:", socket.connected);
    log("- ID:", socket.id || 'None');
    log("- Transport:", socket.io?.engine?.transport?.name || 'Unknown');
  } else {
    log("🔗 Socket: null");
  }
  
  log("📡 Detailed Status:", getDetailedConnectionStatus());
};

// Function to handle APK-specific connection issues
export const handleAPKConnection = async (getToken: any) => {
  log("🔧 Handling APK connection...");
  
  // For APK builds, we need to be more aggressive with connection
  if (!__DEV__) {
    log("🏗️ Running in production mode - using APK-specific handling");
    
    // Force disconnect any existing connection
    if (socket) {
      log("🔄 Force disconnecting existing socket for APK...");
      socket.disconnect();
      socket = null;
    }
    
    // Clear any existing timeout
    if (connectionTimeout) {
      clearTimeout(connectionTimeout);
      connectionTimeout = null;
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
      await new Promise(resolve => setTimeout(resolve, 4000));
      
      // Verify connection
      const currentSocket = getSocket();
      if (currentSocket && currentSocket.connected) {
        log("✅ APK connection successful and verified");
        return connectedSocket;
      } else {
        log("⚠️ APK connection not verified, attempting one more time...");
        await new Promise(resolve => setTimeout(resolve, 2000));
        const retrySocket = await connectSocketWithJWT(getToken);
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const finalSocket = getSocket();
        if (finalSocket && finalSocket.connected) {
          log("✅ APK: Second connection attempt successful");
          return retrySocket;
        } else {
          log("❌ APK: Both connection attempts failed");
          throw new Error("Failed to establish APK connection after multiple attempts");
        }
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

// Background retry mechanism for APK builds
export const startBackgroundRetry = (getToken: any) => {
  if (backgroundRetryInterval) {
    clearInterval(backgroundRetryInterval);
  }
  
  // Only start background retry for APK builds
  if (!__DEV__) {
    log('🔄 Starting background retry mechanism for APK...');
    backgroundRetryInterval = setInterval(async () => {
      const currentSocket = getSocket();
      if (!currentSocket || !currentSocket.connected) {
        log('🔄 Background retry: Socket not connected, attempting reconnection...');
        try {
          await connectSocketWithJWT(getToken);
          log('✅ Background retry: Reconnection successful');
        } catch (error) {
          log('❌ Background retry: Reconnection failed:', error);
        }
      }
    }, 30000); // Check every 30 seconds
  }
};

// New function specifically for APK initialization
export const initializeAPKConnection = async (getToken: any) => {
  log("🚀 Initializing APK connection...");
  
  if (!__DEV__) {
    log("🏗️ APK initialization mode");
    
    // Clear any existing connection
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    
    if (connectionTimeout) {
      clearTimeout(connectionTimeout);
      connectionTimeout = null;
    }
    
    // Reset state
    isConnecting = false;
    connectionRetryCount = 0;
    lastConnectedUserId = null;
    connectionState = 'disconnected';
    
    // Initial delay for APK
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
      // Get user info first
      const userId = await getUserIdFromJWT(getToken);
      const userType = await getUserTypeFromJWT(getToken);
      
      log(`🔍 APK: User ID: ${userId}, Type: ${userType}`);
      
      // First connection attempt with simplified configuration
      log("🔄 APK: First connection attempt...");
      const firstSocket = await connectSocket(userId, userType);
      
      // Wait for connection to stabilize
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      let currentSocket = getSocket();
      if (currentSocket && currentSocket.connected) {
        log("✅ APK: First connection successful");
        
        // Start background retry mechanism for APK builds
        startBackgroundRetry(getToken);
        
        return firstSocket;
      }
      
      // Second attempt with different strategy
      log("🔄 APK: Second connection attempt...");
      const existingSocket = getSocket();
      if (existingSocket) {
        existingSocket.disconnect();
        socket = null;
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Try with different configuration
      const secondSocket = await connectSocket(userId, userType);
      await new Promise(resolve => setTimeout(resolve, 4000));
      
      currentSocket = getSocket();
      if (currentSocket && currentSocket.connected) {
        log("✅ APK: Second connection successful");
        
        // Start background retry mechanism for APK builds
        startBackgroundRetry(getToken);
        
        return secondSocket;
      }
      
      // Final attempt with force reconnect
      log("🔄 APK: Final connection attempt with force reconnect...");
      const finalSocket = await forceReconnect(getToken);
      
      // Start background retry mechanism for APK builds
      startBackgroundRetry(getToken);
      
      return finalSocket;
      
    } catch (error) {
      console.error("❌ APK initialization failed:", error);
      
      // Try one more time with a simpler approach
      try {
        log("🔄 APK: Emergency fallback connection attempt...");
        const userId = await getUserIdFromJWT(getToken);
        const userType = await getUserTypeFromJWT(getToken);
        
        const fallbackSocket = await connectSocket(userId, userType);
        
        // Start background retry mechanism for APK builds
        startBackgroundRetry(getToken);
        
        return fallbackSocket;
      } catch (fallbackError) {
        console.error("❌ APK: Emergency fallback also failed:", fallbackError);
        throw error; // Throw the original error
      }
    }
  } else {
    // For development, use normal connection
    return await ensureSocketConnected(getToken);
  }
}; 

// Comprehensive APK debugging function
export const debugAPKConnection = async (getToken: any) => {
  log("🔍 === APK Connection Debug ===");
  
  try {
    // Get user info
    const userId = await getUserIdFromJWT(getToken);
    const userType = await getUserTypeFromJWT(getToken);
    
    log("👤 User Info:");
    log("- User ID:", userId);
    log("- User Type:", userType);
    
    // Get current socket status
    const currentStatus = getDetailedConnectionStatus();
    log("📊 Current Socket Status:", currentStatus);
    
    // Check environment
    log("🏗️ Environment Info:");
    log("- Is Production:", !__DEV__);
    log("- Socket URL:", SOCKET_URL);
    log("- Socket Config:", socketConfig);
    
    // Test basic connection
    log("🔄 Testing basic connection...");
    const testSocket = io(SOCKET_URL, {
      transports: ["websocket"],
      timeout: 10000,
      forceNew: true,
      query: {
        type: userType,
        id: userId,
        platform: 'android-apk',
        debug: 'true'
      },
      extraHeaders: {
        "User-Agent": "ReactNative-APK-Debug",
        "X-Platform": "Android",
        "X-Environment": "production"
      }
    });
    
    const connectionResult = await new Promise<{
      success: boolean;
      error?: string;
      details: {
        connected: boolean;
        id?: string;
        transport?: string;
        url?: string;
        type?: string;
        context?: string;
      };
    }>((resolve) => {
      const timeout = setTimeout(() => {
        testSocket.disconnect();
        resolve({
          success: false,
          error: 'Connection timeout',
          details: {
            connected: testSocket.connected,
            id: testSocket.id || undefined,
            transport: testSocket.io?.engine?.transport?.name || undefined
          }
        });
      }, 10000);
      
      testSocket.on("connect", () => {
        clearTimeout(timeout);
        const result = {
          success: true,
          details: {
            connected: testSocket.connected,
            id: testSocket.id || undefined,
            transport: testSocket.io?.engine?.transport?.name || undefined,
            url: SOCKET_URL
          }
        };
        testSocket.disconnect();
        resolve(result);
      });
      
      testSocket.on("connect_error", (error: any) => {
        clearTimeout(timeout);
        resolve({
          success: false,
          error: error.message || 'Connection error',
          details: {
            type: error.type || 'unknown',
            context: error.context || 'unknown',
            connected: testSocket.connected,
            transport: testSocket.io?.engine?.transport?.name || 'unknown'
          }
        });
      });
    });
    
    log("📊 Basic Connection Test Result:", connectionResult);
    
    return {
      success: true,
      userInfo: { userId, userType },
      currentStatus,
      environment: {
        isProduction: !__DEV__,
        socketUrl: SOCKET_URL,
        socketConfig
      },
      connectionTest: connectionResult,
      recommendations: connectionResult.success ? [
        'Connection test successful',
        'Check if main socket connection is working',
        'Verify JWT token is valid'
      ] : [
        'Connection test failed',
        'Check network connectivity',
        'Verify server is reachable',
        'Check firewall/proxy settings'
      ]
    };
    
  } catch (error) {
    console.error("❌ APK Debug failed:", error);
    return {
      success: false,
      error: error.message,
      recommendations: [
        'Debug function failed',
        'Check JWT token availability',
        'Verify user authentication'
      ]
    };
  }
}; 