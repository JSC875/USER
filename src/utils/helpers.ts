import { useEffect } from 'react';
import { useUser } from '@clerk/clerk-expo';
import { useAuth } from '@clerk/clerk-expo';

export const formatCurrency = (amount: number): string => {
  return `₹${amount.toLocaleString('en-IN')}`;
};

export const formatTime = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes}mins`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes} m`;
};

export const formatDistance = (kilometers: number): string => {
  if (kilometers < 1) {
    return `${Math.round(kilometers * 1000)} m`;
  }
  return `${kilometers.toFixed(1)} km`;
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export const formatPhoneNumber = (phone: string): string => {
  // Format phone number as +91 XXXXX XXXXX
  if (phone.length === 10) {
    return `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`;
  }
  return phone;
};

export const generateRideId = (): string => {
  return `RIDE${Date.now().toString().slice(-6)}`;
};

export const calculateETA = (distance: number, averageSpeed: number = 25): number => {
  // Calculate ETA in minutes based on distance (km) and average speed (km/h)
  return Math.round((distance / averageSpeed) * 60);
};

export const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

/**
 * Custom hook to assign unsafeMetadata.type = "customer" to Clerk user if not already set.
 * @param {string} type - The user type to assign (e.g., "customer").
 */
export function useAssignUserType(type: string) {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded || !user) return;
    // Only assign if not already set
    if (user.unsafeMetadata?.type !== type) {
      user.update({ unsafeMetadata: { ...user.unsafeMetadata, type } });
    }
  }, [isLoaded, user, type]);
}

/**
 * Helper hook to make authenticated API calls with the custom Clerk JWT.
 * Usage: const apiCall = useApiWithAuth(); await apiCall(url, options)
 */
export function useApiWithAuth() {
  const { getToken } = useAuth();

  const apiCall = async (url: string, options: any = {}) => {
    const token = await getToken({ template: 'my_app_token', skipCache: true });
    const headers = {
      ...(options.headers || {}),
      'Authorization':` Bearer ${token}`,
      'Content-Type': 'application/json',
    };
    return fetch(url, { ...options, headers });
  };

  return apiCall;
}

/**
 * Calculate the distance between two lat/lng points in kilometers (Haversine formula)
 */
export function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}
function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Calculate ride fare based on distance, duration, and ride type
 */
export interface FareBreakdown {
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  totalFare: number;
  distance: string;
  duration: string;
}

export function calculateRideFare(
  distanceKm: number, 
  durationMinutes: number, 
  rideType: string = 'bike'
): FareBreakdown {
  // Fare structure based on ride type
  const fareStructure = {
    bike: {
      baseFare: 20,
      perKm: 8,
      perMinute: 0.5,
      minFare: 25,
      maxFare: 200
    },
    scooty: {
      baseFare: 25,
      perKm: 10,
      perMinute: 0.6,
      minFare: 30,
      maxFare: 250
    },
    auto: {
      baseFare: 30,
      perKm: 12,
      perMinute: 0.8,
      minFare: 40,
      maxFare: 300
    }
  };

  const structure = fareStructure[rideType as keyof typeof fareStructure] || fareStructure.bike;
  
  // Calculate fare components
  const baseFare = structure.baseFare;
  const distanceFare = Math.round(distanceKm * structure.perKm);
  const timeFare = Math.round(durationMinutes * structure.perMinute);
  
  // Calculate total fare
  let totalFare = baseFare + distanceFare + timeFare;
  
  // Apply minimum and maximum fare limits
  totalFare = Math.max(structure.minFare, totalFare);
  totalFare = Math.min(structure.maxFare, totalFare);
  
  // Format distance and duration
  const distance = formatDistance(distanceKm);
  const duration = formatTime(durationMinutes);
  
  return {
    baseFare,
    distanceFare,
    timeFare,
    totalFare,
    distance,
    duration
  };
}
