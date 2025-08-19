import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useNotifications } from '../../store/NotificationContext';
import NotificationTestService, { TestNotificationResult } from '../../services/notificationTestService';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';

const NotificationTest: React.FC = () => {
  const { initializeNotifications, scheduleLocalNotification } = useNotifications();
  const [testResults, setTestResults] = useState<TestNotificationResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const testService = NotificationTestService.getInstance();

  const handleInitializeNotifications = async () => {
    try {
      await initializeNotifications();
      Alert.alert('Success', 'Notifications initialized successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to initialize notifications');
    }
  };

  const handleTestPermissions = async () => {
    const result = await testService.testPermissions();
    setTestResults([result]);
    Alert.alert(
      result.success ? 'Success' : 'Error',
      result.message,
      [{ text: 'OK' }]
    );
  };

  const handleTestPushToken = async () => {
    const result = await testService.testPushToken();
    setTestResults([result]);
    if (result.success && result.data?.token) {
      Alert.alert(
        'Success',
        `Push token obtained: ${result.data.token.substring(0, 20)}...`,
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert('Error', result.message);
    }
  };

  const handleTestImmediateNotification = async () => {
    const result = await testService.testImmediateNotification();
    setTestResults([result]);
    Alert.alert(
      result.success ? 'Success' : 'Error',
      result.message,
      [{ text: 'OK' }]
    );
  };

  const handleTestDelayedNotification = async () => {
    const result = await testService.testDelayedNotification();
    setTestResults([result]);
    Alert.alert(
      result.success ? 'Success' : 'Error',
      'Delayed notification scheduled! Check in 5 seconds.',
      [{ text: 'OK' }]
    );
  };

  const handleTestRideNotifications = async () => {
    const results = await testService.testRideNotifications();
    setTestResults(results);
    Alert.alert(
      'Success',
      `Scheduled ${results.length} ride notifications!`,
      [{ text: 'OK' }]
    );
  };

  const handleTestPaymentNotifications = async () => {
    const results = await testService.testPaymentNotifications();
    setTestResults(results);
    Alert.alert(
      'Success',
      `Scheduled ${results.length} payment notifications!`,
      [{ text: 'OK' }]
    );
  };

  const handleTestPromoNotifications = async () => {
    const results = await testService.testPromoNotifications();
    setTestResults(results);
    Alert.alert(
      'Success',
      `Scheduled ${results.length} promotional notifications!`,
      [{ text: 'OK' }]
    );
  };

  const handleTestChatNotifications = async () => {
    const results = await testService.testChatNotifications();
    setTestResults(results);
    Alert.alert(
      'Success',
      `Scheduled ${results.length} chat notifications!`,
      [{ text: 'OK' }]
    );
  };

  const handleRunFullTestSuite = async () => {
    setIsRunning(true);
    try {
      const results = await testService.runFullTestSuite();
      const allResults = [
        results.permissions,
        results.pushToken,
        results.immediate,
        results.delayed,
        ...results.rideNotifications,
        ...results.paymentNotifications,
        ...results.promoNotifications,
        ...results.chatNotifications
      ];
      setTestResults(allResults);
      
      const successCount = allResults.filter(r => r.success).length;
      const totalCount = allResults.length;
      
      Alert.alert(
        'Test Suite Complete',
        `${successCount}/${totalCount} tests passed!`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to run test suite');
    } finally {
      setIsRunning(false);
    }
  };

  const handleCancelAllNotifications = async () => {
    const result = await testService.cancelAllNotifications();
    setTestResults([result]);
    Alert.alert(
      result.success ? 'Success' : 'Error',
      result.message,
      [{ text: 'OK' }]
    );
  };

  const handleGetScheduledNotifications = async () => {
    const result = await testService.getScheduledNotifications();
    setTestResults([result]);
    Alert.alert(
      result.success ? 'Success' : 'Error',
      result.message,
      [{ text: 'OK' }]
    );
  };

  const renderTestResult = (result: TestNotificationResult, index: number) => (
    <View key={index} style={[styles.resultItem, { backgroundColor: result.success ? Colors.success : Colors.error }]}>
      <Text style={styles.resultText}>
        {result.success ? '✅' : '❌'} {result.message}
      </Text>
      {result.error && (
        <Text style={styles.errorText}>Error: {result.error}</Text>
      )}
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🔔 Notification Testing</Text>
      
      {/* Basic Tests */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Basic Tests</Text>
        
        <TouchableOpacity style={styles.button} onPress={handleInitializeNotifications}>
          <Text style={styles.buttonText}>Initialize Notifications</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleTestPermissions}>
          <Text style={styles.buttonText}>Test Permissions</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleTestPushToken}>
          <Text style={styles.buttonText}>Test Push Token</Text>
        </TouchableOpacity>
      </View>

      {/* Local Notification Tests */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Local Notifications</Text>
        
        <TouchableOpacity style={styles.button} onPress={handleTestImmediateNotification}>
          <Text style={styles.buttonText}>Immediate Notification</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleTestDelayedNotification}>
          <Text style={styles.buttonText}>Delayed Notification (5s)</Text>
        </TouchableOpacity>
      </View>

      {/* App-Specific Tests */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App-Specific Tests</Text>
        
        <TouchableOpacity style={styles.button} onPress={handleTestRideNotifications}>
          <Text style={styles.buttonText}>Test Ride Notifications</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleTestPaymentNotifications}>
          <Text style={styles.buttonText}>Test Payment Notifications</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleTestPromoNotifications}>
          <Text style={styles.buttonText}>Test Promo Notifications</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleTestChatNotifications}>
          <Text style={styles.buttonText}>Test Chat Notifications</Text>
        </TouchableOpacity>
      </View>

      {/* Management */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Management</Text>
        
        <TouchableOpacity style={styles.button} onPress={handleGetScheduledNotifications}>
          <Text style={styles.buttonText}>Get Scheduled Notifications</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleCancelAllNotifications}>
          <Text style={styles.buttonText}>Cancel All Notifications</Text>
        </TouchableOpacity>
      </View>

      {/* Full Test Suite */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Comprehensive Testing</Text>
        
        <TouchableOpacity 
          style={[styles.button, styles.fullTestButton, isRunning && styles.disabledButton]} 
          onPress={handleRunFullTestSuite}
          disabled={isRunning}
        >
          <Text style={styles.buttonText}>
            {isRunning ? 'Running Tests...' : 'Run Full Test Suite'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Test Results */}
      {testResults.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Results</Text>
          {testResults.map(renderTestResult)}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Layout.spacing.lg,
    backgroundColor: Colors.white,
  },
  title: {
    fontSize: Layout.fontSize.xl,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Layout.spacing.lg,
    textAlign: 'center',
  },
  section: {
    marginBottom: Layout.spacing.lg,
  },
  sectionTitle: {
    fontSize: Layout.fontSize.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Layout.spacing.md,
  },
  button: {
    backgroundColor: Colors.primary,
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    marginBottom: Layout.spacing.sm,
  },
  fullTestButton: {
    backgroundColor: Colors.success,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.white,
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
    textAlign: 'center',
  },
  resultItem: {
    padding: Layout.spacing.sm,
    borderRadius: Layout.borderRadius.sm,
    marginBottom: Layout.spacing.xs,
  },
  resultText: {
    color: Colors.white,
    fontSize: Layout.fontSize.sm,
    fontWeight: '500',
  },
  errorText: {
    color: Colors.white,
    fontSize: Layout.fontSize.xs,
    marginTop: Layout.spacing.xs,
    fontStyle: 'italic',
  },
});

export default NotificationTest;
