import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import { runConnectionTest, quickTest } from '../../utils/socketTest';
import { runAutocompleteTest, quickAutocompleteTest } from '../../utils/autocompleteTest';
import NotificationTest from '../../components/common/NotificationTest';

interface TestResult {
  test: string;
  success: boolean;
  message: string;
  details?: any;
  timestamp: string;
}

interface ConnectionTestResults {
  serverReachable: TestResult;
  socketConnection: TestResult;
  eventCommunication: TestResult;
  transportType: TestResult;
  overall: TestResult;
}

interface AutocompleteTestResults {
  apiKeyCheck: TestResult;
  placesApi: TestResult;
  geocodingApi: TestResult;
  placeDetailsApi: TestResult;
  overall: TestResult;
}

export default function ConnectionTestScreen({ navigation }: any) {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<ConnectionTestResults | null>(null);
  const [quickResult, setQuickResult] = useState<any>(null);
  const [autocompleteResults, setAutocompleteResults] = useState<AutocompleteTestResults | null>(null);
  const [quickAutocompleteResult, setQuickAutocompleteResult] = useState<any>(null);

  const runFullTest = async () => {
    setIsRunning(true);
    try {
      const testResults = await runConnectionTest();
      setResults(testResults);
      
      // Show alert with overall result
      const overall = testResults.overall;
      Alert.alert(
        'Test Complete',
        `${overall.message}\n\n${overall.success ? '✅ All tests passed!' : '❌ Some tests failed. Check console for details.'}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Test Error', 'Failed to run connection test');
    } finally {
      setIsRunning(false);
    }
  };

  const runQuickTest = async () => {
    setIsRunning(true);
    try {
      const result = await quickTest();
      setQuickResult(result);
      
      Alert.alert(
        'Quick Test Complete',
        `Server: ${result.serverReachable ? '✅' : '❌'}\nSocket: ${result.socketConnected ? '✅' : '❌'}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Quick Test Error', 'Failed to run quick test');
    } finally {
      setIsRunning(false);
    }
  };

  const runAutocompleteFullTest = async () => {
    setIsRunning(true);
    try {
      const testResults = await runAutocompleteTest();
      setAutocompleteResults(testResults);
      
      // Show alert with overall result
      const overall = testResults.overall;
      Alert.alert(
        'Autocomplete Test Complete',
        `${overall.message}\n\n${overall.success ? '✅ All autocomplete features working!' : '❌ Some autocomplete features failed. Check console for details.'}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Test Error', 'Failed to run autocomplete test');
    } finally {
      setIsRunning(false);
    }
  };

  const runAutocompleteQuickTest = async () => {
    setIsRunning(true);
    try {
      const result = await quickAutocompleteTest();
      setQuickAutocompleteResult(result);
    } catch (error) {
      Alert.alert('Quick Test Error', 'Failed to run quick autocomplete test');
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (success: boolean) => {
    return success ? '✅' : '❌';
  };

  const getStatusColor = (success: boolean) => {
    return success ? Colors.success : Colors.error;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Connection Test</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Test Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.testButton, styles.quickButton]}
            onPress={runQuickTest}
            disabled={isRunning}
          >
            <Ionicons name="flash" size={24} color={Colors.white} />
            <Text style={styles.buttonText}>Quick Test</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.testButton, styles.fullButton]}
            onPress={runFullTest}
            disabled={isRunning}
          >
            <Ionicons name="analytics" size={24} color={Colors.white} />
            <Text style={styles.buttonText}>Full Test</Text>
          </TouchableOpacity>
        </View>

        {/* Autocomplete Test Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.testButton, styles.quickButton]}
            onPress={runAutocompleteQuickTest}
            disabled={isRunning}
          >
            <Ionicons name="location" size={24} color={Colors.white} />
            <Text style={styles.buttonText}>Auto Test</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.testButton, styles.fullButton]}
            onPress={runAutocompleteFullTest}
            disabled={isRunning}
          >
            <Ionicons name="map" size={24} color={Colors.white} />
            <Text style={styles.buttonText}>Auto Full</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Test Results */}
        {quickResult && (
          <View style={styles.resultsContainer}>
            <Text style={styles.sectionTitle}>Quick Test Results</Text>
            <View style={styles.resultCard}>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Server Reachable:</Text>
                <Text style={[styles.resultValue, { color: getStatusColor(quickResult.serverReachable) }]}>
                  {getStatusIcon(quickResult.serverReachable)} {quickResult.serverReachable ? 'Yes' : 'No'}
                </Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Socket Connected:</Text>
                <Text style={[styles.resultValue, { color: getStatusColor(quickResult.socketConnected) }]}>
                  {getStatusIcon(quickResult.socketConnected)} {quickResult.socketConnected ? 'Yes' : 'No'}
                </Text>
              </View>
              {quickResult.error && (
                <Text style={styles.errorText}>Error: {quickResult.error}</Text>
              )}
            </View>
          </View>
        )}

        {/* Full Test Results */}
        {results && (
          <View style={styles.resultsContainer}>
            <Text style={styles.sectionTitle}>Full Test Results</Text>
            
            {/* Overall Result */}
            <View style={styles.resultCard}>
              <Text style={styles.overallTitle}>Overall Result</Text>
              <Text style={[styles.overallResult, { color: getStatusColor(results.overall.success) }]}>
                {getStatusIcon(results.overall.success)} {results.overall.message}
              </Text>
              {results.overall.details && (
                <Text style={styles.detailsText}>
                  Passed: {results.overall.details.passed}/{results.overall.details.total} ({results.overall.details.percentage}%)
                </Text>
              )}
            </View>

            {/* Individual Test Results */}
            {Object.entries(results).map(([key, result]) => {
              if (key === 'overall') return null;
              return (
                <View key={key} style={styles.resultCard}>
                  <Text style={styles.testTitle}>{result.test}</Text>
                  <Text style={[styles.testResult, { color: getStatusColor(result.success) }]}>
                    {getStatusIcon(result.success)} {result.message}
                  </Text>
                  {result.details && (
                    <Text style={styles.detailsText}>
                      {JSON.stringify(result.details, null, 2)}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Autocomplete Test Results */}
        {autocompleteResults && (
          <View style={styles.resultsContainer}>
            <Text style={styles.sectionTitle}>Autocomplete Test Results</Text>
            
            {/* Overall Result */}
            <View style={styles.resultCard}>
              <Text style={styles.overallTitle}>Overall Result</Text>
              <Text style={[styles.overallResult, { color: getStatusColor(autocompleteResults.overall.success) }]}>
                {getStatusIcon(autocompleteResults.overall.success)} {autocompleteResults.overall.message}
              </Text>
              {autocompleteResults.overall.details && (
                <Text style={styles.detailsText}>
                  Passed: {autocompleteResults.overall.details.passedTests}/{autocompleteResults.overall.details.totalTests} tests
                </Text>
              )}
            </View>

            {/* Individual Test Results */}
            {Object.entries(autocompleteResults).map(([key, result]) => {
              if (key === 'overall') return null;
              return (
                <View key={key} style={styles.resultCard}>
                  <Text style={styles.testTitle}>{result.test}</Text>
                  <Text style={[styles.testResult, { color: getStatusColor(result.success) }]}>
                    {getStatusIcon(result.success)} {result.message}
                  </Text>
                  {result.details && (
                    <Text style={styles.detailsText}>
                      {JSON.stringify(result.details, null, 2)}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Loading State */}
        {isRunning && (
          <View style={styles.loadingContainer}>
            <Ionicons name="sync" size={24} color={Colors.primary} style={styles.rotating} />
            <Text style={styles.loadingText}>Running tests...</Text>
          </View>
        )}

        {/* Notification Test */}
        <NotificationTest />

        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>Instructions</Text>
          <Text style={styles.instructionsText}>
            • Quick Test: Basic server and socket connectivity{'\n'}
            • Full Test: Comprehensive connection and event testing{'\n'}
            • Auto Test: Quick autocomplete functionality test{'\n'}
            • Auto Full: Comprehensive autocomplete API testing{'\n'}
            • Notification Test: Test push notifications{'\n'}
            • Check console logs for detailed information{'\n'}
            • Server URL: https://testsocketio-roqet.up.railway.app{'\n'}
            • Maps API: https://maps.googleapis.com
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backButton: {
    marginRight: Layout.spacing.md,
  },
  headerTitle: {
    fontSize: Layout.fontSize.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  content: {
    flex: 1,
    padding: Layout.spacing.lg,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Layout.spacing.lg,
  },
  testButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.lg,
    borderRadius: Layout.borderRadius.md,
    marginHorizontal: Layout.spacing.xs,
  },
  quickButton: {
    backgroundColor: Colors.primary,
  },
  fullButton: {
    backgroundColor: Colors.accent,
  },
  buttonText: {
    color: Colors.white,
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
    marginLeft: Layout.spacing.xs,
  },
  resultsContainer: {
    marginBottom: Layout.spacing.lg,
  },
  sectionTitle: {
    fontSize: Layout.fontSize.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Layout.spacing.md,
  },
  resultCard: {
    backgroundColor: Colors.white,
    padding: Layout.spacing.lg,
    borderRadius: Layout.borderRadius.md,
    marginBottom: Layout.spacing.sm,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  overallTitle: {
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Layout.spacing.xs,
  },
  overallResult: {
    fontSize: Layout.fontSize.lg,
    fontWeight: '600',
    marginBottom: Layout.spacing.xs,
  },
  testTitle: {
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Layout.spacing.xs,
  },
  testResult: {
    fontSize: Layout.fontSize.md,
    marginBottom: Layout.spacing.xs,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Layout.spacing.xs,
  },
  resultLabel: {
    fontSize: Layout.fontSize.md,
    color: Colors.text,
  },
  resultValue: {
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
  },
  detailsText: {
    fontSize: Layout.fontSize.sm,
    color: Colors.textSecondary,
    fontFamily: 'monospace',
  },
  errorText: {
    fontSize: Layout.fontSize.sm,
    color: Colors.error,
    marginTop: Layout.spacing.xs,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: Layout.spacing.lg,
  },
  loadingText: {
    fontSize: Layout.fontSize.md,
    color: Colors.textSecondary,
    marginTop: Layout.spacing.sm,
  },
  rotating: {
    transform: [{ rotate: '360deg' }],
  },
  instructionsContainer: {
    backgroundColor: Colors.gray50,
    padding: Layout.spacing.lg,
    borderRadius: Layout.borderRadius.md,
    marginTop: Layout.spacing.lg,
  },
  instructionsTitle: {
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Layout.spacing.sm,
  },
  instructionsText: {
    fontSize: Layout.fontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
}); 