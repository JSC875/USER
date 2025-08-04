import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Image, ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, TITLE_COLOR } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import * as ImagePicker from 'expo-image-picker';
import { useUser, useAuth } from '@clerk/clerk-expo';
import { userApi, UserProfileUpdate } from '../../services/userService';

export default function EditProfileScreen({ navigation, route }: any) {
  const { name: initialName = '', email: initialEmail = '', phone: initialPhone = '', gender: initialGender = '', emergencyName: initialEmergencyName = '', emergencyPhone: initialEmergencyPhone = '', photo: initialPhoto = '' } = route?.params || {};
  
  // State for form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState(initialPhone);
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState(initialGender);
  const [emergencyName, setEmergencyName] = useState(initialEmergencyName);
  const [emergencyPhone, setEmergencyPhone] = useState(initialEmergencyPhone);
  const [photo, setPhoto] = useState(initialPhoto);
  const [preferredLanguage, setPreferredLanguage] = useState('en');
  
  // State for UI
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const { user } = useUser();
  const { getToken } = useAuth();

  const pickImage = async () => {
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  // Load user data on component mount
  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setIsLoading(true);
      const userProfile = await userApi.getCurrentUser(getToken);
      
      // Populate form fields with user data
      setFirstName(userProfile.firstName || '');
      setLastName(userProfile.lastName || '');
      setEmail(userProfile.email || '');
      setPhone(userProfile.phoneNumber || '');
      setDateOfBirth(userProfile.dateOfBirth || '');
      setGender(userProfile.gender || '');
      setEmergencyName(userProfile.emergencyContactName || '');
      setEmergencyPhone(userProfile.emergencyContactPhone || '');
      setPhoto(userProfile.profilePhoto || '');
      setPreferredLanguage(userProfile.preferredLanguage || 'en');
      
    } catch (error) {
      console.error('Error loading user profile:', error);
      Alert.alert('Error', 'Failed to load user profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    
    if (!firstName.trim()) newErrors.firstName = 'First name is required';
    else if (/\d/.test(firstName)) newErrors.firstName = 'First name cannot contain numbers';
    
    if (!lastName.trim()) newErrors.lastName = 'Last name is required';
    else if (/\d/.test(lastName)) newErrors.lastName = 'Last name cannot contain numbers';
    
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Invalid email format';
    
    if (!phone.trim()) newErrors.phone = 'Phone is required';
    else if (!/^[0-9]{10}$/.test(phone.replace(/\D/g, ''))) newErrors.phone = 'Phone must be 10 digits';
    
    if (!gender) newErrors.gender = 'Gender is required';
    
    if (!emergencyName.trim()) newErrors.emergencyName = 'Emergency contact name is required';
    else if (/\d/.test(emergencyName)) newErrors.emergencyName = 'Emergency contact name cannot contain numbers';
    
    if (!emergencyPhone.trim()) newErrors.emergencyPhone = 'Emergency phone is required';
    else if (!/^[0-9]{10}$/.test(emergencyPhone.replace(/\D/g, ''))) newErrors.emergencyPhone = 'Emergency phone must be 10 digits';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      return;
    }

    try {
      setIsSaving(true);
      
      // Prepare data for API
      const updateData: UserProfileUpdate = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phoneNumber: phone.trim(),
        dateOfBirth: dateOfBirth || undefined,
        gender,
        profilePhoto: photo || undefined,
        emergencyContactName: emergencyName.trim(),
        emergencyContactPhone: emergencyPhone.trim(),
        preferredLanguage,
      };

      // Update user profile
      const updatedProfile = await userApi.updateUserProfile(updateData, getToken);
      
      console.log('✅ Profile updated successfully:', updatedProfile);
      
      Alert.alert(
        'Success! 🎉',
        'Your profile has been updated successfully!',
        [
          {
            text: 'View Profile',
            onPress: () => {
              // Navigate to PersonalDetails with updated data
              console.log('🔄 Navigating to PersonalDetails with updated data:', updatedProfile);
              try {
                navigation.navigate('PersonalDetails', {
                  updatedProfile,
                  updatedPhoto: photo,
                });
              } catch (error) {
                console.error('❌ Navigation error:', error);
                // Fallback: just go back
                navigation.goBack();
              }
            },
          },
          {
            text: 'Go Back',
            style: 'cancel',
            onPress: () => {
              navigation.goBack();
            },
          },
        ]
      );
      
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={24} color={TITLE_COLOR} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 24 }} />
      </View>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <ScrollView
          style={styles.content}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Upload Photo */}
          <TouchableOpacity style={styles.photoContainer} onPress={pickImage} accessibilityLabel="Upload Photo">
            {photo ? (
              <Image source={{ uri: photo }} style={styles.photo} />
            ) : (
              <Ionicons name="camera" size={40} color={Colors.gray400} />
            )}
            <Text style={styles.uploadText}>Upload Photo</Text>
          </TouchableOpacity>
          {/* First Name */}
          <Text style={styles.label}>First Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your first name"
            value={firstName}
            onChangeText={setFirstName}
          />
          {errors.firstName && <Text style={{ color: Colors.error }}>{errors.firstName}</Text>}
          
          {/* Last Name */}
          <Text style={styles.label}>Last Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your last name"
            value={lastName}
            onChangeText={setLastName}
          />
          {errors.lastName && <Text style={{ color: Colors.error }}>{errors.lastName}</Text>}
          {/* Email */}
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
          />
          {errors.email && <Text style={{ color: Colors.error }}>{errors.email}</Text>}
          {/* Phone */}
          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your phone number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          {errors.phone && <Text style={{ color: Colors.error }}>{errors.phone}</Text>}
          
          {/* Date of Birth */}
          <Text style={styles.label}>Date of Birth</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            value={dateOfBirth}
            onChangeText={setDateOfBirth}
          />
          
          {/* Gender */}
          <Text style={styles.label}>Gender</Text>
          <View style={styles.genderRow}>
            {['Male', 'Female', 'Other'].map((g) => (
              <TouchableOpacity
                key={g}
                style={[styles.genderButton, gender === g && styles.genderButtonSelected]}
                onPress={() => setGender(g)}
              >
                <Text style={[styles.genderText, gender === g && styles.genderTextSelected]}>{g}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {errors.gender && <Text style={{ color: Colors.error }}>{errors.gender}</Text>}
          {/* Emergency Contact Name */}
          <Text style={styles.label}>Emergency Contact Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter emergency contact name"
            value={emergencyName}
            onChangeText={setEmergencyName}
          />
          {errors.emergencyName && <Text style={{ color: Colors.error }}>{errors.emergencyName}</Text>}
          {/* Emergency Contact Phone */}
          <Text style={styles.label}>Emergency Contact Phone</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter emergency contact phone"
            value={emergencyPhone}
            onChangeText={setEmergencyPhone}
            keyboardType="phone-pad"
          />
          {errors.emergencyPhone && <Text style={{ color: Colors.error }}>{errors.emergencyPhone}</Text>}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Loading profile...</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <View style={styles.saveButtonContent}>
                  <ActivityIndicator size="small" color={Colors.white} />
                  <Text style={styles.saveButtonText}>Saving...</Text>
                </View>
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
    padding: Layout.spacing.lg,
  },
  photoContainer: {
    alignItems: 'center',
    marginBottom: Layout.spacing.lg,
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 8,
  },
  uploadText: {
    color: Colors.primary,
    fontSize: Layout.fontSize.sm,
    marginTop: 4,
    marginBottom: 8,
  },
  label: {
    fontSize: Layout.fontSize.md,
    color: TITLE_COLOR,
    marginTop: Layout.spacing.md,
    marginBottom: 4,
    fontWeight: '600',
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: Layout.spacing.md,
    fontSize: Layout.fontSize.md,
    marginBottom: Layout.spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  genderRow: {
    flexDirection: 'row',
    marginBottom: Layout.spacing.md,
  },
  genderButton: {
    flex: 1,
    padding: Layout.spacing.md,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
  },
  genderButtonSelected: {
    backgroundColor: Colors.primary,
  },
  genderText: {
    color: TITLE_COLOR,
    fontSize: Layout.fontSize.md,
  },
  genderTextSelected: {
    color: Colors.white,
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: Colors.primary,
    padding: Layout.spacing.lg,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: Layout.spacing.xl,
  },
  saveButtonDisabled: {
    backgroundColor: Colors.gray400,
  },
  saveButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: Layout.fontSize.lg,
    fontWeight: 'bold',
    marginLeft: Layout.spacing.sm,
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: Layout.spacing.xl,
    padding: Layout.spacing.lg,
  },
  loadingText: {
    marginTop: Layout.spacing.md,
    fontSize: Layout.fontSize.md,
    color: Colors.textSecondary,
  },
}); 