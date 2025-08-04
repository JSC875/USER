# Configuration System Guide

This guide explains how to use the robust configuration system for your React Native app with SpringBoot backend integration, Clerk authentication, Socket.IO, and Google Maps API.

## Overview

The configuration system provides:
- **Environment-specific configurations** (development, staging, production)
- **Type-safe configuration** with TypeScript interfaces
- **Automatic environment detection** based on build type
- **Environment variable overrides** for flexibility
- **Validation** to ensure required configuration is present
- **APK-specific optimizations** for production builds

## File Structure

```
src/config/
├── environment.ts              # Main configuration interface and exports
├── configManager.ts            # Configuration manager and initialization
└── environments/
    ├── development.ts          # Development environment config
    ├── staging.ts              # Staging environment config
    └── production.ts           # Production environment config
```

## Configuration Interface

The main configuration interface (`AppConfig`) includes:

```typescript
interface AppConfig {
  environment: Environment;
  isDevelopment: boolean;
  isProduction: boolean;
  isStaging: boolean;
  
  api: {
    baseUrl: string;
    timeout: number;
    retryAttempts: number;
    retryDelay: number;
  };
  
  socket: {
    url: string;
    timeout: number;
    reconnectionAttempts: number;
    reconnectionDelay: number;
    reconnectionDelayMax: number;
    pingTimeout: number;
    pingInterval: number;
  };
  
  clerk: {
    publishableKey: string;
    frontendApi: string;
  };
  
  googleMaps: {
    apiKey: string;
    androidApiKey: string;
    iosApiKey: string;
  };
  
  app: {
    name: string;
    version: string;
    buildNumber: string;
    bundleId: string;
  };
  
  platform: {
    isAndroid: boolean;
    isIOS: boolean;
    isWeb: boolean;
    isAPK: boolean;
  };
  
  features: {
    enableDebugLogs: boolean;
    enableAnalytics: boolean;
    enableCrashReporting: boolean;
    enablePerformanceMonitoring: boolean;
  };
}
```

## Usage

### Basic Usage

```typescript
import { config, apiConfig, socketConfig, clerkConfig } from '../config/environment';

// Use configuration
const apiUrl = apiConfig.baseUrl;
const socketUrl = socketConfig.url;
const clerkKey = clerkConfig.publishableKey;

// Check environment
if (config.isDevelopment) {
  console.log('Running in development mode');
}
```

### API Service Usage

```typescript
import { api } from '../services/api';
import { useAuth } from '@clerk/clerk-expo';

const { getToken } = useAuth();

// Make authenticated API calls
const response = await api.postAuth('/rides', rideData, getToken);

// Make public API calls
const healthCheck = await api.get('/health');
```

### Socket.IO Usage

```typescript
import { connectSocket, emitEvent } from '../utils/socket';

// Connect to socket
const socket = connectSocket(userId, 'customer');

// Emit events
emitEvent('request_ride', rideData);
```

## Environment Detection

The system automatically detects the environment based on:

1. **Explicit override**: `EXPO_PUBLIC_ENVIRONMENT` environment variable
2. **Build type**: `Constants.expoConfig.extra.environment`
3. **EAS build profile**: Based on EAS build configuration
4. **NODE_ENV**: Default fallback

### Environment Variables

You can override any configuration using environment variables:

```bash
# Environment
EXPO_PUBLIC_ENVIRONMENT=production

# API Configuration
EXPO_PUBLIC_API_URL=https://your-production-api.com
EXPO_PUBLIC_API_TIMEOUT=30000
EXPO_PUBLIC_API_RETRY_ATTEMPTS=3
EXPO_PUBLIC_API_RETRY_DELAY=1000

# Socket.IO Configuration
EXPO_PUBLIC_SOCKET_URL=https://your-production-socket.com
EXPO_PUBLIC_SOCKET_TIMEOUT=25000
EXPO_PUBLIC_SOCKET_RECONNECTION_ATTEMPTS=25
EXPO_PUBLIC_SOCKET_RECONNECTION_DELAY=1500
EXPO_PUBLIC_SOCKET_RECONNECTION_DELAY_MAX=8000
EXPO_PUBLIC_SOCKET_PING_TIMEOUT=60000
EXPO_PUBLIC_SOCKET_PING_INTERVAL=25000

# Clerk Authentication
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_your_production_key
EXPO_PUBLIC_CLERK_FRONTEND_API=https://your-production-clerk.accounts.dev

# Google Maps
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_production_maps_key
EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY=your_android_maps_key
EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY=your_ios_maps_key

# Feature Flags
EXPO_PUBLIC_ENABLE_DEBUG_LOGS=false
EXPO_PUBLIC_ENABLE_ANALYTICS=true
EXPO_PUBLIC_ENABLE_CRASH_REPORTING=true
EXPO_PUBLIC_ENABLE_PERFORMANCE_MONITORING=true
```

## Environment-Specific Configurations

### Development Environment

