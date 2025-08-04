// Production environment configuration
export const productionConfig = {
  environment: 'production' as const,
  
  api: {
    baseUrl: 'https://bike-taxi-production.up.railway.app', // Production API
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
  },
  
  socket: {
    url: 'https://socketio-roqet-production.up.railway.app', // Production Socket.IO
    timeout: 25000,
    reconnectionAttempts: 25,
    reconnectionDelay: 1500,
    reconnectionDelayMax: 8000,
    pingTimeout: 60000,
    pingInterval: 25000,
  },
  
  clerk: {
    publishableKey: 'pk_live_YOUR_PRODUCTION_CLERK_KEY', // Replace with production key
    frontendApi: 'https://your-production-clerk.accounts.dev',
  },
  
  googleMaps: {
    apiKey: 'AIzaSyDHN3SH_ODlqnHcU9Blvv2pLpnDNkg03lU', // Production Maps API key
    androidApiKey: 'AIzaSyDHN3SH_ODlqnHcU9Blvv2pLpnDNkg03lU',
    iosApiKey: 'AIzaSyDHN3SH_ODlqnHcU9Blvv2pLpnDNkg03lU',
  },
  
  features: {
    enableDebugLogs: false,
    enableAnalytics: true,
    enableCrashReporting: true,
    enablePerformanceMonitoring: true,
  },
}; 