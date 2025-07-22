import { io, Socket } from "socket.io-client";

const SOCKET_URL = "https://testsocketio-roqet.up.railway.app";

let socket: Socket | null = null;

export const connectSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ["polling"], // Use polling only for Railway compatibility
      query: {
        type: "user",
        id: "user123", // Replace with real user ID if available
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

    socket.on("disconnect", (reason) => {
      console.log("🔴 Socket.IO disconnected:", reason);
    });

    socket.on("connect_error", (error) => {
      console.error("❌ Socket.IO connection error:", error);
      console.error("🔍 Error details:", {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
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
  }
  return socket;
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