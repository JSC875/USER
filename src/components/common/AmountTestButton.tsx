import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import { debugAmountConversion, ensureAmountInPaise, convertPaiseToRupees } from '../../utils/razorpay';

interface AmountTestButtonProps {
  testAmount: number;
  label: string;
}

export default function AmountTestButton({ testAmount, label }: AmountTestButtonProps) {
  const handleTest = () => {
    console.log(`🧪 Testing amount: ${testAmount}`);
    // For test buttons, we need to determine if the amount is already in paise
    // If it's a large number like 7300, assume it's already in paise
    const isAlreadyInPaise = testAmount > 1000;
    debugAmountConversion(testAmount, isAlreadyInPaise);
    
    const convertedAmount = ensureAmountInPaise(testAmount, isAlreadyInPaise);
    const rupees = convertPaiseToRupees(convertedAmount);
    
    Alert.alert(
      'Amount Conversion Test',
      `Original: ${testAmount}\nConverted (paise): ${convertedAmount}\nConverted (rupees): ${rupees}\n\nCheck console for detailed logs.`,
      [{ text: 'OK' }]
    );
  };

  return (
    <TouchableOpacity style={styles.button} onPress={handleTest}>
      <Text style={styles.buttonText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: Layout.spacing.sm,
    paddingHorizontal: Layout.spacing.md,
    borderRadius: Layout.borderRadius.sm,
    marginVertical: Layout.spacing.xs,
  },
  buttonText: {
    color: Colors.white,
    fontSize: Layout.fontSize.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
});
