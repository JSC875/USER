import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { userApi, UserProfileUpdate } from '../../services/userService';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';

export const UserProfileTest: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { getToken } = useAuth();

  const testUpdateProfile = async () => {
    try {
      setIsLoading(true);
      
      // Example update data
      const updateData: UserProfileUpdate = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phoneNumber: '9876543210',
        dateOfBirth: '1990-01-01',
        gender: 'Male',
        emergencyContactName: 'Jane Doe',
        emergencyContactPhone: '9876543211',
        preferredLanguage: 'en',
      };

      console.log('🔄 Updating user profile with data:', updateData);
      
      const updatedProfile = await userApi.updateUserProfile(updateData, getToken);
      
      console.log('✅ Profile updated successfully:', updatedProfile);
      
      Alert.alert(
        'Success',
        `Profile updated successfully!\nName: ${updatedProfile.firstName} ${updatedProfile.lastName}\nEmail: ${updatedProfile.email}`,
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('❌ Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please check the console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  const testGetProfile = async () => {
    try {
      setIsLoading(true);
      
      console.log('🔄 Fetching user profile...');
      
      const userProfile = await userApi.getCurrentUser(getToken);
      
      console.log('✅ User profile fetched:', userProfile);
      
      Alert.alert(
        'User Profile',
        `Name: ${userProfile.firstName} ${userProfile.lastName}\nEmail: ${userProfile.email}\nPhone: ${userProfile.phoneNumber}\nTotal Rides: ${userProfile.totalRides}\nRating: ${userProfile.rating}`,
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('❌ Error fetching profile:', error);
      Alert.alert('Error', 'Failed to fetch profile. Please check the console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>User Profile API Test</Text>
      
      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={testGetProfile}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Loading...' : 'Get Current Profile'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.button, styles.updateButton, isLoading && styles.buttonDisabled]}
        onPress={testUpdateProfile}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Updating...' : 'Update Profile (Test Data)'}
        </Text>
      </TouchableOpacity>
      
      <Text style={styles.note}>
        Note: This will update your profile with test data. Check the console for API responses.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: Layout.spacing.lg,
    backgroundColor: Colors.white,
    borderRadius: Layout.borderRadius.md,
    margin: Layout.spacing.md,
  },
  title: {
    fontSize: Layout.fontSize.lg,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Layout.spacing.lg,
    textAlign: 'center',
  },
  button: {
    backgroundColor: Colors.primary,
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.sm,
    marginBottom: Layout.spacing.md,
    alignItems: 'center',
  },
  updateButton: {
    backgroundColor: Colors.accent,
  },
  buttonDisabled: {
    backgroundColor: Colors.gray400,
  },
  buttonText: {
    color: Colors.white,
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
  },
  note: {
    fontSize: Layout.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: Layout.spacing.sm,
  },
});

export default UserProfileTest; 