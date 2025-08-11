import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { developmentConfig } from './environments/development';
import { productionConfig } from './environments/production';
import { stagingConfig } from './environments/staging';
import type { AppConfig, Environment } from './environment';

// Conditional logging function
const log = (message: string, data?: any) => {
  if (__DEV__) {
    if (data) {
      console.log(message, data);
    } else {
      console.log(message);
    }
  }
};

// Configuration manager class
class ConfigManager {
  private config: AppConfig | null = null;
  private environment: Environment = 'development';

  // Get environment from various sources
  private getEnvironment(): Environment {
    const env = process.env.EXPO_PUBLIC_ENVIRONMENT || process.env.NODE_ENV || 'development';
    
    switch (env.toLowerCase()) {
      case 'production':
        return 'production';
      case 'staging':
        return 'staging';
      case 'development':
      default:
        return 'development';
    }
  }

  // Load environment-specific configuration
  private loadEnvironmentConfig(): Partial<AppConfig> {
    const env = this.getEnvironment();
    this.environment = env;

    switch (env) {
      case 'production':
        return productionConfig;
      case 'staging':
        return stagingConfig;
      case 'development':
      default:
        return developmentConfig;
    }
  }

  // Merge with environment variables and Constants
  private mergeWithEnvVars(baseConfig: Partial<AppConfig>): AppConfig {
    const getValue = (key: string, fallback?: string): string => {
      return Constants.expoConfig?.extra?.[key] || process.env[key] || fallback || '';
    };

    const isDevelopment = this.environment === 'development';
    const isProduction = this.environment === 'production';
    const isStaging = this.environment === 'staging';

    return {
      environment: this.environment,
      isDevelopment,
      isProduction,
      isStaging,

      api: {
        baseUrl: getValue('EXPO_PUBLIC_API_URL', baseConfig.api?.baseUrl || ''),
        timeout: parseInt(getValue('EXPO_PUBLIC_API_TIMEOUT', baseConfig.api?.timeout?.toString() || '30000')),
        retryAttempts: parseInt(getValue('EXPO_PUBLIC_API_RETRY_ATTEMPTS', baseConfig.api?.retryAttempts?.toString() || '3')),
        retryDelay: parseInt(getValue('EXPO_PUBLIC_API_RETRY_DELAY', baseConfig.api?.retryDelay?.toString() || '1000')),
      },

      socket: {
        url: getValue('EXPO_PUBLIC_SOCKET_URL', baseConfig.socket?.url || ''),
        timeout: parseInt(getValue('EXPO_PUBLIC_SOCKET_TIMEOUT', baseConfig.socket?.timeout?.toString() || '20000')),
        reconnectionAttempts: parseInt(getValue('EXPO_PUBLIC_SOCKET_RECONNECTION_ATTEMPTS', baseConfig.socket?.reconnectionAttempts?.toString() || '15')),
        reconnectionDelay: parseInt(getValue('EXPO_PUBLIC_SOCKET_RECONNECTION_DELAY', baseConfig.socket?.reconnectionDelay?.toString() || '1000')),
        reconnectionDelayMax: parseInt(getValue('EXPO_PUBLIC_SOCKET_RECONNECTION_DELAY_MAX', baseConfig.socket?.reconnectionDelayMax?.toString() || '5000')),
        pingTimeout: parseInt(getValue('EXPO_PUBLIC_SOCKET_PING_TIMEOUT', baseConfig.socket?.pingTimeout?.toString() || '60000')),
        pingInterval: parseInt(getValue('EXPO_PUBLIC_SOCKET_PING_INTERVAL', baseConfig.socket?.pingInterval?.toString() || '25000')),
      },

      clerk: {
        publishableKey: getValue('EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY', baseConfig.clerk?.publishableKey || ''),
        frontendApi: getValue('EXPO_PUBLIC_CLERK_FRONTEND_API', baseConfig.clerk?.frontendApi || ''),
      },

      googleMaps: {
        apiKey: getValue('EXPO_PUBLIC_GOOGLE_MAPS_API_KEY', baseConfig.googleMaps?.apiKey || ''),
        androidApiKey: getValue('EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY', baseConfig.googleMaps?.androidApiKey || baseConfig.googleMaps?.apiKey || ''),
        iosApiKey: getValue('EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY', baseConfig.googleMaps?.iosApiKey || baseConfig.googleMaps?.apiKey || ''),
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
        enableDebugLogs: isDevelopment || getValue('EXPO_PUBLIC_ENABLE_DEBUG_LOGS') === 'true',
        enableAnalytics: isProduction || getValue('EXPO_PUBLIC_ENABLE_ANALYTICS') === 'true',
        enableCrashReporting: isProduction || getValue('EXPO_PUBLIC_ENABLE_CRASH_REPORTING') === 'true',
        enablePerformanceMonitoring: isProduction || getValue('EXPO_PUBLIC_ENABLE_PERFORMANCE_MONITORING') === 'true',
      },
    };
  }

