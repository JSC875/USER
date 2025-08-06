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

import rideService from '../../services/rideService';

interface MpinEntryScreenProps {
  route: any;
  navigation: any;
}

export default function MpinEntryScreen({ route, navigation }: MpinEntryScreenProps) {
  const { driver, rideId, destination, origin } = route.params;
  const { getToken } = useAuth();
  const [backendOtp, setBackendOtp] = useState<string>('');
  const [isLoadingOtp, setIsLoadingOtp] = useState(true);
  const [otpVerified, setOtpVerified] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  console.log('🔐 Customer MpinEntryScreen received data:', { driver, rideId, destination, origin });

  // Fetch ride details and OTP from backend
  useEffect(() => {
    const fetchRideDetails = async () => {
      try {
        console.log('🔐 Fetching ride details for OTP...');
        const token = await getToken({ template: 'my_app_token', skipCache: true });
        const response = await rideService.getRideDetailsForOTP(rideId, token);
        
        if (response.success && response.data?.otp) {
          console.log('🔐 OTP fetched from backend:', response.data.otp);
          setBackendOtp(response.data.otp);
        } else {
          console.log('⚠️ No OTP found in ride details');
        }
      } catch (error) {
        console.error('❌ Error fetching ride details:', error);
      } finally {
        setIsLoadingOtp(false);
      }
    };

    if (rideId) {
      fetchRideDetails();
    } else {
      setIsLoadingOtp(false);
    }
  }, [rideId, getToken]);

  // Listen for OTP verification from driver
  useEffect(() => {
    const socket = require('../../utils/socket').getSocket();
    
    if (socket) {
      // Listen for driver sending OTP (this means OTP was verified successfully)
      const handleDriverSentOtp = (data: any) => {
        console.log('✅ Driver sent OTP (verification successful):', data);
        if (data.rideId === rideId && !otpVerified) {
          console.log('✅ OTP verification successful, navigating to RideInProgress');
          setOtpVerified(true);
          
          // Navigate to ride in progress
          navigation.replace('RideInProgress', {
            driver,
            rideId,
            destination,
            origin,
            otpVerified: true,
          });
        }
      };

      // Listen for ride state changes (when OTP is verified, ride state changes)
      const handleRideStateChanged = (data: any) => {
        console.log('🔄 Ride state changed:', data);
        if (data.rideId === rideId && data.to === 'in_progress' && !otpVerified) {
          console.log('✅ Ride started (OTP verified), navigating to RideInProgress');
          setOtpVerified(true);
          
          // Navigate to ride in progress
          navigation.replace('RideInProgress', {
            driver,
            rideId,
            destination,
            origin,
            otpVerified: true,
          });
        }
      };

      // Listen for driver arrival (fallback)
      const handleDriverArrived = (data: any) => {
        console.log('🚗 Driver arrived:', data);
        if (data.rideId === rideId) {
          console.log('✅ Driver arrived, ride can proceed');
        }
      };

      // Listen for ride started event
      const handleRideStarted = (data: any) => {
        console.log('🚀 Ride started:', data);
        if (data.rideId === rideId && !otpVerified) {
          console.log('✅ Ride started, navigating to RideInProgress');
          setOtpVerified(true);
          
          // Navigate to ride in progress
          navigation.replace('RideInProgress', {
            driver,
            rideId,
            destination,
            origin,
            otpVerified: true,
          });
        }
      };

      socket.on('DRIVER_SENT_OTP', handleDriverSentOtp);
      socket.on('RIDE_STATE_CHANGED', handleRideStateChanged);
      socket.on('DRIVER_ARRIVED', handleDriverArrived);
      socket.on('ride_started', handleRideStarted);

      return () => {
        socket.off('DRIVER_SENT_OTP', handleDriverSentOtp);
        socket.off('RIDE_STATE_CHANGED', handleRideStateChanged);
        socket.off('DRIVER_ARRIVED', handleDriverArrived);
        socket.off('ride_started', handleRideStarted);
      };
    }
  }, [rideId, navigation, driver, destination, origin, otpVerified]);

  useEffect(() => {
    Animated.spring(anim, {
      toValue: 1,
      friction: 7,
      tension: 60,
      useNativeDriver: true,
    }).start();
  }, []);



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
          <Text style={{ fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 16 }}>
            Share this OTP with your driver to start your ride
          </Text>
          
          {/* OTP Display Section */}
          {isLoadingOtp ? (
            <View style={{ 
              backgroundColor: '#f0f8ff', 
              padding: 12, 
              borderRadius: 8, 
              marginBottom: 8,
              minWidth: 200,
              alignItems: 'center'
            }}>
              <Text style={{ fontSize: 14, color: '#666' }}>
                Loading OTP...
              </Text>
            </View>
          ) : backendOtp ? (
            <View style={{ 
              backgroundColor: '#e8f5e8', 
              padding: 12, 
              borderRadius: 8, 
              marginBottom: 8,
              minWidth: 200,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: '#4CAF50'
            }}>
              <Text style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
                Your OTP from backend:
              </Text>
              <Text style={{ 
                fontSize: 20, 
                fontWeight: 'bold', 
                color: '#4CAF50',
                letterSpacing: 2,
                fontFamily: 'monospace'
              }}>
                {backendOtp}
              </Text>
              <TouchableOpacity
                style={{
                  backgroundColor: '#4CAF50',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 6,
                  marginTop: 8
                }}
                onPress={() => {
                  console.log('🔐 OTP button pressed - OTP:', backendOtp);
                }}
              >
                <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>
                  OTP Ready
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ 
              backgroundColor: '#fff3cd', 
              padding: 12, 
              borderRadius: 8, 
              marginBottom: 8,
              minWidth: 200,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: '#ffc107'
            }}>
              <Text style={{ fontSize: 14, color: '#856404' }}>
                OTP not available
              </Text>
            </View>
          )}
        </View>

        <View style={{ 
          backgroundColor: '#f8f9fa', 
          padding: 20, 
          borderRadius: 12, 
          marginBottom: 20,
          borderWidth: 1,
          borderColor: '#e9ecef'
        }}>
          <Text style={{ 
            fontSize: 16, 
            color: '#495057', 
            textAlign: 'center', 
            marginBottom: 12,
            fontWeight: '500'
          }}>
            Waiting for driver to enter OTP...
          </Text>
          <Text style={{ 
            fontSize: 14, 
            color: '#6c757d', 
            textAlign: 'center',
            lineHeight: 20,
            marginBottom: 16
          }}>
            Your driver will enter the OTP shown above to start the ride
          </Text>
          
          {/* Manual continue button as fallback */}
          <TouchableOpacity
            style={{
              backgroundColor: '#28a745',
              paddingVertical: 12,
              paddingHorizontal: 24,
              borderRadius: 8,
              alignItems: 'center'
            }}
            onPress={() => {
              console.log('🚀 Manual continue pressed - navigating to RideInProgress');
              navigation.replace('RideInProgress', {
                driver,
                rideId,
                destination,
                origin,
                otpVerified: true,
              });
            }}
          >
            <Text style={{ 
              color: '#fff', 
              fontWeight: '600', 
              fontSize: 16 
            }}>
              Continue to Ride
            </Text>
          </TouchableOpacity>
        </View>

        {/* Debug info */}
        <View style={{ 
          backgroundColor: '#fff3cd', 
          padding: 12, 
          borderRadius: 8, 
          marginBottom: 20,
          borderWidth: 1,
          borderColor: '#ffeaa7'
        }}>
          <Text style={{ 
            fontSize: 12, 
            color: '#856404', 
            textAlign: 'center',
            fontFamily: 'monospace'
          }}>
            Debug: Ride ID: {rideId} | OTP: {backendOtp} | Verified: {otpVerified ? 'Yes' : 'No'}
          </Text>
        </View>

      </Animated.View>
    </SafeAreaView>
  );
} 