import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Image, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, TITLE_COLOR } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import * as ImagePicker from 'expo-image-picker';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { userApi, UserProfileUpdate } from '../../services/userService';
import DateTimePicker from '@react-native-community/datetimepicker';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function EditProfileScreen({ navigation, route }: any) {
  const params = route?.params || {};
  const { 
    email: initialEmail = '', 
    phone: initialPhone = '', 
    gender: initialGender = '', 
    emergencyName: initialEmergencyName = '', 
    emergencyPhone: initialEmergencyPhone = '', 
    photo: initialPhoto = '' 
  } = params;
  
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
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const { getToken } = useAuth();
  const { user } = useUser();

  const pickImage = async () => {
    try {
      // Request permissions first
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert(
          'Permission Required',
          'Permission to access camera roll is required to upload photos.',
          [{ text: 'OK' }]
        );
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7, // Slightly higher quality for better results
        base64: false, // Don't include base64 to reduce payload size
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset && asset.uri) {
          // Validate image size (optional - you can adjust the limit)
          if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) { // 5MB limit
            Alert.alert(
              'Image Too Large',
              'Please select an image smaller than 5MB.',
              [{ text: 'OK' }]
            );
            return;
          }
          
          setPhoto(asset.uri);
          console.log('📷 Image selected:', {
            uri: asset.uri.substring(0, 50) + '...',
            width: asset.width,
            height: asset.height,
            fileSize: asset.fileSize ? `${Math.round(asset.fileSize / 1024)}KB` : 'Unknown'
          });
        }
      }
    } catch (error) {
      console.error('❌ Error picking image:', error);
      Alert.alert(
        'Error',
        'Failed to pick image. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const removePhoto = () => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove your profile photo?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setPhoto('');
            console.log('📷 Profile photo removed');
          },
        },
      ]
    );
  };

  const onDateChange = (_event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      // Format date as YYYY-MM-DD for API
      const formattedDate = selectedDate.toISOString().split('T')[0];
      setDateOfBirth(formattedDate || '');
    }
  };

  // Helper function to get user's phone number for comparison
  const getUserPhoneNumber = () => {
    // Try to get from user profile first, then from Clerk
    if (phone && phone.trim()) {
      return phone.trim();
    }
    // Fallback to Clerk user phone number
    return user?.primaryPhoneNumber?.phoneNumber || '';
  };

  // Helper function to normalize phone numbers for comparison
  const normalizePhoneNumber = (phoneNum: string) => {
    // Remove all non-digit characters and country codes
    return phoneNum.replace(/\D/g, '').replace(/^91/, '').replace(/^1/, '');
  };

  const handleFieldChange = (field: string, value: string) => {
    switch (field) {
      case 'firstName':
        setFirstName(value);
        break;
      case 'lastName':
        setLastName(value);
        break;
      case 'email':
        setEmail(value);
        break;
      case 'dateOfBirth':
        setDateOfBirth(value);
        break;
      case 'emergencyName':
        setEmergencyName(value);
        break;
      case 'emergencyPhone':
        setEmergencyPhone(value);
        break;
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
     
     // Phone validation removed since the field is disabled
     
     if (!gender) newErrors.gender = 'Gender is required';
     
     // Date of Birth validation (matching userService validation)
     if (dateOfBirth.trim()) {
       const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
       if (!dateRegex.test(dateOfBirth)) {
         newErrors.dateOfBirth = 'Date must be in YYYY-MM-DD format';
       } else {
         const dob = new Date(dateOfBirth);
         const today = new Date();
         const age = today.getFullYear() - dob.getFullYear();
         
         if (isNaN(dob.getTime())) {
           newErrors.dateOfBirth = 'Invalid date';
         } else if (age < 18 || age > 100) {
           newErrors.dateOfBirth = 'Age must be between 18 and 100 years';
         }
       }
     }
     
     if (!emergencyName.trim()) newErrors.emergencyName = 'Emergency contact name is required';
     else if (/\d/.test(emergencyName)) newErrors.emergencyName = 'Emergency contact name cannot contain numbers';
     
     if (!emergencyPhone.trim()) newErrors.emergencyPhone = 'Emergency phone is required';
     else if (!/^[0-9]{10}$/.test(emergencyPhone.replace(/\D/g, ''))) newErrors.emergencyPhone = 'Emergency phone must be 10 digits';
     else {
       // Check if emergency contact phone matches user's phone number
       const userPhone = getUserPhoneNumber();
       const normalizedUserPhone = normalizePhoneNumber(userPhone);
       const normalizedEmergencyPhone = normalizePhoneNumber(emergencyPhone);
       
       if (normalizedUserPhone && normalizedEmergencyPhone && normalizedUserPhone === normalizedEmergencyPhone) {
         newErrors.emergencyPhone = 'Emergency contact phone cannot be the same as your phone number. Please provide a different number.';
       }
     }
     
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
        dateOfBirth: dateOfBirth || '',
        gender,
        profilePhoto: photo || undefined,
        emergencyContactName: emergencyName.trim(),
        emergencyContactPhone: emergencyPhone.trim(),
        preferredLanguage,
      };

      // Log the data being sent for debugging
      console.log('📤 Sending profile update data:', {
        ...updateData,
        profilePhoto: photo ? `${photo.substring(0, 50)}...` : 'No photo'
      });

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
      console.error('❌ Error updating profile:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to update profile. Please try again.';
      let errorTitle = 'Error';
      
      if (error instanceof Error) {
        if (error.message.includes('500')) {
          errorTitle = 'Server Error';
          errorMessage = 'The server is experiencing issues. This might be due to:\n\n• Image upload problems\n• Server maintenance\n• Database connectivity issues\n\nPlease try again in a few minutes or contact support if the problem persists.';
        } else if (error.message.includes('400')) {
          errorTitle = 'Invalid Data';
          errorMessage = 'Please check your information and try again. Make sure all required fields are filled correctly.';
        } else if (error.message.includes('401')) {
          errorTitle = 'Authentication Error';
          errorMessage = 'Your session has expired. Please log in again.';
        } else if (error.message.includes('403')) {
          errorTitle = 'Access Denied';
          errorMessage = 'You don\'t have permission to update this profile. Please contact support.';
        } else if (error.message.includes('404')) {
          errorTitle = 'Profile Not Found';
          errorMessage = 'Your profile could not be found. Please contact support.';
        } else if (error.message.includes('timeout')) {
          errorTitle = 'Request Timeout';
          errorMessage = 'The request took too long to complete. Please check your internet connection and try again.';
        } else if (error.message.includes('network')) {
          errorTitle = 'Network Error';
          errorMessage = 'Unable to connect to the server. Please check your internet connection and try again.';
        }
      }
      
      Alert.alert(errorTitle, errorMessage, [
        {
          text: 'Try Again',
          onPress: () => {
            // Allow user to retry
            handleSave();
          }
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]);
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
          <View style={styles.photoContainer}>
            <TouchableOpacity style={styles.photoUploadArea} onPress={pickImage} accessibilityLabel="Upload Photo">
              {photo ? (
                <Image source={{ uri: photo }} style={styles.photo} />
              ) : (
                <Ionicons name="camera" size={40} color={Colors.gray400} />
              )}
              <Text style={styles.uploadText}>
                {photo ? 'Change Photo' : 'Upload Photo'}
              </Text>
            </TouchableOpacity>
            
            {photo && (
              <TouchableOpacity 
                style={styles.removePhotoButton} 
                onPress={removePhoto}
                accessibilityLabel="Remove Photo"
              >
                <Ionicons name="trash-outline" size={16} color={Colors.error} />
                <Text style={styles.removePhotoText}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>
                     {/* First Name */}
           <Text style={styles.label}>First Name</Text>
           <TextInput
             style={styles.input}
             placeholder="Enter your first name"
             value={firstName}
             onChangeText={(value) => handleFieldChange('firstName', value)}
           />
           {errors.firstName && <Text style={{ color: Colors.error }}>{errors.firstName}</Text>}
           
           {/* Last Name */}
           <Text style={styles.label}>Last Name</Text>
           <TextInput
             style={styles.input}
             placeholder="Enter your last name"
             value={lastName}
             onChangeText={(value) => handleFieldChange('lastName', value)}
           />
           {errors.lastName && <Text style={{ color: Colors.error }}>{errors.lastName}</Text>}
           {/* Email */}
           <Text style={styles.label}>Email</Text>
           <TextInput
             style={styles.input}
             placeholder="Enter your email"
             value={email}
             onChangeText={(value) => handleFieldChange('email', value)}
             keyboardType="email-address"
           />
           {errors.email && <Text style={{ color: Colors.error }}>{errors.email}</Text>}
          {/* Phone */}
          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={[styles.input, styles.disabledInput]}
            placeholder="Enter your phone number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            editable={false}
          />
          
                                 {/* Date of Birth */}
            <Text style={styles.label}>Date of Birth</Text>
            <TouchableOpacity 
              style={styles.input} 
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={[
                styles.dateText, 
                !dateOfBirth && styles.placeholderText
              ]}>
                {dateOfBirth ? new Date(dateOfBirth).toLocaleDateString() : 'Select your date of birth'}
              </Text>
              <Ionicons name="calendar-outline" size={20} color={Colors.gray400} style={styles.calendarIcon} />
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={dateOfBirth ? new Date(dateOfBirth) : new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onDateChange}
                maximumDate={new Date()}
                minimumDate={new Date(1900, 0, 1)}
              />
            )}
            {errors.dateOfBirth && <Text style={{ color: Colors.error }}>{errors.dateOfBirth}</Text>}
           
                       {/* Gender */}
            <Text style={styles.label}>Gender</Text>
            <View style={styles.genderRow}>
              {['Male', 'Female', 'Other'].map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[
                    styles.genderButton, 
                    gender === g && styles.genderButtonSelected
                  ]}
                  onPress={() => setGender(g)}
                >
                  <Text style={[
                    styles.genderText, 
                    gender === g && styles.genderTextSelected
                  ]}>{g}</Text>
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
             onChangeText={(value) => handleFieldChange('emergencyName', value)}
           />
           {errors.emergencyName && <Text style={{ color: Colors.error }}>{errors.emergencyName}</Text>}
           {/* Emergency Contact Phone */}
           <Text style={styles.label}>Emergency Contact Phone</Text>
           <TextInput
             style={styles.input}
             placeholder="Enter emergency contact phone"
             value={emergencyPhone}
             onChangeText={(value) => handleFieldChange('emergencyPhone', value)}
             keyboardType="phone-pad"
           />
           {errors.emergencyPhone && <Text style={{ color: Colors.error }}>{errors.emergencyPhone}</Text>}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <LoadingSpinner size="large" text="Loading profile..." />
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <View style={styles.saveButtonContent}>
                  <LoadingSpinner size="small" />
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
  photoUploadArea: {
    alignItems: 'center',
    marginBottom: Layout.spacing.sm,
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
  },
  removePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray100,
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    borderRadius: Layout.borderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  removePhotoText: {
    color: Colors.error,
    fontSize: Layout.fontSize.sm,
    marginLeft: Layout.spacing.xs,
    fontWeight: '500',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  disabledInput: {
    backgroundColor: Colors.gray100,
    color: Colors.textSecondary,
    borderColor: Colors.gray300,
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
  dateText: {
    fontSize: Layout.fontSize.md,
    color: Colors.text,
    flex: 1,
  },
  placeholderText: {
    color: Colors.gray400,
  },
  calendarIcon: {
    marginLeft: Layout.spacing.sm,
  },
}); 