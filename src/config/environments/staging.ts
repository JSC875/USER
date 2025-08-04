// Staging environment configuration
export const stagingConfig = {
  environment: 'staging' as const,
  
  api: {
    baseUrl: 'https://bike-taxi-staging.up.railway.app', // Staging API
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
  },
  
  socket: {
    url: 'https://socketio-roqet-staging.up.railway.app', // Staging Socket.IO
    timeout: 22000,
    reconnectionAttempts: 20,
    reconnectionDelay: 1200,
    reconnectionDelayMax: 6000,
    pingTimeout: 60000,
    pingInterval: 25000,
  },
  
  clerk: {
    publishableKey: 'pk_test_YOUR_STAGING_CLERK_KEY', // Replace with staging key
    frontendApi: 'https://your-staging-clerk.accounts.dev',
  },
  
  googleMaps: {
    apiKey: 'AIzaSyDHN3SH_ODlqnHcU9Blvv2pLpnDNkg03lU', // Staging Maps API key
    androidApiKey: 'AIzaSyDHN3SH_ODlqnHcU9Blvv2pLpnDNkg03lU',
    iosApiKey: 'AIzaSyDHN3SH_ODlqnHcU9Blvv2pLpnDNkg03lU',
  },
  
  features: {
    enableDebugLogs: true,
    enableAnalytics: true,
    enableCrashReporting: true,
    enablePerformanceMonitoring: true,
  },
}; 