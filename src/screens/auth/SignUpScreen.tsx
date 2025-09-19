import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView, 
  Alert,
  BackHandler,
  Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSignUp, useUser, useAuth } from '@clerk/clerk-expo';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import Button from '../../components/common/Button';
import { logger } from '../../utils/logger';
import Input from '../../components/common/Input';
import PhoneInput from '../../components/common/PhoneInput';
import OTPInput from '../../components/common/OTPInput';
import { logJWTDetails } from '../../utils/jwtDecoder';
import * as Haptics from 'expo-haptics';

// Types
interface NameStepProps {
  firstName: string;
  lastName: string;
  setFirstName: (v: string) => void;
  setLastName: (v: string) => void;
  onNext: () => void;
}

interface PhoneStepProps {
  phoneNumber: string;
  setPhoneNumber: (v: string) => void;
  onNext: () => void;
  isLoading: boolean;
  selectedCountry: CountryItem;
  phoneError?: string;
}

interface OtpStepProps {
  otp: string[];
  setOtp: (v: string[]) => void;
  onVerify: () => void;
  isLoading: boolean;
  error: string;
  resendOtp: () => void;
  canResend: boolean;
  timer: number;
  phoneNumber: string;
  countryCode: string;
  onEditPhone: () => void;
}


interface CountryItem {
  code: string;
  name: string;
  flag: string;
}

// Add a helper function for alphabetic and space validation
function isAlphaSpace(str: string) {
  return /^[A-Za-z\s]+$/.test(str);
}

// Step 1: Name Entry
function NameStep({ firstName, lastName, setFirstName, setLastName, onNext }: NameStepProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Local handler for Next button
  const handleNext = async () => {
    if (!isAlphaSpace(firstName.trim())) {
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      Alert.alert('Invalid First Name', 'First name should contain only letters and spaces.');
      return;
    }
    if (!isAlphaSpace(lastName.trim())) {
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      Alert.alert('Invalid Last Name', 'Last name should contain only letters and spaces.');
      return;
    }
    
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onNext();
  };

  return (
    <Animated.View 
      style={[
        styles.stepContainer,
        {
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim }
          ]
        }
      ]}
    >
      <View style={styles.stepHeader}>
        <View style={styles.progressIndicator}>
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={styles.progressLine} />
          <View style={styles.progressDot} />
          <View style={styles.progressLine} />
          <View style={styles.progressDot} />
          <View style={styles.progressLine} />
          <View style={styles.progressDot} />
        </View>
        <Text style={styles.progressText}>Step 1 of 4</Text>
      </View>

      <View style={styles.stepContent}>
        <View style={styles.titleContainer}>
          <Ionicons name="person-circle-outline" size={48} color={Colors.primary} style={styles.stepIcon} />
          <Text style={styles.stepTitle}>What's your name?</Text>
          <Text style={styles.stepSubtitle}>Let's get to know you better</Text>
        </View>

        <View style={styles.inputsContainer}>
          <Input
            label="First Name"
            placeholder="Enter your first name"
            value={firstName}
            onChangeText={setFirstName}
            leftIcon="person"
            containerStyle={styles.inputContainer}
          />
          <Input
            label="Last Name"
            placeholder="Enter your last name"
            value={lastName}
            onChangeText={setLastName}
            leftIcon="person"
            containerStyle={styles.inputContainer}
          />
        </View>

        <Button
          title="Continue"
          onPress={handleNext}
          fullWidth
          disabled={!firstName.trim() || !lastName.trim()}
          style={styles.nextButton}
          hapticFeedback={true}
        />
      </View>
    </Animated.View>
  );
}

