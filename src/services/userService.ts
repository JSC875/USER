import { api } from './api';
import Constants from 'expo-constants';
import { logger } from '../utils/logger';

// Utility function to calculate distance between two coordinates using Haversine formula
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  try {
    if (!lat1 || !lon1 || !lat2 || !lon2 || 
        lat1 === 0 || lon1 === 0 || lat2 === 0 || lon2 === 0) {
      return 0;
    }

    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in kilometers
    
    return Math.round(distance * 10) / 10; // Round to 1 decimal place
  } catch (error) {
    console.error('Error calculating distance:', error);
    return 0;
  }
};

// Utility function to reverse geocode coordinates to address
const reverseGeocode = async (latitude: number, longitude: number): Promise<string> => {
  try {
    if (!latitude || !longitude || latitude === 0 || longitude === 0) {
      return 'Unknown Location';
    }
    
    const apiKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.warn('Google Maps API key not found for reverse geocoding');
      return 'Unknown Location';
    }
    
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`
    );
    
    if (!response.ok) {
      return 'Unknown Location';
    }
    
    const data = await response.json();
    
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      return data.results[0].formatted_address;
    }
    
    return 'Unknown Location';
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    return 'Unknown Location';
  }
};

// User profile update interface
export interface UserProfileUpdate {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  profilePhoto?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  preferredLanguage?: string;
  referralCode?: string;
  referredBy?: string;
}

// User profile response interface
export interface UserProfile {
  id: string;
  clerkUserId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phoneNumber: string;
  dateOfBirth?: string;
  gender?: string;
  profilePhoto?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  preferredLanguage: string;
  referralCode: string;
  referredBy?: string;
  isActive: boolean;
  isVerified: boolean;
  rating: number;
  totalRides: number;
  walletBalance: number;
  createdAt: string;
  updatedAt: string;
  registrationDate: string;
}

// Ride history interface
export interface RideHistory {
  id: string;
  userId: string;
  driverId?: string;
  pickupLocation: {
    address: string;
    latitude: number;
    longitude: number;
  };
  dropLocation: {
    address: string;
    latitude: number;
    longitude: number;
  };
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled' | 'failed';
  fare: number;
  distance: number;
  duration: number;
  rating?: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  paymentMethod: string;
  paymentStatus: 'pending' | 'completed' | 'failed';
  driverName?: string;
  driverPhone?: string;
  driverRating?: number;
  vehicleNumber?: string;
  vehicleModel?: string;
}

// Ride history filter options
export interface RideHistoryFilters {
  status?: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled' | 'failed';
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

// User service class
class UserService {
  // Get current user profile
  async getCurrentUser(getToken: () => Promise<string | null>): Promise<UserProfile> {
    try {
      logger.debug('🔄 === /api/users/me GET REQUEST ===');
      logger.debug('🎯 Endpoint: /api/users/me');
      logger.debug('📋 Method: GET');
      logger.debug('🔐 Requires Auth: true');
      
      const response = await api.getAuth<UserProfile>('/api/users/me', getToken);
      
      if (__DEV__) {
        logger.debug('✅ === /api/users/me GET RESPONSE ===');
        logger.debug('📊 Response Success:', response.success);
        logger.debug('📏 Data Size:', JSON.stringify(response.data).length, 'characters');
      }
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch user profile');
      }
      
      return response.data!;
    } catch (error) {
      console.error('❌ === /api/users/me GET ERROR ===');
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }

  // Update user profile
  async updateUserProfile(
    updateData: UserProfileUpdate,
    getToken: () => Promise<string | null>
  ): Promise<UserProfile> {
    try {
      logger.debug('🔄 === /api/users/me PUT REQUEST ===');
      logger.debug('🎯 Endpoint: /api/users/me');
      logger.debug('📋 Method: PUT');
      logger.debug('🔐 Requires Auth: true');
      logger.debug('📦 Request Payload:');
      logger.debug(JSON.stringify(updateData, null, 2));
      
      const response = await api.putAuth<UserProfile>('/api/users/me', updateData, getToken);
      
      if (__DEV__) {
        logger.debug('✅ === /api/users/me PUT RESPONSE ===');
        logger.debug('📊 Response Success:', response.success);
        logger.debug('📏 Data Size:', JSON.stringify(response.data).length, 'characters');
      }
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to update user profile');
      }
      
      return response.data!;
    } catch (error) {
      console.error('❌ === /api/users/me PUT ERROR ===');
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  // Update user profile photo
  async updateProfilePhoto(
    photoUrl: string,
    getToken: () => Promise<string | null>
  ): Promise<UserProfile> {
    try {
      const response = await api.patchAuth<UserProfile>('/api/users/me', {
        profilePhoto: photoUrl
      }, getToken);
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to update profile photo');
      }
      
      return response.data!;
    } catch (error) {
      console.error('Error updating profile photo:', error);
      throw error;
    }
  }

  // Get user statistics
  async getUserStats(getToken: () => Promise<string | null>): Promise<{
    totalRides: number;
    rating: number;
    totalSpent: number;
    walletBalance: number;
  }> {
    try {
      const response = await api.getAuth<{
        totalRides: number;
        rating: number;
        totalSpent: number;
        walletBalance: number;
      }>('/api/users/me/stats', getToken);
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch user statistics');
      }
      
      return response.data!;
    } catch (error) {
      console.error('Error fetching user statistics:', error);
      throw error;
    }
  }

  // Get user ride history
  async getUserRideHistory(
    getToken: () => Promise<string | null>,
    filters?: RideHistoryFilters
  ): Promise<RideHistory[]> {
    try {
      // Build query parameters
      const queryParams = new URLSearchParams();
      
      if (filters?.status) queryParams.append('status', filters.status);
      if (filters?.startDate) queryParams.append('startDate', filters.startDate);
      if (filters?.endDate) queryParams.append('endDate', filters.endDate);
      if (filters?.limit) queryParams.append('limit', filters.limit.toString());
      if (filters?.offset) queryParams.append('offset', filters.offset.toString());

      const endpoint = `/api/users/me/rides${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      const response = await api.getAuth<any[]>(endpoint, getToken);
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch ride history');
      }
      
      // Transform API response to match RideHistory interface
      const transformedRides: RideHistory[] = await Promise.all(
        response.data!.map(async (ride: any) => {
          
          // Get coordinates first
          const pickupLat = ride.pickupLat || ride.pickup?.latitude || ride.pickupLocation?.latitude || 0;
          const pickupLng = ride.pickupLng || ride.pickup?.longitude || ride.pickupLocation?.longitude || 0;
          const dropLat = ride.dropLat || ride.drop?.latitude || ride.dropLocation?.latitude || 0;
          const dropLng = ride.dropLng || ride.drop?.longitude || ride.dropLocation?.longitude || 0;
          
          // Try to get addresses from various possible field names
          let pickupAddress = ride.pickupAddress || 
                             ride.pickup?.address || 
                             ride.pickupLocation?.address || 
                             ride.pickup_location?.address ||
                             ride.pickupAddressText ||
                             ride.pickupAddressName;
          
          let dropAddress = ride.dropAddress || 
                           ride.drop?.address || 
                           ride.dropLocation?.address || 
                           ride.drop_location?.address ||
                           ride.dropAddressText ||
                           ride.dropAddressName;
          
          // If addresses are not available, try to reverse geocode coordinates
          if (!pickupAddress && pickupLat && pickupLng) {
            pickupAddress = await reverseGeocode(pickupLat, pickupLng);
          }
          
          if (!dropAddress && dropLat && dropLng) {
            dropAddress = await reverseGeocode(dropLat, dropLng);
          }
          
          // Fallback to default values if still no address
          pickupAddress = pickupAddress || 'Pickup Location';
          dropAddress = dropAddress || 'Destination';
          
          // Calculate distance if not provided by API
          let calculatedDistance = ride.distance || 0;
          if (!calculatedDistance && pickupLat && pickupLng && dropLat && dropLng) {
            calculatedDistance = calculateDistance(pickupLat, pickupLng, dropLat, dropLng);
          }
          
          return {
            id: ride.id,
            userId: ride.customer?.clerkUserId || '',
            driverId: ride.driverId,
            pickupLocation: {
              address: pickupAddress,
              latitude: pickupLat,
              longitude: pickupLng,
            },
            dropLocation: {
              address: dropAddress,
              latitude: dropLat,
              longitude: dropLng,
            },
            status: ride.status || 'pending',
            fare: ride.estimatedFare || ride.fare || 0,
            distance: calculatedDistance,
            duration: ride.duration || 0,
            rating: ride.rating,
            createdAt: ride.requestedAt || ride.createdAt || new Date().toISOString(),
            updatedAt: ride.updatedAt || new Date().toISOString(),
            completedAt: ride.completedAt,
            cancelledAt: ride.cancelledAt,
            cancellationReason: ride.cancellationReason,
            paymentMethod: ride.paymentMethod || 'cash',
            paymentStatus: ride.paymentStatus || 'pending',
            driverName: ride.driverName,
            driverPhone: ride.driverPhone,
            driverRating: ride.driverRating,
            vehicleNumber: ride.vehicleNumber,
            vehicleModel: ride.vehicleModel,
          };
        })
      );
      
      return transformedRides;
    } catch (error) {
      logger.error('Error fetching ride history:', error);
      throw error;
    }
  }

  // Get ride details by ID
  async getRideDetails(
    rideId: string,
    getToken: () => Promise<string | null>
  ): Promise<RideHistory> {
    try {
      const response = await api.getAuth<RideHistory>(`/api/users/me/rides/${rideId}`, getToken);
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch ride details');
      }
      
      return response.data!;
    } catch (error) {
      console.error('Error fetching ride details:', error);
      throw error;
    }
  }

  // Rate a completed ride
  async rateRide(
    rideId: string,
    rating: number,
    getToken: () => Promise<string | null>,
    comment?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.postAuth<{ success: boolean; message: string }>(
        `/api/users/me/rides/${rideId}/rate`,
        { rating, comment },
        getToken
      );
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to rate ride');
      }
      
      return response.data!;
    } catch (error) {
      console.error('Error rating ride:', error);
      throw error;
    }
  }

  // Validate user profile data
  validateProfileData(data: UserProfileUpdate): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate required fields
    if (data.firstName && data.firstName.trim().length === 0) {
      errors.push('First name cannot be empty');
    }

    if (data.lastName && data.lastName.trim().length === 0) {
      errors.push('Last name cannot be empty');
    }

    // Validate email format
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push('Invalid email format');
    }

    // Validate phone number format (assuming Indian format)
    if (data.phoneNumber && !/^[0-9]{10}$/.test(data.phoneNumber.replace(/\D/g, ''))) {
      errors.push('Phone number must be 10 digits');
    }

    // Validate emergency contact phone
    if (data.emergencyContactPhone && !/^[0-9]{10}$/.test(data.emergencyContactPhone.replace(/\D/g, ''))) {
      errors.push('Emergency contact phone must be 10 digits');
    }

    // Validate date of birth
    if (data.dateOfBirth) {
      const dob = new Date(data.dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear();
      
      if (isNaN(dob.getTime())) {
        errors.push('Invalid date of birth');
      } else if (age < 18 || age > 100) {
        errors.push('Age must be between 18 and 100 years');
      }
    }

    // Validate gender
    if (data.gender && !['Male', 'Female', 'Other'].includes(data.gender)) {
      errors.push('Invalid gender selection');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Format user data for API
  formatUserDataForAPI(data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phoneNumber?: string;
    dateOfBirth?: string;
    gender?: string;
    profilePhoto?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    preferredLanguage?: string;
  }): UserProfileUpdate {
    const formattedData: UserProfileUpdate = {};

    // Only include fields that have values
    if (data.firstName?.trim()) formattedData.firstName = data.firstName.trim();
    if (data.lastName?.trim()) formattedData.lastName = data.lastName.trim();
    if (data.email?.trim()) formattedData.email = data.email.trim();
    if (data.phoneNumber?.trim()) formattedData.phoneNumber = data.phoneNumber.trim();
    if (data.dateOfBirth) formattedData.dateOfBirth = data.dateOfBirth;
    if (data.gender) formattedData.gender = data.gender;
    if (data.profilePhoto) formattedData.profilePhoto = data.profilePhoto;
    if (data.emergencyContactName?.trim()) formattedData.emergencyContactName = data.emergencyContactName.trim();
    if (data.emergencyContactPhone?.trim()) formattedData.emergencyContactPhone = data.emergencyContactPhone.trim();
    if (data.preferredLanguage) formattedData.preferredLanguage = data.preferredLanguage;

    return formattedData;
  }
}

// Create singleton instance
export const userService = new UserService();

// Export convenience functions
export const userApi = {
  getCurrentUser: (getToken: () => Promise<string | null>) => userService.getCurrentUser(getToken),
  updateUserProfile: (data: UserProfileUpdate, getToken: () => Promise<string | null>) => userService.updateUserProfile(data, getToken),
  updateProfilePhoto: (photoUrl: string, getToken: () => Promise<string | null>) => userService.updateProfilePhoto(photoUrl, getToken),
  getUserStats: (getToken: () => Promise<string | null>) => userService.getUserStats(getToken),
  getUserRideHistory: (getToken: () => Promise<string | null>, filters?: RideHistoryFilters) => userService.getUserRideHistory(getToken, filters),
  getRideDetails: (rideId: string, getToken: () => Promise<string | null>) => userService.getRideDetails(rideId, getToken),
  rateRide: (rideId: string, rating: number, getToken: () => Promise<string | null>, comment?: string) => userService.rateRide(rideId, rating, getToken, comment),
  validateProfileData: (data: UserProfileUpdate) => userService.validateProfileData(data),
  formatUserDataForAPI: (data: any) => userService.formatUserDataForAPI(data),
};

export default userService; 
