import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { getSocket, isConnected, getConnectionStatus, listenToEvent } from '../../utils/socket';

interface ConnectionStatusProps {
  isVisible?: boolean;
}

export default function ConnectionStatus({ isVisible = true }: ConnectionStatusProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [socketStatus, setSocketStatus] = useState('disconnected');
  const [socketId, setSocketId] = useState<string | null>(null);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        setIsConnecting(true);
        const response = await fetch('https://www.google.com', { 
          method: 'HEAD',
          mode: 'no-cors'
        });
        setIsOnline(true);
      } catch (error) {
        setIsOnline(false);
      } finally {
        setIsConnecting(false);
      }
    };

    const updateSocketStatus = () => {
      const socket = getSocket();
      if (socket) {
        if (socket.connected) {
          setSocketStatus('connected');
          setSocketId(socket.id || null);
        } else {
          setSocketStatus('disconnected');
          setSocketId(null);
        }
      } else {
        setSocketStatus('disconnected');
        setSocketId(null);
      }
    };

    // Initial checks with a small delay to allow socket to connect
    const initialCheck = async () => {
      await checkConnection();
      // Give socket time to connect
      setTimeout(() => {
        updateSocketStatus();
      }, 1000);
    };
    
    initialCheck();
    
    // Set up socket event listeners
    const socket = getSocket();
    if (socket) {
      const handleConnect = () => {
        console.log('🔗 ConnectionStatus: Socket connected');
        setSocketStatus('connected');
        setSocketId(socket.id || null);
      };

      const handleDisconnect = () => {
        console.log('🔴 ConnectionStatus: Socket disconnected');
        setSocketStatus('disconnected');
        setSocketId(null);
      };

      const handleConnectError = () => {
        console.log('❌ ConnectionStatus: Socket connection error');
        setSocketStatus('disconnected');
        setSocketId(null);
      };

      // Add event listeners
      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);
      socket.on('connect_error', handleConnectError);

      // Cleanup function
      return () => {
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
        socket.off('connect_error', handleConnectError);
      };
    } else {
      // If no socket exists yet, check periodically for socket creation
      const checkForSocket = setInterval(() => {
        const newSocket = getSocket();
        if (newSocket) {
          console.log('🔍 ConnectionStatus: Socket found, setting up listeners');
          clearInterval(checkForSocket);
          
          const handleConnect = () => {
            console.log('🔗 ConnectionStatus: Socket connected');
            setSocketStatus('connected');
            setSocketId(newSocket.id || null);
          };

          const handleDisconnect = () => {
            console.log('🔴 ConnectionStatus: Socket disconnected');
            setSocketStatus('disconnected');
            setSocketId(null);
          };

          const handleConnectError = () => {
            console.log('❌ ConnectionStatus: Socket connection error');
            setSocketStatus('disconnected');
            setSocketId(null);
          };

          newSocket.on('connect', handleConnect);
          newSocket.on('disconnect', handleDisconnect);
          newSocket.on('connect_error', handleConnectError);
          
          // Update status immediately if already connected
          if (newSocket.connected) {
            setSocketStatus('connected');
            setSocketId(newSocket.id || null);
          }
        }
      }, 500);

      return () => {
        clearInterval(checkForSocket);
      };
    }
    
    const interval = setInterval(checkConnection, 30000); // Check every 30 seconds
    const socketInterval = setInterval(updateSocketStatus, 2000); // Check socket status every 2 seconds

    return () => {
      clearInterval(interval);
      clearInterval(socketInterval);
    };
  }, []);

  if (!isVisible) return null;

  // Determine status and color
  let statusColor = Colors.error;
  let statusText = 'Offline';
  let iconName: keyof typeof Ionicons.glyphMap = 'wifi-outline';

  if (isOnline && socketStatus === 'connected') {
    statusColor = Colors.success;
    statusText = 'Connected';
    iconName = 'wifi';
  } else if (isOnline && socketStatus === 'disconnected') {
    statusColor = Colors.warning || '#FFA500';
    statusText = 'No Server';
    iconName = 'cloud-offline';
  } else if (!isOnline) {
    statusColor = Colors.error;
    statusText = 'Offline';
    iconName = 'wifi-outline';
  }

  return (
    <View style={[styles.container, { backgroundColor: statusColor }]}>
      <Ionicons 
        name={isConnecting ? "sync" : iconName} 
        size={16} 
        color="white" 
        style={isConnecting ? styles.rotating : undefined}
      />
      <Text style={styles.text}>
        {isConnecting ? 'Checking...' : statusText}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    right: 80, // Move it further left to avoid overlapping with header buttons
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1000,
  },
  text: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  rotating: {
    transform: [{ rotate: '360deg' }],
  },
}); 