// Step 2: Phone Number Entry
function PhoneStep({ 
  phoneNumber, 
  setPhoneNumber, 
  onNext, 
  isLoading,
  selectedCountry,
  phoneError
}: PhoneStepProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleSendOTP = async () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onNext();
  };

  return (
    <Animated.View 
      style={[
        styles.stepContainer,
        {
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim }
          ]
        }
      ]}
    >
      <View style={styles.stepHeader}>
        <View style={styles.progressIndicator}>
          <View style={[styles.progressDot, styles.progressDotCompleted]} />
          <View style={[styles.progressLine, styles.progressLineCompleted]} />
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={styles.progressLine} />
          <View style={styles.progressDot} />
          <View style={styles.progressLine} />
          <View style={styles.progressDot} />
        </View>
        <Text style={styles.progressText}>Step 2 of 4</Text>
      </View>

      <View style={styles.stepContent}>
        <View style={styles.titleContainer}>
          <Ionicons name="phone-portrait-outline" size={48} color={Colors.primary} style={styles.stepIcon} />
          <Text style={styles.stepTitle}>What's your mobile number?</Text>
          <Text style={styles.stepSubtitle}>We'll send you a verification code</Text>
        </View>

        <View style={styles.inputsContainer}>
          <PhoneInput
            label="Mobile Number"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            country={selectedCountry}
            {...(phoneError && { error: phoneError })}
            showCountrySelector={false}
            containerStyle={styles.inputContainer}
          />
        </View>

        <Button
          title="Send Verification Code"
          onPress={handleSendOTP}
          fullWidth
          loading={isLoading}
          disabled={phoneNumber.length !== 10}
          style={styles.nextButton}
          hapticFeedback={true}
        />
      </View>
    </Animated.View>
  );
}

// Step 3: OTP Entry
function OtpStep({ 
  otp, 
  setOtp, 
  onVerify, 
  isLoading, 
  error, 
  resendOtp, 
  canResend, 
  timer,
  phoneNumber,
  countryCode,
  onEditPhone
}: OtpStepProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Pulse animation for the OTP icon
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const handleVerify = async () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onVerify();
  };

  const handleResend = async () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    resendOtp();
  };

  return (
    <Animated.View 
      style={[
        styles.stepContainer,
        {
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim }
          ]
        }
      ]}
    >
      <View style={styles.stepHeader}>
        <View style={styles.progressIndicator}>
          <View style={[styles.progressDot, styles.progressDotCompleted]} />
          <View style={[styles.progressLine, styles.progressLineCompleted]} />
          <View style={[styles.progressDot, styles.progressDotCompleted]} />
          <View style={[styles.progressLine, styles.progressLineCompleted]} />
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={styles.progressLine} />
          <View style={styles.progressDot} />
        </View>
        <Text style={styles.progressText}>Step 3 of 4</Text>
      </View>

      <View style={styles.stepContent}>
        <View style={styles.titleContainer}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Ionicons name="shield-checkmark-outline" size={48} color={Colors.primary} style={styles.stepIcon} />
          </Animated.View>
          <Text style={styles.stepTitle}>Enter verification code</Text>
          <Text style={styles.stepSubtitle}>
            We've sent a 6-digit code to your mobile number
          </Text>
        </View>

        {/* Phone Number Display with Edit Option */}
        <View style={styles.phoneDisplayContainer}>
          <View style={styles.phoneDisplayCard}>
            <View style={styles.phoneDisplayInfo}>
              <Ionicons name="phone-portrait" size={20} color={Colors.primary} />
              <Text style={styles.phoneDisplayText}>
                {countryCode} {phoneNumber}
              </Text>
            </View>
            <TouchableOpacity 
              onPress={onEditPhone} 
              style={styles.editPhoneButton}
              disabled={isLoading}
            >
              <Ionicons name="pencil" size={16} color={Colors.primary} />
              <Text style={styles.editPhoneText}>Edit</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.otpContainer}>
          <OTPInput
            length={6}
            value={otp}
            onChange={setOtp}
            onComplete={(otpString) => {
              logger.debug('OTP completed in SignUp:', otpString);
              // Optionally auto-verify when OTP is complete
              // onVerify();
            }}
            autoFocus={true}
            showPasteButton={true}
            error={!!error}
            disabled={isLoading}
          />
        </View>
        
        {error ? (
          <Animated.View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color={Colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </Animated.View>
        ) : null}
        
        <View style={styles.resendContainer}>
          {canResend ? (
            <TouchableOpacity onPress={handleResend} style={styles.resendButton}>
              <Ionicons name="refresh" size={16} color={Colors.primary} />
              <Text style={styles.resendText}>Resend Code</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.timerContainer}>
              <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.timerText}>Resend in {timer}s</Text>
            </View>
          )}
        </View>
        
        <Button
          title="Verify & Continue"
          onPress={handleVerify}
          fullWidth
          loading={isLoading}
          disabled={otp.join('').length !== 6}
          style={styles.nextButton}
          hapticFeedback={true}
        />
      </View>
    </Animated.View>
  );
}

