import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';
import AppNavigator from './src/navigation/AppNavigator';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Constants from 'expo-constants';


// Get configuration from Constants
const clerkConfig = {
  publishableKey: Constants.expoConfig?.extra?.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
  frontendApi: Constants.expoConfig?.extra?.EXPO_PUBLIC_CLERK_FRONTEND_API || process.env.EXPO_PUBLIC_CLERK_FRONTEND_API,
};

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

const tokenCache = {
  async getToken(key: string) {
    try {
      return SecureStore.getItemAsync(key);
    } catch (error) {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return SecureStore.setItemAsync(key, value);
    } catch (error) {
      return;
    }
  },
};

const publishableKey = clerkConfig.publishableKey;

// Debug logging for configuration
console.log('🔧 Clerk Configuration Debug:');
console.log('🔧 Constants.expoConfig?.extra?.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY:', Constants.expoConfig?.extra?.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY);
console.log('🔧 process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY:', process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY);
console.log('🔧 Final publishableKey:', publishableKey);
console.log('🔧 Constants.expoConfig?.extra:', Constants.expoConfig?.extra);

if (!publishableKey) {
  throw new Error(
    'Missing Publishable Key. Please check your environment configuration.'
  );
}

// Component to handle socket initialization
function SocketInitializer() {
  const { getToken, isLoaded } = useAuth();

  useEffect(() => {
    let isMounted = true;
    let initializationTimeout: ReturnType<typeof setTimeout> | null = null;

    const initializeSocket = async () => {
      try {
        log('🚀 App: Initializing socket connection on startup...');
        
        // Enhanced APK compatibility checks
        console.log('🔍 App: Checking authentication state...');
        console.log('🔍 App: isLoaded:', isLoaded);
        console.log('🔍 App: getToken type:', typeof getToken);
        console.log('🔍 App: Platform:', Platform.OS);
        console.log('🔍 App: __DEV__:', __DEV__);
        
        // Wait for auth to be loaded and give app time to fully initialize
        if (!isLoaded) {
          console.log('⏳ App: Waiting for authentication to load...');
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
        
        // Additional wait for the app to fully load
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check if component is still mounted
        if (!isMounted) {
          log('🚫 App: Component unmounted, skipping socket initialization');
          return;
        }
        
        // Validate getToken function before using it
        if (!getToken || typeof getToken !== 'function') {
          console.error('❌ App: getToken is not available or not a function');
          console.error('❌ App: This is common in APK builds - attempting fallback initialization');
          
          // For APK builds, we might need a different approach
          // Try to initialize socket without authentication initially
          const { testSocketConfiguration } = require('./src/utils/socket');
          const configTest = testSocketConfiguration();
          
          if (configTest) {
            console.log('✅ App: Socket configuration is valid, but authentication is not available');
            console.log('⚠️ App: Socket will be initialized when user logs in');
          } else {
            console.error('❌ App: Socket configuration is invalid');
          }
          return;
        }
        
        // Initialize socket connection
        const { initializeAPKConnection, startBackgroundRetry } = require('./src/utils/socket');
        await initializeAPKConnection(getToken);
        
        // Check if component is still mounted before starting background retry
        if (isMounted) {
          // Start background retry mechanism for APK builds
          startBackgroundRetry(getToken);
          log('✅ App: Socket connection initialized successfully');
        }
      } catch (error) {
        console.error('❌ App: Failed to initialize socket connection:', error);
        
        // Only show error to user if component is still mounted
        if (isMounted) {
          // Don't show error to user, let individual screens handle connection
          // But log it for debugging
          log('⚠️ App: Socket initialization failed, will retry on screen load');
        }
      }
    };

    // Set a timeout for socket initialization
    initializationTimeout = setTimeout(() => {
      if (isMounted) {
        log('⚠️ App: Socket initialization timeout, will retry on screen load');
      }
    }, 10000); // 10 second timeout

    initializeSocket();

    return () => {
      isMounted = false;
      if (initializationTimeout) {
        clearTimeout(initializationTimeout);
      }
    };
  }, [getToken]);

  return null;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ClerkProvider tokenCache={tokenCache} publishableKey={publishableKey}>
        <SafeAreaProvider>
          <StatusBar style="dark" backgroundColor="#ffffff" />
          <SocketInitializer />
          <AppNavigator />

        </SafeAreaProvider>
      </ClerkProvider>
    </GestureHandlerRootView>
  );
}
