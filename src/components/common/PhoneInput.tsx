import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Animated,
  TouchableOpacity,
  TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';

interface CountryItem {
  code: string;
  name: string;
  flag: string;
}

interface PhoneInputProps extends Omit<TextInputProps, 'onChangeText'> {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  country: CountryItem;
  error?: string;
  containerStyle?: any;
  onCountryPress?: () => void;
  showCountrySelector?: boolean;
}

export default function PhoneInput({
  label,
  value,
  onChangeText,
  country,
  error,
  containerStyle,
  onCountryPress,
  showCountrySelector = false,
  ...props
}: PhoneInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const focusAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const shakeAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(focusAnimation, {
      toValue: isFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isFocused]);

  useEffect(() => {
    const isValidPhone = value.length === 10 && /^\d+$/.test(value);
    setIsValid(isValidPhone);
    
    if (error) {
      // Shake animation for error
      Animated.sequence([
        Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnimation, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }
  }, [value, error]);

  const handleFocus = () => {
    setIsFocused(true);
    Animated.spring(scaleAnimation, {
      toValue: 1.02,
      useNativeDriver: true,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.spring(scaleAnimation, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const formatPhoneNumber = (text: string) => {
    // Remove all non-digits
    const cleaned = text.replace(/\D/g, '');
    // Limit to 10 digits
    const limited = cleaned.slice(0, 10);
    return limited;
  };

  const handleTextChange = (text: string) => {
    const formatted = formatPhoneNumber(text);
    onChangeText(formatted);
  };

  const borderColor = focusAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [error ? Colors.error : Colors.border, error ? Colors.error : Colors.primary],
  });

  const shadowOpacity = focusAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.1, 0.3],
  });

  const countryCodeScale = focusAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.05],
  });

  return (
    <Animated.View 
      style={[
        styles.container, 
        containerStyle,
        {
          transform: [
            { scale: scaleAnimation },
            { translateX: shakeAnimation }
          ]
        }
      ]}
    >
      {label && (
        <Animated.Text 
          style={[
            styles.label,
            {
              color: focusAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [Colors.textSecondary, Colors.primary],
              }),
            }
          ]}
        >
          {label}
        </Animated.Text>
      )}
      
      <Animated.View
        style={[
          styles.inputContainer,
          {
            borderColor,
            shadowOpacity,
            shadowColor: isFocused ? Colors.primary : Colors.shadow,
          },
        ]}
      >
        {/* Country Code Section */}
        <Animated.View 
          style={[
            styles.countryCodeContainer,
            {
              transform: [{ scale: countryCodeScale }],
            }
          ]}
        >
          <View style={styles.countryFlag}>
            <Text style={styles.flagText}>{country.flag}</Text>
          </View>
          <View style={styles.countryCode}>
            <Text style={styles.countryCodeText}>{country.code}</Text>
          </View>
          {showCountrySelector && (
            <TouchableOpacity onPress={onCountryPress} style={styles.dropdownButton}>
              <Ionicons 
                name="chevron-down" 
                size={16} 
                color={Colors.gray400} 
              />
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Phone Number Input */}
        <View style={styles.phoneInputContainer}>
          <TextInput
            style={styles.phoneInput}
            value={value}
            onChangeText={handleTextChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            keyboardType="phone-pad"
            maxLength={10}
            placeholder="Enter 10-digit number"
            placeholderTextColor={Colors.gray400}
            {...props}
          />
          
          {/* Validation Indicator */}
          {value.length > 0 && (
            <Animated.View
              style={[
                styles.validationIndicator,
                {
                  backgroundColor: isValid ? Colors.success : Colors.error,
                  opacity: focusAnimation,
                }
              ]}
            >
              <Ionicons
                name={isValid ? "checkmark" : "close"}
                size={12}
                color={Colors.white}
              />
            </Animated.View>
          )}
        </View>
      </Animated.View>

      {/* Character Counter */}
      <View style={styles.counterContainer}>
        <Text style={[
          styles.counterText,
          { color: value.length === 10 ? Colors.success : Colors.textSecondary }
        ]}>
          {value.length}/10
        </Text>
      </View>

      {/* Error Message */}
      {error && (
        <Animated.View 
          style={[
            styles.errorContainer,
            {
              opacity: focusAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 1],
              }),
            }
          ]}
        >
          <Ionicons name="alert-circle" size={16} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </Animated.View>
      )}

      {/* Helper Text */}
      {!error && value.length > 0 && value.length < 10 && (
        <Animated.Text 
          style={[
            styles.helperText,
            {
              opacity: focusAnimation,
            }
          ]}
        >
          Enter {10 - value.length} more digit{10 - value.length !== 1 ? 's' : ''}
        </Animated.Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Layout.spacing.lg,
  },
  label: {
    fontSize: Layout.fontSize.sm,
    fontWeight: '600',
    marginBottom: Layout.spacing.sm,
    marginLeft: Layout.spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderRadius: Layout.borderRadius.lg,
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowRadius: 8,
    elevation: 4,
  },
  countryCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderRadius: Layout.borderRadius.md,
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: Layout.spacing.xs,
    marginRight: Layout.spacing.sm,
  },
  countryFlag: {
    marginRight: Layout.spacing.xs,
  },
  flagText: {
    fontSize: 18,
  },
  countryCode: {
    marginRight: Layout.spacing.xs,
  },
  countryCodeText: {
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  dropdownButton: {
    padding: Layout.spacing.xs,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
    marginRight: Layout.spacing.sm,
  },
  phoneInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  phoneInput: {
    flex: 1,
    fontSize: Layout.fontSize.lg,
    fontWeight: '500',
    color: Colors.text,
    paddingVertical: Layout.spacing.sm,
  },
  validationIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Layout.spacing.sm,
  },
  counterContainer: {
    alignItems: 'flex-end',
    marginTop: Layout.spacing.xs,
  },
  counterText: {
    fontSize: Layout.fontSize.xs,
    fontWeight: '500',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Layout.spacing.sm,
    paddingHorizontal: Layout.spacing.sm,
  },
  errorText: {
    fontSize: Layout.fontSize.sm,
    color: Colors.error,
    marginLeft: Layout.spacing.xs,
    fontWeight: '500',
  },
  helperText: {
    fontSize: Layout.fontSize.sm,
    color: Colors.textSecondary,
    marginTop: Layout.spacing.sm,
    marginLeft: Layout.spacing.sm,
    fontStyle: 'italic',
  },
});
