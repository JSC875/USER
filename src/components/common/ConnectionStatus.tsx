import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { getSocket, getDetailedConnectionStatus } from '../../utils/socket';

interface ConnectionStatusProps {
  isVisible?: boolean;
}

export default function ConnectionStatus({ isVisible = true }: ConnectionStatusProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [socketStatus, setSocketStatus] = useState('disconnected');
  const [isSocketConnecting, setIsSocketConnecting] = useState(false);
  
  // Use refs to prevent memory leaks and excessive re-renders
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const socketIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const checkSocketRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  // Memoized status update function to prevent unnecessary re-renders
  const updateSocketStatus = useCallback(() => {
    if (!mountedRef.current) return;
    
    try {
      const detailedStatus = getDetailedConnectionStatus();
      
      // More detailed status checking
      if (detailedStatus.socketExists && detailedStatus.connected) {
        setSocketStatus('connected');
        setIsSocketConnecting(false);
      } else if (detailedStatus.connectionState === 'connecting' || detailedStatus.isConnecting) {
        setSocketStatus('connecting');
        setIsSocketConnecting(true);
      } else {
        setSocketStatus('disconnected');
        setIsSocketConnecting(false);
      }
    } catch (error) {
      console.error('Error updating socket status:', error);
      setSocketStatus('disconnected');
      setIsSocketConnecting(false);
    }
  }, []);

  // Memoized connection check function
  const checkConnection = useCallback(async () => {
    if (!mountedRef.current) return;
    
    try {
      setIsConnecting(true);
      const response = await fetch('https://www.google.com', { 
        method: 'HEAD',
        mode: 'no-cors'
      });
      if (mountedRef.current) {
        setIsOnline(true);
      }
    } catch (error) {
      if (mountedRef.current) {
        setIsOnline(false);
      }
    } finally {
      if (mountedRef.current) {
        setIsConnecting(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    // Initial checks
    checkConnection();
    
    // Initial socket status check with shorter delay for APK builds
    const initialSocketCheck = setTimeout(() => {
      if (mountedRef.current) {
        updateSocketStatus();
      }
    }, __DEV__ ? 2000 : 1000); // Faster check for APK builds

    // Set up socket event listeners
    const socket = getSocket();
    if (socket) {
      const handleConnect = () => {
        if (mountedRef.current) {
          setSocketStatus('connected');
          setIsSocketConnecting(false);
        }
      };

      const handleDisconnect = () => {
        if (mountedRef.current) {
          setSocketStatus('disconnected');
          setIsSocketConnecting(false);
        }
      };

      const handleConnectError = () => {
        if (mountedRef.current) {
          setSocketStatus('disconnected');
          setIsSocketConnecting(false);
        }
      };

      // Add event listeners
      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);
      socket.on('connect_error', handleConnectError);

      // Update status immediately if already connected
      if (socket.connected) {
        setSocketStatus('connected');
        setIsSocketConnecting(false);
      }

      // Cleanup function
      return () => {
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
        socket.off('connect_error', handleConnectError);
      };
    } else {
      // If no socket exists yet, check more frequently for APK builds
      const checkInterval = __DEV__ ? 1000 : 500; // More frequent checks for APK
      checkSocketRef.current = setInterval(() => {
        if (!mountedRef.current) return;
        
        const newSocket = getSocket();
        if (newSocket) {
          if (checkSocketRef.current) {
            clearInterval(checkSocketRef.current);
            checkSocketRef.current = null;
          }
          
          const handleConnect = () => {
            if (mountedRef.current) {
              setSocketStatus('connected');
              setIsSocketConnecting(false);
            }
          };

          const handleDisconnect = () => {
            if (mountedRef.current) {
              setSocketStatus('disconnected');
              setIsSocketConnecting(false);
            }
          };

          const handleConnectError = () => {
            if (mountedRef.current) {
              setSocketStatus('disconnected');
              setIsSocketConnecting(false);
            }
          };

          newSocket.on('connect', handleConnect);
          newSocket.on('disconnect', handleDisconnect);
          newSocket.on('connect_error', handleConnectError);
          
          // Update status immediately if already connected
          if (newSocket.connected) {
            setSocketStatus('connected');
            setIsSocketConnecting(false);
          }
        }
      }, checkInterval);

      return () => {
        if (checkSocketRef.current) {
          clearInterval(checkSocketRef.current);
          checkSocketRef.current = null;
        }
      };
    }
  }, [checkConnection, updateSocketStatus]);

  // Set up periodic checks with different intervals for APK vs dev
  useEffect(() => {
    // Check connection every 30 seconds for APK, 60 for dev
    const connectionInterval = __DEV__ ? 60000 : 30000;
    intervalRef.current = setInterval(() => {
      if (mountedRef.current) {
        checkConnection();
      }
    }, connectionInterval);

    // Check socket status every 2 seconds for APK, 5 for dev
    const socketInterval = __DEV__ ? 5000 : 2000;
    socketIntervalRef.current = setInterval(() => {
      if (mountedRef.current) {
        updateSocketStatus();
      }
    }, socketInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (socketIntervalRef.current) {
        clearInterval(socketIntervalRef.current);
        socketIntervalRef.current = null;
      }
    };
  }, [checkConnection, updateSocketStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (socketIntervalRef.current) {
        clearInterval(socketIntervalRef.current);
        socketIntervalRef.current = null;
      }
      if (checkSocketRef.current) {
        clearInterval(checkSocketRef.current);
        checkSocketRef.current = null;
      }
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
  } else if (isOnline && socketStatus === 'connecting') {
    statusColor = Colors.warning || '#FFA500';
    statusText = 'Connecting...';
    iconName = 'sync';
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
        name={(isConnecting || isSocketConnecting) ? "sync" : iconName} 
        size={16} 
        color="white" 
        style={(isConnecting || isSocketConnecting) ? styles.rotating : undefined}
      />
      <Text style={styles.text}>
        {isConnecting ? 'Checking...' : (isSocketConnecting ? 'Connecting...' : statusText)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    right: 16,
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