import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { userApi } from '../../services/userService';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';

export const ApiLoggingTest: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { getToken } = useAuth();

  const testGetUserProfile = async () => {
    try {
      setIsLoading(true);
      
      console.log('🧪 === TESTING /api/users/me GET WITH DETAILED LOGGING ===');
      
      const profile = await userApi.getCurrentUser(getToken);
      
      console.log('✅ === GET REQUEST COMPLETED ===');
      
      Alert.alert(
        'GET Request Success',
        `Profile loaded successfully!\n\nCheck console for detailed logs including:\n• Base URL\n• Endpoint\n• Headers\n• Token info\n• Response data`,
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('❌ === GET REQUEST FAILED ===');
      Alert.alert('Error', 'GET request failed. Check console for detailed error logs.');
    } finally {
      setIsLoading(false);
    }
  };

  const testUpdateUserProfile = async () => {
    try {
      setIsLoading(true);
      
      console.log('🧪 === TESTING /api/users/me PUT WITH DETAILED LOGGING ===');
      
      const updateData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'testuser@example.com',
        phoneNumber: '+919876543210',
        dateOfBirth: '1990-01-01',
        gender: 'Other',
        emergencyContactName: 'Emergency Contact',
        emergencyContactPhone: '+919876543211',
        preferredLanguage: 'en'
      };
      
      const result = await userApi.updateUserProfile(updateData, getToken);
      
      console.log('✅ === PUT REQUEST COMPLETED ===');
      
      Alert.alert(
        'PUT Request Success',
        `Profile updated successfully!\n\nCheck console for detailed logs including:\n• Base URL\n• Endpoint\n• Headers\n• Token info\n• Request payload\n• Response data`,
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('❌ === PUT REQUEST FAILED ===');
      Alert.alert('Error', 'PUT request failed. Check console for detailed error logs.');
    } finally {
      setIsLoading(false);
    }
  };

  const showLoggingInfo = () => {
    Alert.alert(
      'Detailed API Logging',
      `This test will show detailed logs for /api/users/me endpoint including:

🔍 REQUEST LOGS:
• Base URL configuration
• Full endpoint URL
• HTTP method
• All request headers
• JWT token (first/last 10 chars)
• Request payload (for PUT)
• Timeout settings
• Retry configuration

📡 RESPONSE LOGS:
• HTTP status code
• Response headers
• Response data
• Response size
• Success/failure status

🔑 TOKEN INFO:
• Token length
• Token preview (first 20 + last 10 chars)
• User ID from JWT
• User type from JWT

Check your console/terminal for the detailed logs!`,
      [{ text: 'Got it!' }]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>API Logging Test</Text>
      <Text style={styles.subtitle}>Detailed logging for /api/users/me endpoint</Text>
      
      <TouchableOpacity style={styles.infoButton} onPress={showLoggingInfo}>
        <Text style={styles.infoButtonText}>ℹ️ View Logging Info</Text>
      </TouchableOpacity>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Test API Calls</Text>
        
        <TouchableOpacity
          style={[styles.button, styles.getButton, isLoading && styles.buttonDisabled]}
          onPress={testGetUserProfile}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Loading...' : '🔍 Test GET /api/users/me'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.putButton, isLoading && styles.buttonDisabled]}
          onPress={testUpdateUserProfile}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Updating...' : '📝 Test PUT /api/users/me'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What You'll See in Console</Text>
        
        <View style={styles.logExample}>
          <Text style={styles.logTitle}>🔧 API Configuration:</Text>
          <Text style={styles.logText}>• Base URL: https://your-api.com</Text>
          <Text style={styles.logText}>• Timeout: 30000ms</Text>
          <Text style={styles.logText}>• Retry attempts: 3</Text>
        </View>
        
        <View style={styles.logExample}>
          <Text style={styles.logTitle}>🔍 Request Details:</Text>
          <Text style={styles.logText}>• Full URL: https://your-api.com/api/users/me</Text>
          <Text style={styles.logText}>• Method: GET/PUT</Text>
          <Text style={styles.logText}>• Headers: All request headers</Text>
          <Text style={styles.logText}>• Token: eyJhbGciOiJSUzI1NiIs... (preview)</Text>
          <Text style={styles.logText}>• Payload: Request body (for PUT)</Text>
        </View>
        
        <View style={styles.logExample}>
          <Text style={styles.logTitle}>📡 Response Details:</Text>
          <Text style={styles.logText}>• Status: 200 OK</Text>
          <Text style={styles.logText}>• Response headers</Text>
          <Text style={styles.logText}>• Response data</Text>
          <Text style={styles.logText}>• Data size in characters</Text>
        </View>
      </View>
      
      <Text style={styles.note}>
        💡 Tip: Open your console/terminal to see all the detailed logs in real-time!
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: Layout.spacing.lg,
    backgroundColor: Colors.white,
  },
  title: {
    fontSize: Layout.fontSize.lg,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Layout.spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Layout.fontSize.md,
    color: Colors.textSecondary,
    marginBottom: Layout.spacing.lg,
    textAlign: 'center',
  },
  infoButton: {
    backgroundColor: Colors.info,
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.sm,
    marginBottom: Layout.spacing.lg,
    alignItems: 'center',
  },
  infoButtonText: {
    color: Colors.white,
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
  },
  section: {
    marginBottom: Layout.spacing.lg,
  },
  sectionTitle: {
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Layout.spacing.md,
  },
  button: {
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.sm,
    marginBottom: Layout.spacing.sm,
    alignItems: 'center',
  },
  getButton: {
    backgroundColor: Colors.primary,
  },
  putButton: {
    backgroundColor: Colors.accent,
  },
  buttonDisabled: {
    backgroundColor: Colors.gray400,
  },
  buttonText: {
    color: Colors.white,
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
  },
  logExample: {
    backgroundColor: Colors.gray50,
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.sm,
    marginBottom: Layout.spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  logTitle: {
    fontSize: Layout.fontSize.sm,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Layout.spacing.xs,
  },
  logText: {
    fontSize: Layout.fontSize.xs,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  note: {
    fontSize: Layout.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: Layout.spacing.lg,
    backgroundColor: Colors.gray50,
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.sm,
  },
});

export default ApiLoggingTest; 