  // Validate configuration
  private validateConfig(config: AppConfig): void {
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
        if (value === undefined || value === null || value === '') {
          missingFields.push(field);
          break;
        }
      }
    });

    if (missingFields.length > 0) {
      const errorMessage = `Missing required configuration fields: ${missingFields.join(', ')}`;
      console.error('❌ Configuration validation failed:', errorMessage);
      console.error('❌ Current configuration:', config);
      throw new Error(errorMessage);
    }
  }

  // Initialize configuration
  initialize(): AppConfig {
    if (this.config) {
      return this.config;
    }

    try {
      // Load environment-specific config
      const envConfig = this.loadEnvironmentConfig();

      // Merge with environment variables
      const mergedConfig = this.mergeWithEnvVars(envConfig);

      // Validate configuration
      this.validateConfig(mergedConfig);

      this.config = mergedConfig;

      // Log configuration in development
      if (this.config.isDevelopment) {
        log('🔧 Configuration loaded:', {
          environment: this.config.environment,
          api: { baseUrl: this.config.api.baseUrl },
          socket: { url: this.config.socket.url },
          clerk: { publishableKey: this.config.clerk.publishableKey.substring(0, 20) + '...' },
          googleMaps: { apiKey: this.config.googleMaps.apiKey.substring(0, 20) + '...' },
          platform: this.config.platform,
          features: this.config.features,
        });
      }

      return this.config;
    } catch (error) {
      console.error('❌ Failed to initialize configuration:', error);
      
      // Provide fallback configuration for critical errors
      if (error instanceof Error && error.message.includes('Missing required configuration fields')) {
        console.warn('⚠️ Using fallback configuration due to missing required fields');
        const fallbackConfig: AppConfig = {
          environment: 'development',
          isDevelopment: true,
          isProduction: false,
          isStaging: false,
          api: {
            baseUrl: 'https://bike-taxi-production.up.railway.app',
            timeout: 30000,
            retryAttempts: 3,
            retryDelay: 1000,
          },
          socket: {
            url: 'https://testsocketio-roqet.up.railway.app',
            timeout: 20000,
            reconnectionAttempts: 15,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            pingTimeout: 60000,
            pingInterval: 25000,
          },
          clerk: {
            publishableKey: 'pk_test_dXNlZnVsLWZsYW1pbmdvLTQxLmNsZXJrLmFjY291bnRzLmRldiQ',
            frontendApi: '',
          },
          googleMaps: {
            apiKey: 'AIzaSyDHN3SH_ODlqnHcU9Blvv2pLpnDNkg03lU',
            androidApiKey: 'AIzaSyDHN3SH_ODlqnHcU9Blvv2pLpnDNkg03lU',
            iosApiKey: 'AIzaSyDHN3SH_ODlqnHcU9Blvv2pLpnDNkg03lU',
          },
          app: {
            name: 'Roqet-app',
            version: '1.0.0',
            buildNumber: '1',
            bundleId: 'com.roqet.roqetapp',
          },
          platform: {
            isAndroid: false,
            isIOS: false,
            isWeb: false,
            isAPK: false,
          },
          features: {
            enableDebugLogs: true,
            enableAnalytics: false,
            enableCrashReporting: false,
            enablePerformanceMonitoring: false,
          },
        };
        
        this.config = fallbackConfig;
        return this.config;
      }
      
      throw error;
    }
  }

  // Get current configuration
  getConfig(): AppConfig {
    if (!this.config) {
      return this.initialize();
    }
    return this.config;
  }

  // Get environment
  getEnvironment(): Environment {
    return this.environment;
  }

  // Reload configuration (useful for testing)
  reload(): AppConfig {
    this.config = null;
    return this.initialize();
  }

  // Check if configuration is initialized
  isInitialized(): boolean {
    return this.config !== null;
  }
}

// Create singleton instance
export const configManager = new ConfigManager();

// Export convenience functions
export const getConfig = () => configManager.getConfig();
export const getEnvironment = () => configManager.getEnvironment();
export const initializeConfig = () => configManager.initialize();

export default configManager; 