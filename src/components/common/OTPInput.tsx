import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import { extractBestOTP, clipboardContainsOTP } from '../../utils/otpUtils';

interface OTPInputProps {
  length: number;
  value: string[];
  onChange: (value: string[]) => void;
  onComplete?: (value: string) => void;
  autoFocus?: boolean;
  showPasteButton?: boolean;
}

export default function OTPInput({
  length,
  value,
  onChange,
  onComplete,
  autoFocus = true,
  showPasteButton = true,
}: OTPInputProps) {
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const [isListening, setIsListening] = useState(false);

  // Auto-focus first input on mount
  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [autoFocus]);

  // Listen for clipboard changes to detect OTP
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (Platform.OS === 'android') {
      // On Android, we'll check clipboard periodically since we can't listen to changes directly
      interval = setInterval(async () => {
        try {
          const clipboardContent = await Clipboard.getStringAsync();
          if (clipboardContent) {
            const otpCode = extractBestOTP(clipboardContent, length);
            if (otpCode && !isListening) {
              console.log('OTP detected in clipboard:', otpCode);
              
              // Fill the OTP inputs
              const newOtp = new Array(length).fill('');
              for (let i = 0; i < Math.min(otpCode.length, length); i++) {
                newOtp[i] = otpCode[i];
              }
              
              onChange(newOtp);
              
              // Focus the next empty input or the last one
              const nextEmptyIndex = newOtp.findIndex(digit => !digit);
              const focusIndex = nextEmptyIndex >= 0 ? nextEmptyIndex : length - 1;
              inputRefs.current[focusIndex]?.focus();
              
              // Clear clipboard after auto-fill
              await Clipboard.setStringAsync('');
              
              // Call onComplete if all digits are filled
              if (newOtp.every(digit => digit !== '')) {
                onComplete?.(newOtp.join(''));
              }
            }
          }
        } catch (error) {
          console.log('Error checking clipboard:', error);
        }
      }, 1000); // Check every second
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [length, onChange, onComplete, isListening]);

  const handleOtpChange = useCallback((value: string, index: number) => {
    const newOtp = [...value];
    
    // Handle single digit input
    if (value.length === 1) {
      newOtp[index] = value;
      
      // Auto-focus next input
      if (value && index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    } else if (value.length > 1) {
      // Handle paste operation - extract digits only
      const digits = value.replace(/\D/g, '').split('');
      
      // Fill the current and subsequent inputs
      for (let i = 0; i < Math.min(digits.length, length - index); i++) {
        newOtp[index + i] = digits[i];
      }
      
      // Focus the next empty input or the last one
      const nextEmptyIndex = newOtp.findIndex(digit => !digit);
      const focusIndex = nextEmptyIndex >= 0 ? nextEmptyIndex : length - 1;
      inputRefs.current[focusIndex]?.focus();
    }
    
    onChange(newOtp);
    
    // Call onComplete if all digits are filled
    if (newOtp.every(digit => digit !== '')) {
      onComplete?.(newOtp.join(''));
    }
  }, [length, onChange, onComplete]);

  const handleKeyPress = useCallback((key: string, index: number) => {
    if (key === 'Backspace' && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }, [value]);

  const handlePasteOTP = async () => {
    try {
      const clipboardContent = await Clipboard.getStringAsync();
      if (clipboardContent) {
        const otpCode = extractBestOTP(clipboardContent, length);
        if (otpCode) {
          console.log('Pasting OTP from clipboard:', otpCode);
          
          // Fill the OTP inputs
          const newOtp = new Array(length).fill('');
          for (let i = 0; i < Math.min(otpCode.length, length); i++) {
            newOtp[i] = otpCode[i];
          }
          
          onChange(newOtp);
          
          // Focus the next empty input or the last one
          const nextEmptyIndex = newOtp.findIndex(digit => !digit);
          const focusIndex = nextEmptyIndex >= 0 ? nextEmptyIndex : length - 1;
          inputRefs.current[focusIndex]?.focus();
          
          // Clear clipboard after paste
          await Clipboard.setStringAsync('');
          
          // Call onComplete if all digits are filled
          if (newOtp.every(digit => digit !== '')) {
            onComplete?.(newOtp.join(''));
          }
          
          Alert.alert('Success', 'OTP pasted successfully!');
        } else {
          Alert.alert('No OTP Found', `No ${length}-digit OTP code found in clipboard. Please copy the OTP from your SMS and try again.`);
        }
      } else {
        Alert.alert('Clipboard Empty', 'Clipboard is empty. Please copy the OTP from your SMS and try again.');
      }
    } catch (error) {
      console.error('Error pasting OTP:', error);
      Alert.alert('Error', 'Failed to paste OTP. Please try again.');
    }
  };

  const handleInputFocus = useCallback((index: number) => {
    // Highlight the current input
    inputRefs.current[index]?.setNativeProps({
      style: { borderColor: Colors.primary, borderWidth: 2 }
    });
  }, []);

  const handleInputBlur = useCallback((index: number) => {
    // Reset border style
    inputRefs.current[index]?.setNativeProps({
      style: { borderColor: Colors.border, borderWidth: 1 }
    });
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.otpContainer}>
        {Array.from({ length }, (_, index) => (
          <TextInput
            key={index}
            ref={(ref) => {
              inputRefs.current[index] = ref;
            }}
            style={[
              styles.otpInput,
              value[index] && styles.otpInputFilled,
            ]}
            value={value[index]}
            onChangeText={(text) => handleOtpChange(text, index)}
            onKeyPress={({ nativeEvent }) =>
              handleKeyPress(nativeEvent.key, index)
            }
            onFocus={() => handleInputFocus(index)}
            onBlur={() => handleInputBlur(index)}
            keyboardType="number-pad"
            maxLength={length}
            textAlign="center"
            selectTextOnFocus
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
          />
        ))}
      </View>
      
      {showPasteButton && (
        <TouchableOpacity style={styles.pasteButton} onPress={handlePasteOTP}>
          <Ionicons name="clipboard-outline" size={20} color={Colors.primary} />
          <Text style={styles.pasteButtonText}>Paste OTP</Text>
        </TouchableOpacity>
      )}
      
      <Text style={styles.helpText}>
        💡 Tip: Copy the {length}-digit OTP from your SMS and tap "Paste OTP" or it will auto-fill automatically
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Layout.spacing.lg,
    width: '100%',
  },
  otpInput: {
    width: 50,
    height: 50,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Layout.borderRadius.md,
    fontSize: Layout.fontSize.lg,
    fontWeight: '600',
    color: Colors.text,
    backgroundColor: Colors.gray50,
  },
  otpInputFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.white,
  },
  pasteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Layout.spacing.md,
  },
  pasteButtonText: {
    fontSize: Layout.fontSize.md,
    color: Colors.primary,
    fontWeight: '600',
    marginLeft: Layout.spacing.xs,
  },
  helpText: {
    fontSize: Layout.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: Layout.spacing.md,
  },
});
