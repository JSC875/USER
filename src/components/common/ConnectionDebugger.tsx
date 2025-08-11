import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Colors } from '../../constants/Colors';
import { 
  getSocket, 
  getDetailedConnectionStatus, 
  debugAPKConnection, 
  forceReconnect,
  testConnection 
} from '../../utils/socket';

// Get configuration from Constants
const socketConfig = {
  url: Constants.expoConfig?.extra?.EXPO_PUBLIC_SOCKET_URL || process.env.EXPO_PUBLIC_SOCKET_URL,
  timeout: parseInt(Constants.expoConfig?.extra?.EXPO_PUBLIC_SOCKET_TIMEOUT || process.env.EXPO_PUBLIC_SOCKET_TIMEOUT || '20000'),
  reconnectionAttempts: parseInt(Constants.expoConfig?.extra?.EXPO_PUBLIC_SOCKET_RECONNECTION_ATTEMPTS || process.env.EXPO_PUBLIC_SOCKET_RECONNECTION_ATTEMPTS || '15'),
  reconnectionDelay: parseInt(Constants.expoConfig?.extra?.EXPO_PUBLIC_SOCKET_RECONNECTION_DELAY || process.env.EXPO_PUBLIC_SOCKET_RECONNECTION_DELAY || '1000'),
  reconnectionDelayMax: parseInt(Constants.expoConfig?.extra?.EXPO_PUBLIC_SOCKET_RECONNECTION_DELAY_MAX || process.env.EXPO_PUBLIC_SOCKET_RECONNECTION_DELAY_MAX || '5000'),
  pingTimeout: parseInt(Constants.expoConfig?.extra?.EXPO_PUBLIC_SOCKET_PING_TIMEOUT || process.env.EXPO_PUBLIC_SOCKET_PING_TIMEOUT || '60000'),
  pingInterval: parseInt(Constants.expoConfig?.extra?.EXPO_PUBLIC_SOCKET_PING_INTERVAL || process.env.EXPO_PUBLIC_SOCKET_PING_INTERVAL || '25000'),
};

const isDevelopment = __DEV__;
const isAPK = !__DEV__;

interface DebugInfo {
  socketStatus: any;
  environment: any;
  connectionTest: any;
  recommendations: string[];
}

export default function ConnectionDebugger() {
  const [isVisible, setIsVisible] = useState(false);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const runDebug = async () => {
    setIsLoading(true);
    try {
      // Get current socket status
      const socketStatus = getDetailedConnectionStatus();
      
      // Get environment info
      const environment = {
        isDevelopment,
        isAPK,
        socketUrl: socketConfig.url,
        socketConfig
      };

      // Test connection
      const connectionTest = await testConnection('debug_user', 'customer');

      // Generate recommendations
      const recommendations = [];
      
      if (!socketStatus.socketExists) {
        recommendations.push('Socket instance does not exist');
      }
      
      if (!socketStatus.connected) {
        recommendations.push('Socket is not connected');
      }
      
      if (!connectionTest) {
        recommendations.push('Connection test failed');
      }
      
      if (isAPK && !__DEV__) {
        recommendations.push('Running in APK build mode');
      }

      setDebugInfo({
        socketStatus,
        environment,
        connectionTest,
        recommendations
      });
    } catch (error) {
      console.error('Debug failed:', error);
      Alert.alert('Debug Error', 'Failed to run debug: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForceReconnect = async () => {
    try {
      setIsLoading(true);
      // This would need the getToken function from auth context
      Alert.alert('Reconnect', 'Force reconnect functionality requires auth token');
    } catch (error) {
      Alert.alert('Reconnect Error', 'Failed to force reconnect: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isVisible) {
    return (
      <TouchableOpacity 
        style={styles.debugButton} 
        onPress={() => setIsVisible(true)}
      >
        <Ionicons name="bug" size={20} color="white" />
        <Text style={styles.debugButtonText}>Debug</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Connection Debugger</Text>
        <TouchableOpacity onPress={() => setIsVisible(false)}>
          <Ionicons name="close" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <TouchableOpacity 
            style={[styles.button, isLoading && styles.buttonDisabled]} 
            onPress={runDebug}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Running...' : 'Run Debug'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.buttonSecondary]} 
            onPress={handleForceReconnect}
          >
            <Text style={styles.buttonText}>Force Reconnect</Text>
          </TouchableOpacity>
        </View>

        {debugInfo && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Socket Status</Text>
              <Text style={styles.infoText}>
                Socket Exists: {debugInfo.socketStatus.socketExists ? 'Yes' : 'No'}
              </Text>
              <Text style={styles.infoText}>
                Connected: {debugInfo.socketStatus.connected ? 'Yes' : 'No'}
              </Text>
              <Text style={styles.infoText}>
                Connection State: {debugInfo.socketStatus.connectionState}
              </Text>
              <Text style={styles.infoText}>
                Is Connecting: {debugInfo.socketStatus.isConnecting ? 'Yes' : 'No'}
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Environment</Text>
              <Text style={styles.infoText}>
                Is Development: {debugInfo.environment.isDevelopment ? 'Yes' : 'No'}
              </Text>
              <Text style={styles.infoText}>
                Is APK: {debugInfo.environment.isAPK ? 'Yes' : 'No'}
              </Text>
              <Text style={styles.infoText}>
                Socket URL: {debugInfo.environment.socketUrl}
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Connection Test</Text>
              <Text style={styles.infoText}>
                Test Result: {debugInfo.connectionTest ? 'Success' : 'Failed'}
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recommendations</Text>
              {debugInfo.recommendations.map((rec, index) => (
                <Text key={index} style={styles.recommendationText}>
                  • {rec}
                </Text>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    right: 16,
    left: 16,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    maxHeight: 400,
    zIndex: 1001,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  button: {
    backgroundColor: Colors.success,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: Colors.warning || '#FFA500',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  infoText: {
    color: 'white',
    fontSize: 14,
    marginBottom: 4,
  },
  recommendationText: {
    color: 'white',
    fontSize: 14,
    marginBottom: 4,
    fontStyle: 'italic',
  },
  debugButton: {
    position: 'absolute',
    top: 100,
    right: 16,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 1000,
  },
  debugButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
});
