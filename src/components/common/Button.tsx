
import React, { useRef, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Animated,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import LoadingSpinner from './LoadingSpinner';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
  hapticFeedback?: boolean;
  pressScale?: number;
  shadowEnabled?: boolean;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style,
  textStyle,
  fullWidth = false,
  hapticFeedback = true,
  pressScale = 0.96,
  shadowEnabled = true,
}: ButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shadowAnim = useRef(new Animated.Value(shadowEnabled ? 4 : 0)).current;
  const loadingOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (loading) {
      Animated.timing(loadingOpacity, {
        toValue: 0.7,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(loadingOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [loading]);

  const handlePressIn = () => {
    if (disabled || loading) return;
    
    // Haptic feedback
    if (hapticFeedback && Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    // Scale animation
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: pressScale,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.timing(shadowAnim, {
        toValue: shadowEnabled ? 2 : 0,
        duration: 150,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    if (disabled || loading) return;
    
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.timing(shadowAnim, {
        toValue: shadowEnabled ? 4 : 0,
        duration: 150,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handlePress = () => {
    if (disabled || loading) return;
    
    // Success haptic feedback
    if (hapticFeedback && Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    onPress();
  };
  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: Layout.borderRadius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      overflow: 'hidden',
    };

    // Size styles
    switch (size) {
      case 'sm':
        baseStyle.paddingVertical = Layout.spacing.sm;
        baseStyle.paddingHorizontal = Layout.spacing.md;
        baseStyle.minHeight = 36;
        break;
      case 'lg':
        baseStyle.paddingVertical = Layout.spacing.lg;
        baseStyle.paddingHorizontal = Layout.spacing.xl;
        baseStyle.minHeight = 56;
        break;
      default:
        baseStyle.paddingVertical = Layout.spacing.md;
        baseStyle.paddingHorizontal = Layout.spacing.lg;
        baseStyle.minHeight = 48;
    }

    // Variant styles
    switch (variant) {
      case 'secondary':
        baseStyle.backgroundColor = Colors.secondary;
        break;
      case 'outline':
        baseStyle.backgroundColor = 'transparent';
        baseStyle.borderWidth = 2;
        baseStyle.borderColor = Colors.primary;
        break;
      case 'ghost':
        baseStyle.backgroundColor = 'transparent';
        break;
      default:
        baseStyle.backgroundColor = Colors.primary;
    }

    // Disabled state
    if (disabled || loading) {
      baseStyle.opacity = 0.6;
    }

    // Full width
    if (fullWidth) {
      baseStyle.width = '100%';
    }

    return baseStyle;
  };

  const getTextStyle = (): TextStyle => {
    const baseTextStyle: TextStyle = {
      fontWeight: '600',
      textAlign: 'center',
    };

    // Size styles
    switch (size) {
      case 'sm':
        baseTextStyle.fontSize = Layout.fontSize.sm;
        break;
      case 'lg':
        baseTextStyle.fontSize = Layout.fontSize.lg;
        break;
      default:
        baseTextStyle.fontSize = Layout.fontSize.md;
    }

    // Variant styles
    switch (variant) {
      case 'outline':
        baseTextStyle.color = Colors.primary;
        break;
      case 'ghost':
        baseTextStyle.color = Colors.primary;
        break;
      default:
        baseTextStyle.color = Colors.white;
    }

    return baseTextStyle;
  };

  return (
    <View>
      <Animated.View
        style={[
          {
            shadowColor: variant === 'primary' ? Colors.primary : Colors.shadow,
            shadowOffset: {
              width: 0,
              height: shadowAnim,
            },
            shadowOpacity: shadowEnabled ? 0.3 : 0,
            shadowRadius: shadowAnim,
            elevation: shadowEnabled ? shadowAnim : 0,
          },
        ]}
      >
        <Animated.View
          style={[
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <TouchableOpacity
            style={[getButtonStyle(), style]}
            onPress={handlePress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={disabled || loading}
            activeOpacity={1}
          >
            <Animated.View
              style={[
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: loadingOpacity,
                },
              ]}
            >
              {loading && (
                <Animated.View
                  style={{
                    marginRight: Layout.spacing.sm,
                    opacity: loadingOpacity,
                  }}
                >
                  <LoadingSpinner size="tiny" color={variant === 'primary' ? Colors.white : Colors.primary} />
                </Animated.View>
              )}
              <Text style={[getTextStyle(), textStyle]}>{title}</Text>
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </View>
  );
}
