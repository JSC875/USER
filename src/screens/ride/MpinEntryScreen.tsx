import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Animated,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@clerk/clerk-expo';
import { Colors } from '../../constants/Colors';
import { getUserIdFromJWT } from '../../utils/jwtDecoder';

interface MpinEntryScreenProps {
  route: any;
  navigation: any;
}

export default function MpinEntryScreen({ route, navigation }: MpinEntryScreenProps) {
  const { driver, rideId, destination, origin } = route.params;
  const { getToken } = useAuth();
  const [mpin, setMpin] = useState(['', '', '', '']);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;
  const inputRefs = useRef<(TextInput | null)[]>([]);

  console.log('🔐 Customer MpinEntryScreen received data:', { driver, rideId, destination, origin });

  useEffect(() => {
    Animated.spring(anim, {
      toValue: 1,
      friction: 7,
      tension: 60,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleChange = (val: string, idx: number) => {
    if (!/^[0-9]?$/.test(val)) return;
    const newMpin = [...mpin];
    newMpin[idx] = val;
    setMpin(newMpin);
    if (val && idx < 3) {
      inputRefs.current[idx + 1]?.focus();
      setFocusedIndex(idx + 1);
    }
    if (!val && idx > 0) {
      setFocusedIndex(idx - 1);
    }
  };

  const handleKeyPress = (e: any, idx: number) => {
    if (e.nativeEvent.key === 'Backspace' && !mpin[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
      setFocusedIndex(idx - 1);
    }
  };

  const handleSubmit = async () => {
    if (!mpin.every(d => d)) {
      Alert.alert('Incomplete MPIN', 'Please enter all 4 digits');
      return;
    }

    setSubmitted(true);
    setIsVerifying(true);

    try {
      // Get the entered MPIN
      const enteredMpin = mpin.join('');
      console.log('🔐 Customer entered MPIN:', enteredMpin);

      // Emit MPIN verification event to server
      const socket = require('../../utils/socket').getSocket();
      if (socket) {
        // Get the customer's user ID from JWT
        const customerUserId = await getUserIdFromJWT(getToken);
        
        socket.emit('verify_mpin', {
          rideId,
          mpin: enteredMpin,
          userId: customerUserId
        });
        console.log('🔐 Sent MPIN verification to server with userId:', customerUserId);
      } else {
        throw new Error('Socket not connected');
      }

      // Listen for MPIN verification response
      socket.on('mpin_verified', (data: any) => {
        console.log('✅ MPIN verification successful:', data);
        
        // Show success animation
        Animated.sequence([
          Animated.timing(checkAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.delay(600),
        ]).start(() => {
          console.log('✅ MPIN verification successful, navigating to RideInProgress');
          
          // Navigate to ride in progress screen
          navigation.replace('RideInProgress', {
            driver,
            rideId,
            destination,
            origin,
            mpinVerified: true,
          });
          
          setSubmitted(false);
          checkAnim.setValue(0);
          setIsVerifying(false);
        });
      });

      socket.on('mpin_error', (data: any) => {
        console.error('❌ MPIN verification failed:', data);
        Alert.alert('Verification Failed', data.message || 'Unable to verify MPIN. Please try again.');
        setSubmitted(false);
        setIsVerifying(false);
      });

    } catch (error) {
      console.error('❌ MPIN verification failed:', error);
      Alert.alert('Verification Failed', 'Unable to verify MPIN. Please try again.');
      setSubmitted(false);
      setIsVerifying(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' }}>
      <Animated.View style={{
        width: 320,
        backgroundColor: 'rgba(255,255,255,0.98)',
        borderRadius: 28,
        padding: 36,
        elevation: 24,
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 15 },
        alignItems: 'center',
        transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }],
      }}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={{ 
            position: 'absolute', 
            top: 18, 
            right: 18, 
            zIndex: 10, 
            backgroundColor: '#f6f6f6', 
            borderRadius: 18, 
            padding: 6 
          }}
        >
          <Ionicons name="close" size={26} color="#888" />
        </TouchableOpacity>
        
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <Ionicons name="bicycle" size={48} color={Colors.primary} style={{ marginBottom: 10 }} />
          <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 8, color: '#1877f2', letterSpacing: 1 }}>
            Driver Arrived!
          </Text>
          <Text style={{ fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 8 }}>
            {driver?.name || 'Your pilot'} has arrived at pickup location
          </Text>
          <Text style={{ fontSize: 14, color: '#888', textAlign: 'center' }}>
            Enter the 4-digit MPIN to start your ride
          </Text>
        </View>

        <View style={{ flexDirection: 'row', marginBottom: 32, gap: 8 }}>
          {mpin.map((digit, idx) => (
            <TextInput
              key={idx}
              ref={(ref) => { inputRefs.current[idx] = ref; }}
              style={{
                width: 44,
                height: 54,
                borderRadius: 12,
                borderWidth: 2,
                borderColor: focusedIndex === idx ? '#1877f2' : '#e0e0e0',
                backgroundColor: '#f7faff',
                fontSize: 28,
                color: '#222',
                textAlign: 'center',
                marginHorizontal: 2,
                shadowColor: focusedIndex === idx ? '#1877f2' : 'transparent',
                shadowOpacity: focusedIndex === idx ? 0.15 : 0,
                shadowRadius: 6,
                elevation: focusedIndex === idx ? 4 : 0,
              }}
              keyboardType="number-pad"
              maxLength={1}
              value={digit}
              onFocus={() => setFocusedIndex(idx)}
              onChangeText={val => handleChange(val, idx)}
              onKeyPress={e => handleKeyPress(e, idx)}
              returnKeyType="done"
              autoFocus={idx === 0}
              editable={!isVerifying}
            />
          ))}
        </View>

        <TouchableOpacity
          style={{ 
            backgroundColor: mpin.every(d => d) && !isVerifying ? '#1877f2' : '#b0b0b0', 
            borderRadius: 14, 
            paddingVertical: 16, 
            paddingHorizontal: 32, 
            width: '100%', 
            alignItems: 'center', 
            marginBottom: 8 
          }}
          onPress={handleSubmit}
          disabled={!mpin.every(d => d) || isVerifying}
          activeOpacity={mpin.every(d => d) && !isVerifying ? 0.8 : 1}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 20, letterSpacing: 1 }}>
            {isVerifying ? 'Verifying...' : 'Verify MPIN'}
          </Text>
        </TouchableOpacity>

        {submitted && (
          <Animated.View style={{ marginTop: 18, opacity: checkAnim, transform: [{ scale: checkAnim }] }}>
            <Ionicons name="checkmark-circle" size={48} color="#22C55E" />
          </Animated.View>
        )}
      </Animated.View>
    </SafeAreaView>
  );
} 