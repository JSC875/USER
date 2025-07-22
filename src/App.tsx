import { onRideAccepted, connectSocketWithJWT, clearCallbacks } from './utils/socket';
import { useNavigation } from '@react-navigation/native';
import { useState, useEffect } from 'react';

export default function App() {
  const navigation = useNavigation();
  const [acceptedRide, setAcceptedRide] = useState(null);

  useEffect(() => {
    // Connect socket and join correct room
    connectSocketWithJWT(/* getToken or userId */);
    // Persistent ride_accepted listener
    onRideAccepted((data) => {
      setAcceptedRide(data);
      // Navigate to LiveTrackingScreen with ride details
      navigation.navigate('LiveTracking', {
        driver: {
          id: data.driverId,
          name: data.driverName,
          phone: data.driverPhone,
          eta: data.estimatedArrival,
        },
        rideId: data.rideId,
        // Add other ride details as needed
      });
    });
    return () => {
      clearCallbacks();
    };
  }, [navigation]);

  return (
    // Your app's main component structure would go here
    // For example, a navigation container or a main screen
    <div>
      {/* Placeholder for other app content */}
      <h1>Welcome to Your App</h1>
      <p>This is the main App component.</p>
    </div>
  );
} 