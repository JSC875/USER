// Development environment configuration
export const developmentConfig = {
  environment: 'development' as const,
  
  api: {
    baseUrl: 'https://bike-taxi-development.up.railway.app', // Development API
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
  },
  
  socket: {
    url: 'https://testsocketio-roqet.up.railway.app', // Development Socket.IO
    timeout: 20000,
    reconnectionAttempts: 15,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    pingTimeout: 60000,
    pingInterval: 25000,
  },
  
  clerk: {
    publishableKey: 'pk_test_dXNlZnVsLWZsYW1pbmdvLTQxLmNsZXJrLmFjY291bnRzLmRldiQ',
    frontendApi: 'https://useful-flamingo-41.clerk.accounts.dev',
  },
  
  googleMaps: {
    apiKey: 'AIzaSyDHN3SH_ODlqnHcU9Blvv2pLpnDNkg03lU',
    androidApiKey: 'AIzaSyDHN3SH_ODlqnHcU9Blvv2pLpnDNkg03lU',
    iosApiKey: 'AIzaSyDHN3SH_ODlqnHcU9Blvv2pLpnDNkg03lU',
  },
  
  features: {
    enableDebugLogs: true,
    enableAnalytics: false,
    enableCrashReporting: false,
    enablePerformanceMonitoring: false,
  },
}; 