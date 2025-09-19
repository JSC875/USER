import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { userApi, UserProfile } from '../../services/userService';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import { logger } from '../../utils/logger';

export const PersonalDetailsTest: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const { getToken } = useAuth();

  const testGetUserProfile = async () => {
    try {
      setIsLoading(true);
      
      logger.debug('🔄 Loading user profile...');
      
      const profile = await userApi.getCurrentUser(getToken);
      
      logger.debug('✅ User profile loaded:', profile);
      setUserProfile(profile);
      
      Alert.alert(
        'User Profile',
        `Successfully loaded profile!\n\nName: ${profile.firstName} ${profile.lastName}\nEmail: ${profile.email}\nPhone: ${profile.phoneNumber}\nTotal Rides: ${profile.totalRides}\nRating: ${profile.rating}`,
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('❌ Error loading user profile:', error);
      Alert.alert('Error', 'Failed to load user profile. Please check the console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  const testUpdateProfile = async () => {
    try {
      setIsLoading(true);
      
      logger.debug('🔄 Updating user profile...');
      
      const updateData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'testuser@example.com',
        phoneNumber: '+919876543210',
        dateOfBirth: '1990-01-01',
        gender: 'Other',
        emergencyContactName: 'Emergency Contact',
        emergencyContactPhone: '+919876543211',
        preferredLanguage: 'en'
      };
      
      const result = await userApi.updateUserProfile(updateData, getToken);
      
      logger.debug('✅ Profile updated successfully:', result);
      
      Alert.alert(
        'Profile Updated',
        'User profile updated successfully!\n\nCheck the console for detailed response.',
        [{ text: 'OK' }]
      );
      
      // Reload profile to show updated data
      testGetUserProfile();
      
    } catch (error) {
      console.error('❌ Error updating user profile:', error);
      Alert.alert('Error', 'Failed to update user profile. Please check the console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  const testGetUserStats = async () => {
    try {
      setIsLoading(true);
      
      logger.debug('🔄 Loading user statistics...');
      
      const stats = await userApi.getUserStats(getToken);
      
      logger.debug('✅ User statistics loaded:', stats);
      
      Alert.alert(
        'User Statistics',
        `Total Rides: ${stats.totalRides}\nRating: ${stats.rating}\nTotal Spent: ₹${stats.totalSpent}\nWallet Balance: ₹${stats.walletBalance}`,
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('❌ Error loading user statistics:', error);
      Alert.alert('Error', 'Failed to load user statistics. Please check the console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  const testUpdateProfilePhoto = async () => {
    try {
      setIsLoading(true);
      
      logger.debug('🔄 Updating profile photo...');
      
      // Simulate a profile photo URL
      const photoUrl = 'https://example.com/profile-photo.jpg';
      
      const result = await userApi.updateProfilePhoto(photoUrl, getToken);
      
      logger.debug('✅ Profile photo updated successfully:', result);
      
      Alert.alert(
        'Profile Photo Updated',
        'Profile photo updated successfully!\n\nCheck the console for detailed response.',
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('❌ Error updating profile photo:', error);
      Alert.alert('Error', 'Failed to update profile photo. Please check the console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Personal Details API Test</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>User Profile Operations</Text>
        
        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={testGetUserProfile}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Loading...' : 'Get User Profile'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton, isLoading && styles.buttonDisabled]}
          onPress={testUpdateProfile}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Updating...' : 'Update Profile (Test Data)'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.infoButton, isLoading && styles.buttonDisabled]}
          onPress={testGetUserStats}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Loading...' : 'Get User Statistics'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.successButton, isLoading && styles.buttonDisabled]}
          onPress={testUpdateProfilePhoto}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Updating...' : 'Update Profile Photo'}
          </Text>
        </TouchableOpacity>
      </View>

      {userProfile && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Profile Data</Text>
          
          <View style={styles.profileCard}>
            <Text style={styles.profileTitle}>
              {userProfile.firstName} {userProfile.lastName}
            </Text>
            
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>Email:</Text>
              <Text style={styles.profileValue}>{userProfile.email || 'N/A'}</Text>
            </View>
            
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>Phone:</Text>
              <Text style={styles.profileValue}>{userProfile.phoneNumber}</Text>
            </View>
            
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>Gender:</Text>
              <Text style={styles.profileValue}>{userProfile.gender || 'N/A'}</Text>
            </View>
            
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>4:</Text>
              <Text style={styles.profileValue}>
                {userProfile.dateOfBirth ? new Date(userProfile.dateOfBirth).toLocaleDateString() : 'N/A'}
              </Text>
            </View>
            
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>Total Rides:</Text>
              <Text style={styles.profileValue}>{userProfile.totalRides}</Text>
            </View>
            
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>Rating:</Text>
              <Text style={styles.profileValue}>⭐ {userProfile.rating}</Text>
            </View>
            
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>Wallet Balance:</Text>
              <Text style={styles.profileValue}>₹{userProfile.walletBalance}</Text>
            </View>
            
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>Status:</Text>
              <View style={styles.statusContainer}>
                <View style={[
                  styles.statusBadge, 
                  { backgroundColor: userProfile.isActive ? Colors.success : Colors.error }
                ]}>
                  <Text style={styles.statusText}>
                    {userProfile.isActive ? 'Active' : 'Inactive'}
                  </Text>
                </View>
                {userProfile.isVerified && (
                  <View style={[styles.statusBadge, { backgroundColor: Colors.info }]}>
                    <Text style={styles.statusText}>Verified</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>
      )}
      
      <Text style={styles.note}>
        Note: Check the console for detailed API responses and data structures.
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: Layout.spacing.lg,
    backgroundColor: Colors.white,
  },
  title: {
    fontSize: Layout.fontSize.lg,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Layout.spacing.lg,
    textAlign: 'center',
  },
  section: {
    marginBottom: Layout.spacing.lg,
  },
  sectionTitle: {
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Layout.spacing.md,
  },
  button: {
    backgroundColor: Colors.primary,
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.sm,
    marginBottom: Layout.spacing.sm,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: Colors.accent,
  },
  infoButton: {
    backgroundColor: Colors.info,
  },
  successButton: {
    backgroundColor: Colors.success,
  },
  buttonDisabled: {
    backgroundColor: Colors.gray400,
  },
  buttonText: {
    color: Colors.white,
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
  },
  profileCard: {
    backgroundColor: Colors.gray50,
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  profileTitle: {
    fontSize: Layout.fontSize.lg,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Layout.spacing.md,
    textAlign: 'center',
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Layout.spacing.sm,
  },
  profileLabel: {
    fontSize: Layout.fontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
    flex: 1,
  },
  profileValue: {
    fontSize: Layout.fontSize.sm,
    color: Colors.text,
    flex: 2,
    textAlign: 'right',
  },
  statusContainer: {
    flexDirection: 'row',
    gap: Layout.spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: 2,
    borderRadius: Layout.borderRadius.sm,
  },
  statusText: {
    fontSize: Layout.fontSize.xs,
    fontWeight: '600',
    color: Colors.white,
  },
  note: {
    fontSize: Layout.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: Layout.spacing.lg,
  },
});

export default PersonalDetailsTest; 
