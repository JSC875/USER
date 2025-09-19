
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import LottieView from 'lottie-react-native';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';

interface LoadingSpinnerProps {
  size?: 'small' | 'large' | 'tiny';
  text?: string;
  overlay?: boolean;
  color?: string;
}

export default function LoadingSpinner({
  size = 'large',
  text,
  overlay = false,
  color = Colors.primary,
}: LoadingSpinnerProps) {
  const containerStyle = overlay ? styles.overlayContainer : styles.container;
  
  // For tiny size, use ActivityIndicator instead of Lottie
  if (size === 'tiny') {
    return (
      <ActivityIndicator 
        size="small" 
        color={color} 
        style={styles.tinySpinner}
      />
    );
  }

  const animationSize = size === 'small' ? 60 : 120;

  return (
    <View style={containerStyle}>
      <LottieView
        source={require('../../../assets/lottie/loader.json')}
        autoPlay
        loop
        style={[styles.animation, { width: animationSize, height: animationSize }]}
      />
      {text && <Text style={styles.text}>{text}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Layout.spacing.lg,
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  animation: {
    alignSelf: 'center',
  },
  text: {
    marginTop: Layout.spacing.md,
    fontSize: Layout.fontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  tinySpinner: {
    margin: 0,
  },
});