```typescript
// src/config/environments/development.ts
export const developmentConfig = {
  environment: 'development',
  api: {
    baseUrl: 'https://bike-taxi-development.up.railway.app',
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
  // ... other config
};
```

### Production Environment

```typescript
// src/config/environments/production.ts
export const productionConfig = {
  environment: 'production',
  api: {
    baseUrl: 'https://bike-taxi-production.up.railway.app',
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
  },
  socket: {
    url: 'https://socketio-roqet-production.up.railway.app',
    timeout: 25000,
    reconnectionAttempts: 25,
    reconnectionDelay: 1500,
    reconnectionDelayMax: 8000,
    pingTimeout: 60000,
    pingInterval: 25000,
  },
  // ... other config
};
```

## APK-Specific Optimizations

The system automatically detects APK builds and applies optimizations:

```typescript
// Socket.IO optimizations for APK
const socketOptions = {
  reconnectionAttempts: isProduction ? socketConfig.reconnectionAttempts * 2 : socketConfig.reconnectionAttempts,
  reconnectionDelay: isProduction ? socketConfig.reconnectionDelay * 1.5 : socketConfig.reconnectionDelay,
  timeout: isProduction ? socketConfig.timeout * 1.25 : socketConfig.timeout,
  // ... other optimizations
};
```

## Build Configuration

### app.json Configuration

Update your `app.json` to include environment-specific configurations:

```json
{
  "expo": {
    "extra": {
      "environment": "development",
      "EXPO_PUBLIC_API_URL": "https://bike-taxi-development.up.railway.app",
      "EXPO_PUBLIC_SOCKET_URL": "https://testsocketio-roqet.up.railway.app",
      "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY": "pk_test_your_key",
      "EXPO_PUBLIC_GOOGLE_MAPS_API_KEY": "your_maps_key"
    }
  }
}
```

### EAS Build Configuration

For EAS builds, you can specify different configurations per build profile:

```json
// eas.json
{
  "build": {
    "development": {
      "env": {
        "EXPO_PUBLIC_ENVIRONMENT": "development",
        "EXPO_PUBLIC_API_URL": "https://bike-taxi-development.up.railway.app"
      }
    },
    "staging": {
      "env": {
        "EXPO_PUBLIC_ENVIRONMENT": "staging",
        "EXPO_PUBLIC_API_URL": "https://bike-taxi-staging.up.railway.app"
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_ENVIRONMENT": "production",
        "EXPO_PUBLIC_API_URL": "https://bike-taxi-production.up.railway.app"
      }
    }
  }
}
```

## Validation

The configuration system validates that all required fields are present:

```typescript
// Required fields
const requiredFields = [
  'api.baseUrl',
  'socket.url',
  'clerk.publishableKey',
  'googleMaps.apiKey'
];
```

If any required field is missing, the system will throw an error during initialization.

## Testing

You can test different configurations:

```typescript
import { configManager } from '../config/configManager';

// Test with different environment
process.env.EXPO_PUBLIC_ENVIRONMENT = 'staging';
const stagingConfig = configManager.reload();

// Reset to development
process.env.EXPO_PUBLIC_ENVIRONMENT = 'development';
const devConfig = configManager.reload();
```

## Migration from Old Configuration

If you're migrating from the old configuration system:

1. **Update imports**: Replace direct environment variable access with config imports
2. **Update API calls**: Use the new API service instead of direct fetch calls
3. **Update Socket.IO**: The socket utility now uses the configuration system
4. **Update Clerk**: Use `clerkConfig.publishableKey` instead of direct env access

### Before (Old System)
```typescript
const apiUrl = process.env.EXPO_PUBLIC_API_URL;
const socketUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_SOCKET_URL;
```

### After (New System)
```typescript
import { apiConfig, socketConfig } from '../config/environment';

const apiUrl = apiConfig.baseUrl;
const socketUrl = socketConfig.url;
```

## Best Practices

1. **Never hardcode URLs or keys** in your code
2. **Use environment-specific configurations** for different build types
3. **Validate configuration** before using it
4. **Use the API service** for all HTTP requests
5. **Enable debug logs** only in development
6. **Use feature flags** to control functionality
7. **Test configurations** in different environments

## Troubleshooting

### Common Issues

1. **Missing configuration**: Check that all required environment variables are set
2. **Wrong environment**: Verify `EXPO_PUBLIC_ENVIRONMENT` is set correctly
3. **API connection issues**: Check `apiConfig.baseUrl` and network connectivity
4. **Socket connection issues**: Check `socketConfig.url` and server status

### Debug Configuration

```typescript
import { configManager } from '../config/configManager';

// Log current configuration
console.log('Current config:', configManager.getConfig());

// Check environment
console.log('Environment:', configManager.getEnvironment());

// Validate configuration
try {
  configManager.initialize();
  console.log('Configuration is valid');
} catch (error) {
  console.error('Configuration error:', error);
}
```

This configuration system provides a robust, type-safe, and environment-aware way to manage your app's configuration across different build types and environments. 