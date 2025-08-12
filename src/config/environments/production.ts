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
    url: 'https://testsocketio-roqet.up.railway.app', // Production Socket.IO
    timeout: 45000, // Increased timeout for APK builds
    reconnectionAttempts: 50, // More reconnection attempts for APK
    reconnectionDelay: 2000, // Slower initial reconnection for stability
    reconnectionDelayMax: 15000, // Longer max delay for stability
    pingTimeout: 120000, // Longer ping timeout for APK
    pingInterval: 15000, // More frequent pings for APK
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