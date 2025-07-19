import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { getSocket, isConnected, getConnectionStatus } from '../../utils/socket';

interface ConnectionStatusProps {
  isVisible?: boolean;
}

export default function ConnectionStatus({ isVisible = true }: ConnectionStatusProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [socketStatus, setSocketStatus] = useState('disconnected');

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
        } else {
          setSocketStatus('disconnected');
        }
      } else {
        setSocketStatus('disconnected');
      }
    };

    checkConnection();
    updateSocketStatus();
    
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