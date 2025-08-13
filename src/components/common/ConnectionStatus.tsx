import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { getSocket, getDetailedConnectionStatus, testSocketConfiguration } from '../../utils/socket';

interface ConnectionStatusProps {
  isVisible?: boolean;
}

export default function ConnectionStatus({ isVisible = true }: ConnectionStatusProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [socketStatus, setSocketStatus] = useState('disconnected');
  const [isSocketConnecting, setIsSocketConnecting] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  
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
    }, __DEV__ ? 1000 : 200); // Much faster check for APK builds (< 5 sec target)

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
      const checkInterval = __DEV__ ? 500 : 100; // Very frequent checks for fast APK connection
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

    // Check socket status very frequently for fast APK connection
    const socketInterval = __DEV__ ? 2000 : 500;
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
    statusText = __DEV__ ? 'Connected' : '🟢 Online';
    iconName = 'wifi';
  } else if (isOnline && socketStatus === 'connecting') {
    statusColor = Colors.warning || '#FFA500';
    statusText = __DEV__ ? 'Connecting...' : '🟡 Connecting';
    iconName = 'sync';
  } else if (isOnline && socketStatus === 'disconnected') {
    statusColor = Colors.warning || '#FFA500';
    statusText = __DEV__ ? 'No Server' : '🟡 No Server';
    iconName = 'cloud-offline';
  } else if (!isOnline) {
    statusColor = Colors.error;
    statusText = __DEV__ ? 'Offline' : '🔴 Offline';
    iconName = 'wifi-outline';
  }

  // Handle tap for debugging in APK builds
  const handleTap = () => {
    const newTapCount = tapCount + 1;
    setTapCount(newTapCount);
    
    if (newTapCount >= 5) {
      setTapCount(0);
      // Show detailed connection info for APK debugging
      const socket = getSocket();
      const detailedStatus = getDetailedConnectionStatus();
      const configTest = testSocketConfiguration();
      
      Alert.alert(
        'Socket Debug Info',
        `Socket Exists: ${!!socket}\nSocket Connected: ${socket?.connected || false}\nConnection State: ${detailedStatus.connectionState}\nConfig Valid: ${configTest}\nEnvironment: ${__DEV__ ? 'Dev' : 'APK'}\nSocket URL: ${detailedStatus.socketUrl || 'Not set'}`,
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <TouchableOpacity 
      style={[styles.container, { backgroundColor: statusColor }]}
      onPress={handleTap}
      activeOpacity={0.8}
    >
      <Ionicons 
        name={(isConnecting || isSocketConnecting) ? "sync" : iconName} 
        size={16} 
        color="white" 
        style={(isConnecting || isSocketConnecting) ? styles.rotating : undefined}
      />
      <Text style={styles.text}>
        {isConnecting ? 'Checking...' : (isSocketConnecting ? 'Connecting...' : statusText)}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
    zIndex: 1000,
    elevation: 5, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
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