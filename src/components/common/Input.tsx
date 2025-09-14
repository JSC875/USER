import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInputProps,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import * as Haptics from 'expo-haptics';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  containerStyle?: any;
  leftElement?: React.ReactNode;
}

export default function Input({
  label,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  secureTextEntry,
  leftElement,
  ...props
}: InputProps) {
  const [isSecure, setIsSecure] = useState(secureTextEntry);
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(false);
  
  const focusAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const labelAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(focusAnim, {
      toValue: isFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isFocused]);

  useEffect(() => {
    if (error) {
      // Shake animation for error
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }
  }, [error]);

  useEffect(() => {
    Animated.timing(labelAnim, {
      toValue: isFocused || hasValue ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isFocused, hasValue]);

  const handleFocus = () => {
    setIsFocused(true);
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Animated.spring(scaleAnim, {
      toValue: 1.02,
      useNativeDriver: true,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const handleTextChange = (text: string) => {
    setHasValue(text.length > 0);
    if (props.onChangeText) {
      props.onChangeText(text);
    }
  };

  const toggleSecureEntry = () => {
    setIsSecure(!isSecure);
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [error ? Colors.error : Colors.border, error ? Colors.error : Colors.primary],
  });

  const shadowOpacity = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.1, 0.3],
  });

  const labelColor = labelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.textSecondary, Colors.primary],
  });

  const labelScale = labelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.9],
  });

  return (
    <Animated.View 
      style={[
        styles.container, 
        containerStyle,
        {
          transform: [
            { scale: scaleAnim },
            { translateX: shakeAnim }
          ]
        }
      ]}
    >
      {label && (
        <Animated.Text 
          style={[
            styles.label,
            {
              color: labelColor,
              transform: [{ scale: labelScale }],
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
        {leftElement ? (
          <View style={styles.leftElement}>{leftElement}</View>
        ) : leftIcon ? (
          <Animated.View
            style={{
              transform: [
                {
                  scale: focusAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.1],
                  }),
                },
              ],
            }}
          >
            <Ionicons
              name={leftIcon}
              size={Layout.iconSize.md}
              color={isFocused ? Colors.primary : Colors.gray400}
              style={styles.leftIcon}
            />
          </Animated.View>
        ) : null}
        <TextInput
          style={[styles.input, (leftIcon || leftElement) && styles.inputWithLeftIcon]}
          placeholderTextColor={Colors.gray400}
          secureTextEntry={isSecure}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChangeText={handleTextChange}
          {...props}
        />
        {secureTextEntry && (
          <TouchableOpacity onPress={toggleSecureEntry} style={styles.rightIcon}>
            <Ionicons
              name={isSecure ? 'eye-off' : 'eye'}
              size={Layout.iconSize.md}
              color={isFocused ? Colors.primary : Colors.gray400}
            />
          </TouchableOpacity>
        )}
        {rightIcon && !secureTextEntry && (
          <TouchableOpacity onPress={onRightIconPress} style={styles.rightIcon}>
            <Ionicons
              name={rightIcon}
              size={Layout.iconSize.md}
              color={isFocused ? Colors.primary : Colors.gray400}
            />
          </TouchableOpacity>
        )}
      </Animated.View>
      {error && (
        <Animated.View 
          style={[
            styles.errorContainer,
            {
              opacity: focusAnim,
            }
          ]}
        >
          <Ionicons name="alert-circle" size={16} color={Colors.error} />
          <Text style={styles.error}>{error}</Text>
        </Animated.View>
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
  input: {
    flex: 1,
    fontSize: Layout.fontSize.md,
    color: Colors.text,
    paddingVertical: Layout.spacing.sm,
    fontWeight: '500',
  },
  inputWithLeftIcon: {
    marginLeft: Layout.spacing.sm,
  },
  leftIcon: {
    marginRight: Layout.spacing.sm,
  },
  rightIcon: {
    padding: Layout.spacing.xs,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Layout.spacing.sm,
    paddingHorizontal: Layout.spacing.sm,
  },
  error: {
    fontSize: Layout.fontSize.sm,
    color: Colors.error,
    marginLeft: Layout.spacing.xs,
    fontWeight: '500',
  },
  leftElement: {
    marginRight: Layout.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
});
