import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { Layout } from '../constants/Layout';
import OTPInput from '../components/common/OTPInput';
import Button from '../components/common/Button';

export default function OTPTestScreen({ navigation }: { navigation: any }) {
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleOTPComplete = (otpString: string) => {
    console.log('OTP completed:', otpString);
    Alert.alert('OTP Complete', `You entered: ${otpString}`);
  };

  const handleVerifyOTP = () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      setError('Please enter complete OTP');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    // Simulate verification
    setTimeout(() => {
      setIsLoading(false);
      if (otpString === '123456') {
        Alert.alert('Success', 'OTP verified successfully!');
      } else {
        setError('Invalid OTP. Try 123456');
      }
    }, 2000);
  };

  const handleClearOTP = () => {
    setOtp(['', '', '', '', '', '']);
    setError('');
  };

  const handleFillTestOTP = () => {
    setOtp(['1', '2', '3', '4', '5', '6']);
    setError('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>OTP Verification Test</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.subtitle}>
            Test the OTP input with both manual entry and copy-paste functionality
          </Text>

          <View style={styles.testSection}>
            <Text style={styles.sectionTitle}>Manual Entry</Text>
            <Text style={styles.description}>
              Type each digit manually or use the number pad
            </Text>
            
            <OTPInput
              length={6}
              value={otp}
              onChange={setOtp}
              onComplete={handleOTPComplete}
              autoFocus={true}
              showPasteButton={true}
              error={!!error}
              disabled={isLoading}
            />
            
            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}
          </View>

          <View style={styles.testSection}>
            <Text style={styles.sectionTitle}>Copy-Paste Test</Text>
            <Text style={styles.description}>
              Copy this OTP: <Text style={styles.otpText}>123456</Text> and paste it using the "Paste OTP" button
            </Text>
            
            <View style={styles.testButtons}>
              <Button
                title="Fill Test OTP (123456)"
                onPress={handleFillTestOTP}
                variant="secondary"
                style={styles.testButton}
              />
              <Button
                title="Clear OTP"
                onPress={handleClearOTP}
                variant="secondary"
                style={styles.testButton}
              />
            </View>
          </View>

          <View style={styles.testSection}>
            <Text style={styles.sectionTitle}>Verification</Text>
            <Text style={styles.description}>
              Click verify to test the OTP validation (correct OTP is 123456)
            </Text>
            
            <Button
              title="Verify OTP"
              onPress={handleVerifyOTP}
              loading={isLoading}
              disabled={otp.join('').length !== 6}
              fullWidth
              style={styles.verifyButton}
            />
          </View>

          <View style={styles.featuresList}>
            <Text style={styles.featuresTitle}>Features Demonstrated:</Text>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
              <Text style={styles.featureText}>Manual digit entry with auto-focus</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
              <Text style={styles.featureText}>Copy-paste from clipboard</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
              <Text style={styles.featureText}>Auto-detection of OTP from SMS</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
              <Text style={styles.featureText}>Real-time validation</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
              <Text style={styles.featureText}>Visual feedback and animations</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
              <Text style={styles.featureText}>Error handling and user feedback</Text>
            </View>
          </View>
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
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    marginRight: Layout.spacing.md,
    padding: Layout.spacing.sm,
  },
  title: {
    fontSize: Layout.fontSize.xl,
    fontWeight: 'bold',
    color: Colors.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.lg,
  },
  subtitle: {
    fontSize: Layout.fontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Layout.spacing.xl,
    lineHeight: 22,
  },
  testSection: {
    backgroundColor: Colors.white,
    borderRadius: Layout.borderRadius.lg,
    padding: Layout.spacing.lg,
    marginBottom: Layout.spacing.lg,
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: Layout.fontSize.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Layout.spacing.sm,
  },
  description: {
    fontSize: Layout.fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Layout.spacing.lg,
    lineHeight: 20,
  },
  otpText: {
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: Colors.primary,
    backgroundColor: Colors.gray50,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  testButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Layout.spacing.md,
  },
  testButton: {
    flex: 1,
    marginHorizontal: Layout.spacing.xs,
  },
  verifyButton: {
    marginTop: Layout.spacing.md,
  },
  errorText: {
    color: Colors.error,
    textAlign: 'center',
    marginTop: Layout.spacing.sm,
    fontSize: Layout.fontSize.sm,
  },
  featuresList: {
    backgroundColor: Colors.white,
    borderRadius: Layout.borderRadius.lg,
    padding: Layout.spacing.lg,
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featuresTitle: {
    fontSize: Layout.fontSize.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Layout.spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Layout.spacing.sm,
  },
  featureText: {
    fontSize: Layout.fontSize.sm,
    color: Colors.textSecondary,
    marginLeft: Layout.spacing.sm,
    flex: 1,
  },
});
