import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import OTPInput from '../../components/common/OTPInput';
import { 
  detectOTPCodes, 
  extractBestOTP, 
  clipboardContainsOTP,
  formatOTP 
} from '../../utils/otpUtils';

export default function OTPDemoScreen() {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [testResults, setTestResults] = useState<string[]>([]);

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const testOTPDetection = () => {
    const testCases = [
      'Your OTP is 123456',
      'Verification code: 789012',
      'Use code 345678 to verify',
      'OTP: 901234',
      '123456 is your verification code',
      'No OTP here',
      'Invalid: ABC123',
    ];

    addTestResult('=== OTP Detection Test ===');
    testCases.forEach(testCase => {
      const detected = detectOTPCodes(testCase);
      addTestResult(`"${testCase}" -> [${detected.join(', ')}]`);
    });
  };

  const testClipboardOTP = async () => {
    try {
      const clipboardContent = await Clipboard.getStringAsync();
      if (clipboardContent) {
        const hasOTP = clipboardContainsOTP(clipboardContent, 6);
        const bestOTP = extractBestOTP(clipboardContent, 6);
        addTestResult(`Clipboard content: "${clipboardContent}"`);
        addTestResult(`Contains OTP: ${hasOTP}`);
        addTestResult(`Best OTP: ${bestOTP || 'None'}`);
      } else {
        addTestResult('Clipboard is empty');
      }
    } catch (error) {
      addTestResult(`Error reading clipboard: ${error}`);
    }
  };

  const setTestOTP = (code: string) => {
    const newOtp = new Array(6).fill('');
    for (let i = 0; i < Math.min(code.length, 6); i++) {
      newOtp[i] = code[i];
    }
    setOtp(newOtp);
    addTestResult(`Test OTP set: ${code}`);
  };

  const clearTestResults = () => {
    setTestResults([]);
  };

  const handleOtpComplete = (otpString: string) => {
    addTestResult(`OTP completed: ${otpString}`);
    Alert.alert('OTP Complete', `OTP entered: ${otpString}`);
  };

  const copyTestOTP = async (code: string) => {
    try {
      await Clipboard.setStringAsync(code);
      addTestResult(`Test OTP copied to clipboard: ${code}`);
      Alert.alert('Copied', `Test OTP "${code}" copied to clipboard. Now try the "Paste OTP" button!`);
    } catch (error) {
      addTestResult(`Error copying to clipboard: ${error}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>OTP Auto-fill Demo</Text>
          <Text style={styles.subtitle}>
            Test the OTP auto-fill functionality with various scenarios
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>OTP Input</Text>
          <OTPInput
            length={6}
            value={otp}
            onChange={setOtp}
            onComplete={handleOtpComplete}
            autoFocus={true}
            showPasteButton={true}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Controls</Text>
          
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.button} onPress={testOTPDetection}>
              <Ionicons name="search" size={20} color={Colors.white} />
              <Text style={styles.buttonText}>Test Detection</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.button} onPress={testClipboardOTP}>
              <Ionicons name="clipboard" size={20} color={Colors.white} />
              <Text style={styles.buttonText}>Check Clipboard</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={styles.smallButton} 
              onPress={() => copyTestOTP('123456')}
            >
              <Text style={styles.smallButtonText}>Copy 123456</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.smallButton} 
              onPress={() => copyTestOTP('789012')}
            >
              <Text style={styles.smallButtonText}>Copy 789012</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.smallButton} 
              onPress={() => copyTestOTP('Your OTP is 345678')}
            >
              <Text style={styles.smallButtonText}>Copy with text</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={styles.smallButton} 
              onPress={() => setTestOTP('111111')}
            >
              <Text style={styles.smallButtonText}>Set 111111</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.smallButton} 
              onPress={() => setTestOTP('')}
            >
              <Text style={styles.smallButtonText}>Clear</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.smallButton} 
              onPress={clearTestResults}
            >
              <Text style={styles.smallButtonText}>Clear Logs</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Results</Text>
          <View style={styles.logContainer}>
            {testResults.length === 0 ? (
              <Text style={styles.noLogsText}>No test results yet. Run some tests above!</Text>
            ) : (
              testResults.map((result, index) => (
                <Text key={index} style={styles.logText}>
                  {result}
                </Text>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: Layout.spacing.lg,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: Layout.fontSize.xxl,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Layout.spacing.sm,
  },
  subtitle: {
    fontSize: Layout.fontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    padding: Layout.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sectionTitle: {
    fontSize: Layout.fontSize.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Layout.spacing.md,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Layout.spacing.md,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.lg,
    borderRadius: Layout.borderRadius.md,
    marginHorizontal: Layout.spacing.xs,
  },
  buttonText: {
    color: Colors.white,
    fontWeight: '600',
    marginLeft: Layout.spacing.xs,
  },
  smallButton: {
    flex: 1,
    backgroundColor: Colors.gray100,
    paddingVertical: Layout.spacing.sm,
    paddingHorizontal: Layout.spacing.md,
    borderRadius: Layout.borderRadius.sm,
    marginHorizontal: Layout.spacing.xs,
    alignItems: 'center',
  },
  smallButtonText: {
    color: Colors.text,
    fontWeight: '500',
    fontSize: Layout.fontSize.sm,
  },
  logContainer: {
    backgroundColor: Colors.gray50,
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    minHeight: 200,
  },
  noLogsText: {
    color: Colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  logText: {
    color: Colors.text,
    fontSize: Layout.fontSize.sm,
    fontFamily: 'monospace',
    marginBottom: Layout.spacing.xs,
  },
});

