import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Environment types
export type Environment = 'development' | 'staging' | 'production';

// Configuration interface
export interface AppConfig {
  // Environment
  environment: Environment;
  isDevelopment: boolean;
  isProduction: boolean;
  isStaging: boolean;
  
  // API Configuration
  api: {
    baseUrl: string;
    timeout: number;
    retryAttempts: number;
    retryDelay: number;
  };
  
  // Socket.IO Configuration
  socket: {
    url: string;
    timeout: number;
    reconnectionAttempts: number;
    reconnectionDelay: number;
    reconnectionDelayMax: number;
    pingTimeout: number;
    pingInterval: number;
  };
  
  // Clerk Authentication
  clerk: {
    publishableKey: string;
    frontendApi: string;
  };
  
  // Google Maps
  googleMaps: {
    apiKey: string;
    androidApiKey: string;
    iosApiKey: string;
  };
  
  // App Configuration
  app: {
    name: string;
    version: string;
    buildNumber: string;
    bundleId: string;
  };
  
  // Platform specific
  platform: {
    isAndroid: boolean;
    isIOS: boolean;
    isWeb: boolean;
    isAPK: boolean;
  };
  
  // Feature flags
  features: {
    enableDebugLogs: boolean;
    enableAnalytics: boolean;
    enableCrashReporting: boolean;
    enablePerformanceMonitoring: boolean;
  };
}

// Environment detection
const getEnvironment = (): Environment => {
  const env = process.env.NODE_ENV || 'development';
  
  // Check for explicit environment override
  if (process.env.EXPO_PUBLIC_ENVIRONMENT) {
    return process.env.EXPO_PUBLIC_ENVIRONMENT as Environment;
  }
  
  // Check for build type
  if (Constants.expoConfig?.extra?.environment) {
    return Constants.expoConfig.extra.environment as Environment;
  }
  
  // Default based on NODE_ENV
  switch (env) {
    case 'production':
      return 'production';
    case 'test':
      return 'staging'; // Map test to staging
    default:
      return 'development';
  }
};

// Configuration validation
const validateConfig = (config: Partial<AppConfig>): void => {
  const requiredFields = [
    'api.baseUrl',
    'socket.url',
    'clerk.publishableKey',
    'googleMaps.apiKey'
  ];
  
  const missingFields: string[] = [];
  
  requiredFields.forEach(field => {
    const keys = field.split('.');
    let value: any = config;
    
    for (const key of keys) {
      value = value?.[key];
      if (value === undefined || value === null) {
        missingFields.push(field);
        break;
      }
    }
  });
  
  if (missingFields.length > 0) {
    throw new Error(`Missing required configuration fields: ${missingFields.join(', ')}`);
  }
};

// Get configuration from environment variables and constants
const getConfigFromEnv = (): Partial<AppConfig> => {
  const environment = getEnvironment();
  const isDevelopment = environment === 'development';
  const isProduction = environment === 'production';
  const isStaging = environment === 'staging';
  
  // Get values from Constants.expoConfig.extra first, then fallback to process.env
  const getValue = (key: string, fallback?: string): string => {
    return Constants.expoConfig?.extra?.[key] || process.env[key] || fallback || '';
  };
  
  return {
    environment,
    isDevelopment,
    isProduction,
    isStaging,
    
    api: {
      baseUrl: getValue('EXPO_PUBLIC_API_URL', 'https://bike-taxi-production.up.railway.app'),
      timeout: parseInt(getValue('EXPO_PUBLIC_API_TIMEOUT', '30000')),
      retryAttempts: parseInt(getValue('EXPO_PUBLIC_API_RETRY_ATTEMPTS', '3')),
      retryDelay: parseInt(getValue('EXPO_PUBLIC_API_RETRY_DELAY', '1000')),
    },
    
    socket: {
      url: getValue('EXPO_PUBLIC_SOCKET_URL', 'https://testsocketio-roqet.up.railway.app'),
      timeout: parseInt(getValue('EXPO_PUBLIC_SOCKET_TIMEOUT', '20000')),
      reconnectionAttempts: parseInt(getValue('EXPO_PUBLIC_SOCKET_RECONNECTION_ATTEMPTS', '15')),
      reconnectionDelay: parseInt(getValue('EXPO_PUBLIC_SOCKET_RECONNECTION_DELAY', '1000')),
      reconnectionDelayMax: parseInt(getValue('EXPO_PUBLIC_SOCKET_RECONNECTION_DELAY_MAX', '5000')),
      pingTimeout: parseInt(getValue('EXPO_PUBLIC_SOCKET_PING_TIMEOUT', '60000')),
      pingInterval: parseInt(getValue('EXPO_PUBLIC_SOCKET_PING_INTERVAL', '25000')),
    },
    
    clerk: {
      publishableKey: getValue('EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY', 'pk_test_dXNlZnVsLWZsYW1pbmdvLTQxLmNsZXJrLmFjY291bnRzLmRldiQ'),
      frontendApi: getValue('EXPO_PUBLIC_CLERK_FRONTEND_API', ''),
    },
    
    googleMaps: {
      apiKey: getValue('EXPO_PUBLIC_GOOGLE_MAPS_API_KEY', 'AIzaSyDHN3SH_ODlqnHcU9Blvv2pLpnDNkg03lU'),
      androidApiKey: getValue('EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY', 'AIzaSyDHN3SH_ODlqnHcU9Blvv2pLpnDNkg03lU'),
      iosApiKey: getValue('EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY', 'AIzaSyDHN3SH_ODlqnHcU9Blvv2pLpnDNkg03lU'),
    },
    
    app: {
      name: Constants.expoConfig?.name || 'Roqet-app',
      version: Constants.expoConfig?.version || '1.0.0',
      buildNumber: Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode?.toString() || '1',
      bundleId: Constants.expoConfig?.android?.package || Constants.expoConfig?.ios?.bundleIdentifier || 'com.roqet.roqetapp',
    },
    
    platform: {
      isAndroid: Platform.OS === 'android',
      isIOS: Platform.OS === 'ios',
      isWeb: Platform.OS === 'web',
      isAPK: Platform.OS === 'android' && !__DEV__,
    },
    
    features: {
      enableDebugLogs: isDevelopment || process.env.EXPO_PUBLIC_ENABLE_DEBUG_LOGS === 'true',
      enableAnalytics: isProduction || process.env.EXPO_PUBLIC_ENABLE_ANALYTICS === 'true',
      enableCrashReporting: isProduction || process.env.EXPO_PUBLIC_ENABLE_CRASH_REPORTING === 'true',
      enablePerformanceMonitoring: isProduction || process.env.EXPO_PUBLIC_ENABLE_PERFORMANCE_MONITORING === 'true',
    },
  };
};

// Create and validate configuration
const createConfig = (): AppConfig => {
  const config = getConfigFromEnv();
  
  // Validate configuration
  validateConfig(config);
  
  return config as AppConfig;
};

// Import and initialize configuration manager
import { configManager } from './configManager';

// Initialize configuration
const config = configManager.initialize();

// Export the configuration
export { config };

// Export individual configuration sections for convenience
export const apiConfig = config.api;
export const socketConfig = config.socket;
export const clerkConfig = config.clerk;
export const googleMapsConfig = config.googleMaps;
export const appConfig = config.app;
export const platformConfig = config.platform;
export const featuresConfig = config.features;

// Helper functions
export const isDevelopment = config.isDevelopment;
export const isProduction = config.isProduction;
export const isStaging = config.isStaging;
export const isAPK = config.platform.isAPK;

export default config; 