import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../../constants/Colors';

interface PinDisplayProps {
  pin: string;
  onShare?: () => void;
  disabled?: boolean;
}

export default function PinDisplay({ pin, onShare, disabled = false }: PinDisplayProps) {
  const handleShare = () => {
    if (onShare && !disabled) {
      onShare();
    }
  };

  return (
    <TouchableOpacity 
      style={[styles.container, disabled && styles.disabled]} 
      onPress={handleShare}
      disabled={disabled}
    >
      <View style={styles.content}>
        <Text style={styles.shareText}>Share PIN</Text>
        <View style={styles.pinContainer}>
          {pin.split('').map((digit, index) => (
            <View key={index} style={styles.digitBox}>
              <Text style={styles.digitText}>{digit}</Text>
            </View>
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  disabled: {
    opacity: 0.6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shareText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
    marginRight: 16, // Add space between text and PIN
  },
  pinContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  digitBox: {
    width: 32,
    height: 32,
    backgroundColor: '#1e40af', // Darker blue for contrast
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  digitText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'System',
  },
});



