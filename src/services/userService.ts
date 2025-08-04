import { api } from './api';

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
      console.log('🔄 === /api/users/me GET REQUEST ===');
      console.log('🎯 Endpoint: /api/users/me');
      console.log('📋 Method: GET');
      console.log('🔐 Requires Auth: true');
      
      const response = await api.getAuth<UserProfile>('/api/users/me', getToken);
      
      console.log('✅ === /api/users/me GET RESPONSE ===');
      console.log('📊 Response Success:', response.success);
      console.log('📦 Response Data:', response.data);
      console.log('📏 Data Size:', JSON.stringify(response.data).length, 'characters');
      
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
      console.log('🔄 === /api/users/me PUT REQUEST ===');
      console.log('🎯 Endpoint: /api/users/me');
      console.log('📋 Method: PUT');
      console.log('🔐 Requires Auth: true');
      console.log('📦 Request Payload:');
      console.log(JSON.stringify(updateData, null, 2));
      
      const response = await api.putAuth<UserProfile>('/api/users/me', updateData, getToken);
      
      console.log('✅ === /api/users/me PUT RESPONSE ===');
      console.log('📊 Response Success:', response.success);
      console.log('📦 Response Data:', response.data);
      console.log('📏 Data Size:', JSON.stringify(response.data).length, 'characters');
      
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
      const transformedRides: RideHistory[] = response.data!.map((ride: any) => ({
        id: ride.id,
        userId: ride.customer?.clerkUserId || '',
        driverId: ride.driverId,
        pickupLocation: {
          address: 'Pickup Location', // API doesn't provide address, using default
          latitude: ride.pickupLat || 0,
          longitude: ride.pickupLng || 0,
        },
        dropLocation: {
          address: 'Destination', // API doesn't provide address, using default
          latitude: ride.dropLat || 0,
          longitude: ride.dropLng || 0,
        },
        status: ride.status || 'pending',
        fare: ride.estimatedFare || 0,
        distance: 0, // API doesn't provide distance, defaulting to 0
        duration: 0, // API doesn't provide duration, defaulting to 0
        rating: ride.rating,
        createdAt: ride.requestedAt || ride.createdAt || new Date().toISOString(),
        updatedAt: ride.updatedAt || new Date().toISOString(),
        completedAt: ride.completedAt,
        cancelledAt: ride.cancelledAt,
        cancellationReason: ride.cancellationReason,
        paymentMethod: 'cash', // Default payment method
        paymentStatus: 'pending', // Default payment status
        driverName: ride.driverName,
        driverPhone: ride.driverPhone,
        driverRating: ride.driverRating,
        vehicleNumber: ride.vehicleNumber,
        vehicleModel: ride.vehicleModel,
      }));
      
      return transformedRides;
    } catch (error) {
      console.error('Error fetching ride history:', error);
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