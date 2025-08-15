import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, TITLE_COLOR } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';

// Try to import LinearGradient, fallback to View if not available
let LinearGradient: any = View;
try {
  const { LinearGradient: LG } = require('expo-linear-gradient');
  LinearGradient = LG;
} catch (error) {
  console.log('LinearGradient not available, using fallback background');
}

const { width, height } = Dimensions.get('window');

export default function ComingSoonScreen({ navigation }: any) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Initial animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous pulse animation
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();

    // Continuous rotation animation
    const rotateAnimation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 4000,
        useNativeDriver: true,
      })
    );
    rotateAnimation.start();

    // Floating animation
    const floatAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    );
    floatAnimation.start();
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const float = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -15],
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#2ecc71', '#27ae60', '#229954']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={styles.backButton}
            accessibilityLabel="Back"
          >
            <Ionicons name="arrow-back" size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Coming Soon</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Main Content */}
        <Animated.View 
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [
                { scale: scaleAnim },
                { translateY: slideAnim }
              ]
            }
          ]}
        >
          {/* Animated Icon */}
          <Animated.View 
            style={[
              styles.iconContainer,
              {
                transform: [
                  { scale: pulseAnim },
                  { translateY: float }
                ]
              }
            ]}
          >
            <View style={styles.iconBackground}>
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <Ionicons name="time" size={60} color={Colors.white} />
              </Animated.View>
            </View>
            <View style={styles.iconGlow} />
          </Animated.View>

          {/* Title */}
          <Text style={styles.title}>Schedule Ride</Text>
          
          {/* Subtitle */}
          <Text style={styles.subtitle}>
            Get ready to plan your rides in advance! We're bringing you the ultimate scheduling experience.
          </Text>

          {/* Features List */}
          <View style={styles.featuresContainer}>
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="calendar" size={20} color={Colors.white} />
              </View>
              <Text style={styles.featureText}>Book rides up to 7 days in advance</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="options" size={20} color={Colors.white} />
              </View>
              <Text style={styles.featureText}>Flexible scheduling options</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="location" size={20} color={Colors.white} />
              </View>
              <Text style={styles.featureText}>Real-time driver tracking</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="shield-checkmark" size={20} color={Colors.white} />
              </View>
              <Text style={styles.featureText}>Secure payment integration</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={20} color={Colors.primary} style={{ marginRight: 8 }} />
              <Text style={styles.primaryButtonText}>Go Back</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={() => navigation.navigate('HelpSupport')}
            >
              <Ionicons name="notifications" size={20} color={Colors.white} />
              <Text style={styles.secondaryButtonText}>Get Notified</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Floating Elements */}
        <Animated.View 
          style={[
            styles.floatingElement1,
            {
              transform: [
                { translateY: float },
                { translateX: floatAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 10]
                })}
              ]
            }
          ]}
        >
          <Ionicons name="car" size={28} color={Colors.white} style={{ opacity: 0.4 }} />
        </Animated.View>

        <Animated.View 
          style={[
            styles.floatingElement2,
            {
              transform: [
                { translateY: floatAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -10]
                })},
                { translateX: floatAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -5]
                })}
              ]
            }
          ]}
        >
          <Ionicons name="location" size={24} color={Colors.white} style={{ opacity: 0.4 }} />
        </Animated.View>

        <Animated.View 
          style={[
            styles.floatingElement3,
            {
              transform: [
                { translateY: floatAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 8]
                })},
                { translateX: floatAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -8]
                })}
              ]
            }
          ]}
        >
          <Ionicons name="time" size={20} color={Colors.white} style={{ opacity: 0.3 }} />
        </Animated.View>

        {/* Background Pattern */}
        <View style={styles.backgroundPattern}>
          {[...Array(6)].map((_, index) => (
            <Animated.View
              key={index}
              style={[
                styles.patternDot,
                {
                  left: `${15 + index * 15}%`,
                  top: `${20 + (index % 2) * 60}%`,
                  transform: [
                    {
                      scale: floatAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1.2]
                      })
                    }
                  ]
                }
              ]}
            />
          ))}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    backgroundColor: '#2ecc71', // Fallback background color
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.spacing.lg,
    paddingTop: Layout.spacing.xl,
    paddingBottom: Layout.spacing.md,
  },
  backButton: {
    padding: 12,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  headerTitle: {
    fontSize: Layout.fontSize.xl,
    fontWeight: 'bold',
    color: Colors.white,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Layout.spacing.xl,
  },
  iconContainer: {
    marginBottom: Layout.spacing.xl,
    alignItems: 'center',
  },
  iconBackground: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  iconGlow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: Layout.spacing.md,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: Layout.fontSize.lg,
    color: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: Layout.spacing.xl,
    paddingHorizontal: Layout.spacing.lg,
  },
  featuresContainer: {
    width: '100%',
    marginBottom: Layout.spacing.xl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Layout.spacing.lg,
    paddingHorizontal: Layout.spacing.lg,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Layout.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  featureText: {
    fontSize: Layout.fontSize.md,
    color: Colors.white,
    flex: 1,
    fontWeight: '500',
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: Colors.white,
    paddingVertical: Layout.spacing.lg,
    paddingHorizontal: Layout.spacing.xl,
    borderRadius: 16,
    marginBottom: Layout.spacing.md,
    minWidth: 220,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: {
    fontSize: Layout.fontSize.lg,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  secondaryButtonText: {
    fontSize: Layout.fontSize.md,
    color: Colors.white,
    marginLeft: Layout.spacing.sm,
    fontWeight: '500',
  },
  floatingElement1: {
    position: 'absolute',
    top: height * 0.25,
    right: width * 0.08,
  },
  floatingElement2: {
    position: 'absolute',
    bottom: height * 0.25,
    left: width * 0.08,
  },
  floatingElement3: {
    position: 'absolute',
    top: height * 0.6,
    right: width * 0.15,
  },
  backgroundPattern: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  patternDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
});