// Step 4: Complete Profile
function CompleteStep({ 
  onComplete, 
  isLoading,
  firstName,
  lastName
}: { 
  onComplete: () => void; 
  isLoading: boolean;
  firstName: string; 
  lastName: string; 
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const celebrationAnim = useRef(new Animated.Value(0)).current;
  const confettiAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Initial entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Celebration animation sequence
    setTimeout(() => {
      Animated.sequence([
        Animated.timing(celebrationAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(confettiAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start();
    }, 500);
  }, []);

  const handleComplete = async () => {
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    onComplete();
  };

  return (
    <Animated.View 
      style={[
        styles.stepContainer,
        {
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim }
          ]
        }
      ]}
    >
      <View style={styles.stepHeader}>
        <View style={styles.progressIndicator}>
          <View style={[styles.progressDot, styles.progressDotCompleted]} />
          <View style={[styles.progressLine, styles.progressLineCompleted]} />
          <View style={[styles.progressDot, styles.progressDotCompleted]} />
          <View style={[styles.progressLine, styles.progressLineCompleted]} />
          <View style={[styles.progressDot, styles.progressDotCompleted]} />
          <View style={[styles.progressLine, styles.progressLineCompleted]} />
          <View style={[styles.progressDot, styles.progressDotCompleted]} />
        </View>
        <Text style={styles.progressText}>Step 4 of 4 - Complete!</Text>
      </View>

      <View style={styles.stepContent}>
        {/* Celebration header */}
        <Animated.View 
          style={[
            styles.celebrationHeader,
            {
              opacity: celebrationAnim,
              transform: [
                {
                  scale: celebrationAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <Animated.View 
            style={[
              styles.celebrationIcon,
              {
                transform: [
                  {
                    rotate: celebrationAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    }),
                  },
                ],
              },
            ]}
          >
            <Ionicons name="trophy" size={48} color={Colors.white} />
          </Animated.View>
          <Text style={styles.celebrationTitle}>🎉 Congratulations!</Text>
          <Text style={styles.celebrationSubtitle}>
            Your account is ready to go
          </Text>
        </Animated.View>
        
        {/* Profile summary card */}
        <Animated.View 
          style={[
            styles.profileCard,
            {
              opacity: celebrationAnim,
              transform: [
                {
                  translateY: celebrationAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.profileInfo}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>
                {firstName.charAt(0)}{lastName.charAt(0)}
              </Text>
            </View>
            <View style={styles.profileDetails}>
              <Text style={styles.profileName}>
                {firstName} {lastName}
              </Text>
              <View style={styles.profileBadge}>
                <Ionicons name="shield-checkmark" size={14} color={Colors.success} />
                <Text style={styles.profileBadgeText}>Verified</Text>
              </View>
            </View>
          </View>
          
          {/* Quick checklist */}
          <View style={styles.quickChecklist}>
            <View style={styles.checklistRow}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
              <Text style={styles.checklistText}>Personal Info</Text>
            </View>
            <View style={styles.checklistRow}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
              <Text style={styles.checklistText}>Phone Verified</Text>
            </View>
          </View>
        </Animated.View>
        
        {(!firstName.trim() || !lastName.trim()) && (
          <Animated.View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color={Colors.error} />
            <Text style={styles.errorText}>
              Please provide both first name and last name to continue
            </Text>
          </Animated.View>
        )}
        
        <Button
          title="🚀 Complete Setup & Get Started"
          onPress={handleComplete}
          fullWidth
          loading={isLoading}
          disabled={!firstName.trim() || !lastName.trim()}
          style={styles.nextButton}
          hapticFeedback={true}
        />
      </View>
    </Animated.View>
  );
}

// Main SignUp Screen Component
export default function SignUpScreen() {
  const [step, setStep] = useState<number>(1);
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [countryCode] = useState<string>('+91');
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [otpError, setOtpError] = useState<string>('');
  const [phoneError, setPhoneError] = useState<string>('');
  const [timer, setTimer] = useState<number>(30);
  const [canResend, setCanResend] = useState<boolean>(false);
  const [signUpCreated, setSignUpCreated] = useState<boolean>(false);
  const { signUp, setActive: setSignUpActive, isLoaded } = useSignUp();
  const { user } = useUser();
  const { isSignedIn, getToken } = useAuth();
  const [selectedCountry] = useState<CountryItem>({ code: '+91', name: 'India', flag: '🇮🇳' });

  // Prevent back navigation on Android
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      return true; // Prevent default back behavior
    });

    return () => backHandler.remove();
  }, []);

  // Timer for OTP resend
  useEffect(() => {
    if (step !== 3) return;
    
    setTimer(30);
    setCanResend(false);
    
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [step]);

  // Reset signUpCreated if phone number changes
  useEffect(() => {
    setSignUpCreated(false);
  }, [phoneNumber, countryCode]);

  // Monitor authentication state
  useEffect(() => {
    logger.debug('SignUpScreen - Auth state changed. isSignedIn:', isSignedIn);
    if (isSignedIn) {
      logger.debug('SignUpScreen - User is signed in!');
    }
  }, [isSignedIn]);

  // Step navigation
  const goToNextStep = () => setStep((s) => s + 1);
  const goToPrevStep = () => setStep((s) => s - 1);
  
  // Handle editing phone number from OTP step
  const handleEditPhone = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setOtp(['', '', '', '', '', '']); // Clear OTP
    setOtpError(''); // Clear any OTP errors
    goToPrevStep(); // Go back to phone step
  };



  // Step 2: Send OTP
  const handleSendOTP = async () => {
    if (!isLoaded) return;
    
    // Clear previous errors
    setPhoneError('');
    
    // Validate phone number
    if (phoneNumber.length !== 10) {
      setPhoneError('Please enter a valid 10-digit phone number');
      return;
    }

    if (!/^\d+$/.test(phoneNumber)) {
      setPhoneError('Phone number should contain only digits');
      return;
    }
    
    setIsLoading(true);
    try {
      const formattedPhone = `${countryCode}${phoneNumber.replace(/^0+/, '')}`;
      logger.debug('SignUpScreen - Sending OTP to:', formattedPhone);
      logger.debug('SignUpScreen - SignUp object:', signUp);
      logger.debug('SignUpScreen - Is loaded:', isLoaded);
      
      if (!signUp) {
        console.error('SignUpScreen - SignUp object is null during OTP send');
        Alert.alert('Error', 'Authentication service not available. Please try again.');
        return;
      }
      
      if (!signUpCreated) {
        logger.debug('SignUpScreen - Creating sign up...');
        await signUp.create({ phoneNumber: formattedPhone });
        setSignUpCreated(true);
        logger.debug('SignUpScreen - Sign up created successfully');
      }
      
      logger.debug('SignUpScreen - Preparing phone number verification...');
      await signUp.preparePhoneNumberVerification({ strategy: 'phone_code' });
      logger.debug('SignUpScreen - OTP sent successfully');
      goToNextStep();
    } catch (err: unknown) {
      console.error('SignUpScreen - Error sending OTP:', err);
      if (typeof err === 'object' && err && 'errors' in err) {
        // @ts-ignore
        const errorMessage = err.errors?.[0]?.message || 'Failed to send OTP';
        console.error('SignUpScreen - Error message:', errorMessage);
        setPhoneError(errorMessage);
      } else {
        console.error('SignUpScreen - Unknown error type:', err);
        setPhoneError('Failed to send OTP. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Verify OTP
  const handleVerifyOTP = async () => {
    setIsLoading(true);
    setOtpError('');
    try {
      const otpString = otp.join('');
      logger.debug('SignUpScreen - Verifying OTP:', otpString);
      logger.debug('SignUpScreen - OTP length:', otpString.length);
      logger.debug('SignUpScreen - OTP array:', otp);
      logger.debug('SignUpScreen - SignUp object:', signUp);
      logger.debug('SignUpScreen - Is loaded:', isLoaded);
      logger.debug('SignUpScreen - SignUpCreated:', signUpCreated);
      
      if (otpString.length !== 6) {
        setOtpError('Please enter complete OTP');
        setIsLoading(false);
        return;
      }

      if (!signUp) {
        console.error('SignUpScreen - SignUp object is null');
        setOtpError('Authentication service not available. Please try again.');
        setIsLoading(false);
        return;
      }

      // Test: Check if the OTP contains only numbers
      if (!/^\d{6}$/.test(otpString)) {
        console.error('SignUpScreen - OTP contains non-numeric characters');
        setOtpError('OTP should contain only numbers');
        setIsLoading(false);
        return;
      }
      
      logger.debug('SignUpScreen - Attempting phone number verification...');
      logger.debug('SignUpScreen - OTP code being sent:', otpString);
      
      const completeSignUp = await signUp.attemptPhoneNumberVerification({ code: otpString });
      logger.debug('SignUpScreen - Verification result:', completeSignUp);
      logger.debug('SignUpScreen - Verification status:', completeSignUp?.status);
      logger.debug('SignUpScreen - Phone verification status:', completeSignUp?.verifications?.phoneNumber?.status);
      logger.debug('SignUpScreen - Created session ID:', completeSignUp?.createdSessionId);
      
      // Check if phone number is verified
      const isPhoneVerified = completeSignUp?.verifications?.phoneNumber?.status === 'verified';
      logger.debug('SignUpScreen - Is phone verified:', isPhoneVerified);
      
      if (isPhoneVerified) {
        logger.debug('SignUpScreen - Phone verification successful!');
        logger.debug('SignUpScreen - Missing fields:', completeSignUp?.missingFields);
        
        // Set userType in Clerk metadata immediately after phone verification
        if (user) {
          try {
            await user.update({
              unsafeMetadata: { ...user.unsafeMetadata, type: 'customer' }
            });
            logger.debug('SignUpScreen - User type set to customer after phone verification');
            
            // Force new JWT with updated userType
            if (typeof getToken === 'function') {
              const newToken = await getToken({ template: 'my_app_token', skipCache: true });
              logger.debug('SignUpScreen - New JWT with userType after phone verification:', newToken ? 'Generated' : 'Failed');
            }
          } catch (metadataErr) {
            console.error('SignUpScreen - Error setting user type after phone verification:', metadataErr);
          }
        }
        
        // Check if we have all required fields (phone is verified, but we still need first_name and last_name)
        if (completeSignUp?.missingFields?.includes('first_name') || completeSignUp?.missingFields?.includes('last_name')) {
          logger.debug('SignUpScreen - Phone verified but missing name fields, proceeding to next step');
          goToNextStep();
        } else if (completeSignUp?.status === 'complete') {
          logger.debug('SignUpScreen - All requirements met, setting active session...');
          logger.debug('SignUpScreen - Created session ID:', completeSignUp.createdSessionId);
          
          // Set the active session
          if (setSignUpActive && completeSignUp.createdSessionId) {
            await setSignUpActive({ session: completeSignUp.createdSessionId });
            logger.debug('SignUpScreen - Session activated successfully');
          } else {
            console.error('SignUpScreen - setSignUpActive is not available or no session ID');
          }
          goToNextStep();
        } else {
          logger.debug('SignUpScreen - Phone verified but status not complete, proceeding anyway');
          goToNextStep();
        }
      } else {
        logger.debug('SignUpScreen - Phone verification failed');
        logger.debug('SignUpScreen - Complete signup object:', completeSignUp);
        setOtpError('Invalid OTP. Please try again.');
      }
    } catch (err: any) {
      console.error('SignUpScreen - OTP Verification Error:', err);
      console.error('SignUpScreen - Error details:', err.errors);
      console.error('SignUpScreen - Error message:', err.message);
      console.error('SignUpScreen - Error code:', err.code);
      console.error('SignUpScreen - Error type:', typeof err);
      console.error('SignUpScreen - Full error object:', JSON.stringify(err, null, 2));
      
      let errorMessage = 'Invalid OTP. Please try again.';
      if (err?.errors?.[0]?.message) {
        errorMessage = err.errors[0].message;
      } else if (err?.message) {
        errorMessage = err.message;
      }
      
      setOtpError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Resend OTP
  const handleResendOTP = async () => {
    try {
      await signUp?.preparePhoneNumberVerification({ strategy: 'phone_code' });
      setTimer(30);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);
      setOtpError('');
      Alert.alert('Success', 'OTP sent successfully');
    } catch (err: any) {
      Alert.alert('Error', 'Failed to resend OTP. Please try again.');
    }
  };

  // Step 4: Complete Profile
  const handleCompleteProfile = async () => {
    setIsLoading(true);
    try {
      logger.debug('SignUpScreen - Completing profile...');
      logger.debug('SignUpScreen - First name:', firstName);
      logger.debug('SignUpScreen - Last name:', lastName);
      logger.debug('SignUpScreen - Current auth state - isSignedIn:', isSignedIn);
      
      // Validate that both names are provided
      if (!firstName.trim() || !lastName.trim()) {
        Alert.alert('Error', 'Please enter both first name and last name');
        setIsLoading(false);
        return;
      }

      // Add validation for alphabetic characters and spaces
      if (!isAlphaSpace(firstName.trim())) {
        Alert.alert('Invalid First Name', 'First name should contain only letters and spaces.');
        setIsLoading(false);
        return;
      }
      if (!isAlphaSpace(lastName.trim())) {
        Alert.alert('Invalid Last Name', 'Last name should contain only letters and spaces.');
        setIsLoading(false);
        return;
      }
      
      // Update the signup with first and last name
      if (signUp) {
        await signUp.update({
          firstName: firstName.trim(),
          lastName: lastName.trim()
        });
        logger.debug('SignUpScreen - Profile updated successfully');
        logger.debug('SignUpScreen - SignUp status after update:', signUp.status);
        // Check if we need to complete the signup
        if (signUp.status === 'complete') {
          logger.debug('SignUpScreen - SignUp is complete, setting active session...');
          if (setSignUpActive && signUp.createdSessionId) {
            await setSignUpActive({ session: signUp.createdSessionId });
            logger.debug('SignUpScreen - Session activated successfully');
          }
        } else {
          logger.debug('SignUpScreen - SignUp status is not complete:', signUp.status);
          logger.debug('SignUpScreen - Missing fields:', signUp.missingFields);
          // Try to complete the signup manually
          try {
            logger.debug('SignUpScreen - Attempting to complete signup...');
            // Since we've already verified the phone and updated the name, 
            // we should be able to complete the signup
            logger.debug('SignUpScreen - SignUp should be complete now');
          } catch (completionErr) {
            console.error('SignUpScreen - Error completing signup:', completionErr);
          }
        }
      }
      
      // Set userType in Clerk metadata if user is available
      if (user) {
        try {
          await user.update({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            unsafeMetadata: { ...user.unsafeMetadata, type: 'customer' }
          });
          logger.debug('SignUpScreen - Clerk user updated with name and userType');
          
          // Force new JWT with updated userType and name fields
          if (typeof getToken === 'function') {
            const newToken = await getToken({ template: 'my_app_token', skipCache: true });
            logger.debug('SignUpScreen - New JWT with complete user data:', newToken ? 'Generated' : 'Failed');
            
            // Log the JWT details to verify custom fields
            if (newToken) {
              await logJWTDetails(getToken, 'SignUp Profile Completion JWT Analysis');
            }
          }
        } catch (userUpdateErr) {
          console.error('SignUpScreen - Error updating user data:', userUpdateErr);
        }
      }
      
      // TODO: Handle profile image upload if needed
      // if (profileImage) {
      //   await user?.setProfileImage({ file: profileImage });
      // }
      
      logger.debug('SignUpScreen - Profile completion successful');
      logger.debug('SignUpScreen - Final auth state - isSignedIn:', isSignedIn);
      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: () => {
          logger.debug('SignUpScreen - Profile completion alert dismissed');
        }}
      ]);
    } catch (err: any) {
      console.error('SignUpScreen - Profile completion error:', err);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.primaryLight, Colors.white, Colors.gray50]}
        style={styles.gradientBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            <ScrollView 
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
                <View style={styles.header}>
                  <View style={styles.logoContainer}>
                    <Ionicons name="bicycle" size={32} color={Colors.primary} />
                    <Text style={styles.logoText}>Roqet</Text>
                  </View>
                </View>
              
              <View style={styles.content}>
                {step === 1 && (
                  <NameStep
                    firstName={firstName}
                    lastName={lastName}
                    setFirstName={setFirstName}
                    setLastName={setLastName}
                    onNext={goToNextStep}
                  />
                )}
                
                {step === 2 && (
                  <PhoneStep
                    phoneNumber={phoneNumber}
                    setPhoneNumber={setPhoneNumber}
                    onNext={handleSendOTP}
                    isLoading={isLoading}
                    selectedCountry={selectedCountry}
                    phoneError={phoneError}
                  />
                )}
                
                {step === 3 && (
                  <OtpStep
                    otp={otp}
                    setOtp={setOtp}
                    onVerify={handleVerifyOTP}
                    isLoading={isLoading}
                    error={otpError}
                    resendOtp={handleResendOTP}
                    canResend={canResend}
                    timer={timer}
                    phoneNumber={phoneNumber}
                    countryCode={countryCode}
                    onEditPhone={handleEditPhone}
                  />
                )}
                
                {step === 4 && (
                  <CompleteStep
                    onComplete={handleCompleteProfile}
                    isLoading={isLoading}
                    firstName={firstName}
                    lastName={lastName}
                  />
                )}
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Layout.spacing.xl,
  },
  header: {
    paddingHorizontal: Layout.spacing.lg,
    paddingTop: Layout.spacing.lg,
    paddingBottom: Layout.spacing.md,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Layout.spacing.sm,
  },
  logoText: {
    fontSize: Layout.fontSize.xl,
    fontWeight: 'bold',
    color: Colors.primary,
    marginLeft: Layout.spacing.sm,
  },
  content: {
    flex: 1,
    paddingHorizontal: Layout.spacing.lg,
  },
  stepContainer: {
    flex: 1,
    paddingBottom: Layout.spacing.xl,
  },
  stepHeader: {
    marginBottom: Layout.spacing.xl,
  },
  progressIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Layout.spacing.md,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.gray300,
    marginHorizontal: 4,
  },
  progressDotActive: {
    backgroundColor: Colors.primary,
    transform: [{ scale: 1.2 }],
  },
  progressDotCompleted: {
    backgroundColor: Colors.success,
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.gray300,
    marginHorizontal: 4,
  },
  progressLineCompleted: {
    backgroundColor: Colors.success,
  },
  progressText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: Layout.fontSize.sm,
    textAlign: 'center',
  },
  stepContent: {
    flex: 1,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: Layout.spacing.xl,
  },
  stepIcon: {
    marginBottom: Layout.spacing.md,
  },
  stepTitle: {
    fontSize: Layout.fontSize.xxl,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Layout.spacing.sm,
  },
  stepSubtitle: {
    fontSize: Layout.fontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Layout.spacing.md,
  },
  inputsContainer: {
    marginBottom: Layout.spacing.xl,
  },
  inputContainer: {
    marginBottom: Layout.spacing.lg,
  },
  nextButton: {
    marginTop: Layout.spacing.lg,
  },
  // OTP specific styles
  otpContainer: {
    marginBottom: Layout.spacing.xl,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.md,
  },
  errorText: {
    color: Colors.error,
    fontSize: Layout.fontSize.sm,
    marginLeft: Layout.spacing.xs,
    textAlign: 'center',
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: Layout.spacing.lg,
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    backgroundColor: Colors.gray50,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  resendText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: Layout.fontSize.sm,
    marginLeft: Layout.spacing.xs,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerText: {
    color: Colors.textSecondary,
    fontSize: Layout.fontSize.sm,
    marginLeft: Layout.spacing.xs,
  },
  // Celebration styles
  celebrationHeader: {
    alignItems: 'center',
    marginBottom: Layout.spacing.xl,
  },
  celebrationIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Layout.spacing.lg,
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  celebrationTitle: {
    fontSize: Layout.fontSize.xxl,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Layout.spacing.sm,
    textAlign: 'center',
  },
  celebrationSubtitle: {
    fontSize: Layout.fontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: Layout.spacing.lg,
  },
  // Profile card styles
  profileCard: {
    backgroundColor: Colors.white,
    borderRadius: Layout.borderRadius.lg,
    padding: Layout.spacing.lg,
    marginBottom: Layout.spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Layout.spacing.lg,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Layout.spacing.md,
  },
  profileAvatarText: {
    fontSize: Layout.fontSize.lg,
    fontWeight: 'bold',
    color: Colors.white,
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    fontSize: Layout.fontSize.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Layout.spacing.xs,
  },
  profileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successLight,
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: Layout.spacing.xs,
    borderRadius: Layout.borderRadius.sm,
    alignSelf: 'flex-start',
  },
  profileBadgeText: {
    fontSize: Layout.fontSize.xs,
    fontWeight: '600',
    color: Colors.success,
    marginLeft: Layout.spacing.xs,
  },
  // Quick checklist styles
  quickChecklist: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Layout.spacing.md,
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Layout.spacing.sm,
  },
  checklistText: {
    fontSize: Layout.fontSize.sm,
    color: Colors.text,
    marginLeft: Layout.spacing.sm,
    fontWeight: '500',
  },
  // Phone display styles
  phoneDisplayContainer: {
    marginBottom: Layout.spacing.lg,
  },
  phoneDisplayCard: {
    backgroundColor: Colors.white,
    borderRadius: Layout.borderRadius.md,
    padding: Layout.spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  phoneDisplayInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  phoneDisplayText: {
    fontSize: Layout.fontSize.md,
    color: Colors.text,
    fontWeight: '600',
    marginLeft: Layout.spacing.sm,
  },
  editPhoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: Layout.spacing.xs,
    backgroundColor: Colors.gray50,
    borderRadius: Layout.borderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  editPhoneText: {
    fontSize: Layout.fontSize.sm,
    color: Colors.primary,
    fontWeight: '600',
    marginLeft: Layout.spacing.xs,
  },
});
