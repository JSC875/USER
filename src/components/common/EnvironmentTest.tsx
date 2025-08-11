import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Colors } from '../../constants/Colors';

interface EnvironmentInfo {
  socketUrl: string;
  clerkKey: string;
  apiUrl: string;
  googleMapsKey: string;
  razorpayKey: string;
  environment: string;
  isDevelopment: boolean;
  isAPK: boolean;
  constantsExtra: any;
}

export default function EnvironmentTest() {
  const [isVisible, setIsVisible] = useState(false);
  const [envInfo, setEnvInfo] = useState<EnvironmentInfo | null>(null);

  const testEnvironment = () => {
    const info: EnvironmentInfo = {
      socketUrl: Constants.expoConfig?.extra?.EXPO_PUBLIC_SOCKET_URL || process.env.EXPO_PUBLIC_SOCKET_URL || 'NOT_FOUND',
      clerkKey: Constants.expoConfig?.extra?.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || 'NOT_FOUND',
      apiUrl: Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_API_URL || 'NOT_FOUND',
      googleMapsKey: Constants.expoConfig?.extra?.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 'NOT_FOUND',
      razorpayKey: Constants.expoConfig?.extra?.EXPO_PUBLIC_RAZORPAY_LIVE_KEY || process.env.EXPO_PUBLIC_RAZORPAY_LIVE_KEY || 'NOT_FOUND',
      environment: Constants.expoConfig?.extra?.EXPO_PUBLIC_ENVIRONMENT || process.env.EXPO_PUBLIC_ENVIRONMENT || 'NOT_FOUND',
      isDevelopment: __DEV__,
      isAPK: !__DEV__,
      constantsExtra: Constants.expoConfig?.extra || 'NOT_FOUND'
    };
    
    setEnvInfo(info);
    console.log('🔧 Environment Test Results:', info);
  };

  if (!isVisible) {
    return (
      <TouchableOpacity 
        style={styles.testButton} 
        onPress={() => setIsVisible(true)}
      >
        <Ionicons name="settings" size={20} color="white" />
        <Text style={styles.testButtonText}>Env Test</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Environment Test</Text>
        <TouchableOpacity onPress={() => setIsVisible(false)}>
          <Ionicons name="close" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <TouchableOpacity 
          style={styles.button} 
          onPress={testEnvironment}
        >
          <Text style={styles.buttonText}>Test Environment</Text>
        </TouchableOpacity>

        {envInfo && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Environment Variables</Text>
            <Text style={styles.infoText}>
              Socket URL: {envInfo.socketUrl}
            </Text>
            <Text style={styles.infoText}>
              Clerk Key: {envInfo.clerkKey.substring(0, 20)}...
            </Text>
            <Text style={styles.infoText}>
              API URL: {envInfo.apiUrl}
            </Text>
            <Text style={styles.infoText}>
              Google Maps Key: {envInfo.googleMapsKey.substring(0, 20)}...
            </Text>
            <Text style={styles.infoText}>
              Razorpay Key: {envInfo.razorpayKey.substring(0, 20)}...
            </Text>
            <Text style={styles.infoText}>
              Environment: {envInfo.environment}
            </Text>
            <Text style={styles.infoText}>
              Is Development: {envInfo.isDevelopment ? 'Yes' : 'No'}
            </Text>
            <Text style={styles.infoText}>
              Is APK: {envInfo.isAPK ? 'Yes' : 'No'}
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Constants.expoConfig.extra</Text>
          <Text style={styles.infoText}>
            {JSON.stringify(Constants.expoConfig?.extra, null, 2)}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 150,
    right: 16,
    left: 16,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    maxHeight: 500,
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
    marginBottom: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  infoText: {
    color: 'white',
    fontSize: 12,
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  testButton: {
    position: 'absolute',
    top: 150,
    right: 16,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 1000,
  },
  testButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
});
