import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { config, isDevelopment, isProduction, isStaging } from '../../config/environment';

interface ConfigurationStatusProps {
  showDetails?: boolean;
}

export const ConfigurationStatus: React.FC<ConfigurationStatusProps> = ({ 
  showDetails = false 
}) => {
  if (!isDevelopment && !showDetails) {
    return null; // Don't show in production unless explicitly requested
  }

  const getEnvironmentColor = () => {
    if (isProduction) return '#ff4444';
    if (isStaging) return '#ffaa00';
    return '#44ff44';
  };

  const getEnvironmentName = () => {
    if (isProduction) return 'PRODUCTION';
    if (isStaging) return 'STAGING';
    return 'DEVELOPMENT';
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Configuration Status</Text>
        <View style={[styles.environmentBadge, { backgroundColor: getEnvironmentColor() }]}>
          <Text style={styles.environmentText}>{getEnvironmentName()}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Environment</Text>
        <Text style={styles.text}>Environment: {config.environment}</Text>
        <Text style={styles.text}>Platform: {config.platform.isAndroid ? 'Android' : config.platform.isIOS ? 'iOS' : 'Web'}</Text>
        <Text style={styles.text}>APK Build: {config.platform.isAPK ? 'Yes' : 'No'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>API Configuration</Text>
        <Text style={styles.text}>Base URL: {config.api.baseUrl}</Text>
        <Text style={styles.text}>Timeout: {config.api.timeout}ms</Text>
        <Text style={styles.text}>Retry Attempts: {config.api.retryAttempts}</Text>
        <Text style={styles.text}>Retry Delay: {config.api.retryDelay}ms</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Socket.IO Configuration</Text>
        <Text style={styles.text}>URL: {config.socket.url}</Text>
        <Text style={styles.text}>Timeout: {config.socket.timeout}ms</Text>
        <Text style={styles.text}>Reconnection Attempts: {config.socket.reconnectionAttempts}</Text>
        <Text style={styles.text}>Reconnection Delay: {config.socket.reconnectionDelay}ms</Text>
        <Text style={styles.text}>Ping Timeout: {config.socket.pingTimeout}ms</Text>
        <Text style={styles.text}>Ping Interval: {config.socket.pingInterval}ms</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Clerk Authentication</Text>
        <Text style={styles.text}>Publishable Key: {config.clerk.publishableKey.substring(0, 20)}...</Text>
        <Text style={styles.text}>Frontend API: {config.clerk.frontendApi || 'Not set'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Google Maps</Text>
        <Text style={styles.text}>API Key: {config.googleMaps.apiKey.substring(0, 20)}...</Text>
        <Text style={styles.text}>Android API Key: {config.googleMaps.androidApiKey.substring(0, 20)}...</Text>
        <Text style={styles.text}>iOS API Key: {config.googleMaps.iosApiKey.substring(0, 20)}...</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Information</Text>
        <Text style={styles.text}>Name: {config.app.name}</Text>
        <Text style={styles.text}>Version: {config.app.version}</Text>
        <Text style={styles.text}>Build Number: {config.app.buildNumber}</Text>
        <Text style={styles.text}>Bundle ID: {config.app.bundleId}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Feature Flags</Text>
        <Text style={styles.text}>Debug Logs: {config.features.enableDebugLogs ? 'Enabled' : 'Disabled'}</Text>
        <Text style={styles.text}>Analytics: {config.features.enableAnalytics ? 'Enabled' : 'Disabled'}</Text>
        <Text style={styles.text}>Crash Reporting: {config.features.enableCrashReporting ? 'Enabled' : 'Disabled'}</Text>
        <Text style={styles.text}>Performance Monitoring: {config.features.enablePerformanceMonitoring ? 'Enabled' : 'Disabled'}</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  environmentBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  environmentText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  section: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  text: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
});

export default ConfigurationStatus;