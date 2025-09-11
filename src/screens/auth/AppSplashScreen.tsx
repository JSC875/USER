import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import { Images } from '../../constants/Images';

interface AppSplashScreenProps {
  navigation?: any;
}

export default function AppSplashScreen({ navigation }: AppSplashScreenProps) {
  useEffect(() => {
    // Auto navigate to onboarding after 3 seconds
    const timer = setTimeout(() => {
      navigation?.replace?.('Onboarding');
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.animationContainer}>
        <LottieView
          source={require('../../../assets/lottie/redScooty.json')}
          autoPlay
          loop
          style={styles.animation}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  animationContainer: {
    width: 300,
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  animation: {
    width: '100%',
    height: '100%',
  },
});
