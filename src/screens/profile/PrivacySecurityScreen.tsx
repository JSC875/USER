import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, TITLE_COLOR } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';

export default function PrivacySecurityScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={24} color={TITLE_COLOR} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy & Security</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Your Privacy Matters</Text>
        <Text style={styles.text}>
          We are committed to protecting your privacy and ensuring the security of your personal information. This section explains how we handle your data and keep it safe.
        </Text>
        <Text style={styles.sectionTitle}>1. Data Collection</Text>
        <Text style={styles.text}>
          We collect only the information necessary to provide you with our services, such as your name, contact details, and ride history. We do not sell or share your personal data with third parties for marketing purposes.
        </Text>
        <Text style={styles.sectionTitle}>2. Data Security</Text>
        <Text style={styles.text}>
          Your data is stored securely using industry-standard encryption and security practices. We regularly review our security measures to protect your information from unauthorized access.
        </Text>
        <Text style={styles.sectionTitle}>3. User Controls</Text>
        <Text style={styles.text}>
          You have control over your personal information. You can update your details, manage your privacy settings, and request data deletion at any time from your profile settings.
        </Text>
        <Text style={styles.sectionTitle}>4. Permissions</Text>
        <Text style={styles.text}>
          The app may request permissions such as location access to enhance your experience. You can manage these permissions in your device settings.
        </Text>
        <Text style={styles.sectionTitle}>5. Contact Us</Text>
        <Text style={styles.text}>
          If you have any questions or concerns about your privacy or data security, please contact our support team.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.spacing.lg,
    paddingTop: Layout.spacing.xl,
    paddingBottom: Layout.spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: Layout.fontSize.xl,
    fontWeight: 'bold',
    color: TITLE_COLOR,
  },
  content: {
    flex: 1,
    paddingHorizontal: Layout.spacing.lg,
  },
  scrollContent: {
    paddingBottom: Layout.spacing.xl,
  },
  sectionTitle: {
    fontSize: Layout.fontSize.lg,
    fontWeight: 'bold',
    color: TITLE_COLOR,
    marginTop: Layout.spacing.lg,
    marginBottom: Layout.spacing.sm,
  },
  text: {
    color: Colors.gray700,
    fontSize: Layout.fontSize.md,
    marginBottom: Layout.spacing.md,
    lineHeight: 22,
  },
}); 