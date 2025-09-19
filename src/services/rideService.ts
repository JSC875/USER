import { useAuth } from '@clerk/clerk-expo';
import { serviceAvailabilityService, LocationData } from './serviceAvailabilityService';
import { logger } from '../utils/logger';

export interface RideDetails {
  id: string;
  status: string;
  otp: string;
  estimatedFare: number;
  requestedAt: string;
  pickupLat: number;
  pickupLng: number;
  dropLat: number;
  dropLng: number;
  customer?: {
    clerkUserId: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
  };
  driver?: {
    id?: string;
    firstName?: string;
    name?: string;
    phoneNumber?: string;
    phone?: string;
    rating?: number;
    averageRating?: number;
    driverRating?: number;
  };
  pilot?: {
    id?: string;
    firstName?: string;
    name?: string;
    phoneNumber?: string;
    phone?: string;
    rating?: number;
    averageRating?: number;
    driverRating?: number;
  };
}

export interface RideDetailsResponse {
  success: boolean;
  data?: RideDetails;
  message?: string;
  error?: string;
}

// Types for ride requests and responses
export interface RideRequestPayload {
  pickupLat: number;
  pickupLng: number;
  dropLat: number;
  dropLng: number;
  vehicleType: 'BIKE' | 'CAR' | 'AUTO';
}

export interface RideRequestResponse {
  id: string;
  status: 'REQUESTED' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  pickupLat: number;
  pickupLng: number;
  dropLat: number;
  dropLng: number;
  estimatedFare: number;
  requestedAt: string;
  userId: string;
  userType: string;
  referralCode?: string;
  preferredLanguage?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RideBookingRequest {
  pickup: {
    latitude: number;
    longitude: number;
    address?: string;
    name?: string;
  };
  drop: {
    latitude: number;
    longitude: number;
    address?: string;
    name?: string;
    id?: string;
    type?: string;
  };
  rideType: string;
  price?: number;
  userId: string;
}

class RideService {
  private baseUrl = 'https://bike-taxi-production.up.railway.app';

  /**
   * Check service availability before allowing ride operations
   */
  async checkServiceAvailability(location: LocationData): Promise<boolean> {
    try {
      const result = await serviceAvailabilityService.checkServiceAvailability(location);
      return result.success && result.data.isAvailable;
    } catch (error) {
      console.error('❌ Service availability check failed:', error);
      return false;
    }
  }

  /**
   * Request a ride via API endpoint
   */
  async requestRide(
    rideData: RideRequestPayload,
    getToken: () => Promise<string>
  ): Promise<RideRequestResponse> {
    try {
      logger.debug('🚗 === RIDE REQUEST API CALL ===');
      logger.debug('🎯 Endpoint: /api/rides/request');
      logger.debug('📋 Method: POST');
      logger.debug('📦 Request Payload:', JSON.stringify(rideData, null, 2));

      const token = await getToken();
      const response = await fetch(`${this.baseUrl}/api/rides/request`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-App-Version': '1.0.0',
          'X-Platform': 'ReactNative',
          'X-Environment': 'production',
        },
        body: JSON.stringify(rideData),
      });

      logger.debug('✅ === RIDE REQUEST API RESPONSE ===');
      logger.debug('📊 Response Status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ API Error Response:', errorData);
        throw new Error(`API request failed: ${response.status} - ${errorData.message || response.statusText}`);
      }

      const data = await response.json();
      if (__DEV__) {
        logger.debug('📏 Data Size:', JSON.stringify(data).length, 'characters');
      }

      return data;
    } catch (error) {
      console.error('❌ === RIDE REQUEST API ERROR ===');
      console.error('Error requesting ride:', error);
      throw error;
    }
  }

  /**
   * Convert booking request to API payload format
   */
  convertToApiPayload(bookingRequest: RideBookingRequest): RideRequestPayload {
    const vehicleTypeMap: { [key: string]: 'BIKE' | 'CAR' | 'AUTO' } = {
      'Bike': 'BIKE',
      'Car': 'CAR',
      'Auto': 'AUTO',
      'BIKE': 'BIKE',
      'CAR': 'CAR',
      'AUTO': 'AUTO',
      'bike': 'BIKE',
      'car': 'CAR',
      'auto': 'AUTO',
      'scooty': 'BIKE' // Map scooty to BIKE for now
    };

    return {
      pickupLat: bookingRequest.pickup.latitude,
      pickupLng: bookingRequest.pickup.longitude,
      dropLat: bookingRequest.drop.latitude,
      dropLng: bookingRequest.drop.longitude,
      vehicleType: vehicleTypeMap[bookingRequest.rideType] || 'BIKE'
    };
  }

  /**
   * Get ride details by ID
   */
  async getRideDetails(
    rideId: string,
    getToken: () => Promise<string>
  ): Promise<RideRequestResponse> {
    try {
      logger.debug('🔍 === GET RIDE DETAILS API CALL ===');
      logger.debug('🎯 Endpoint: /api/rides/' + rideId);
      logger.debug('📋 Method: GET');

      const token = await getToken();
      const response = await fetch(`${this.baseUrl}/api/rides/${rideId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-App-Version': '1.0.0',
          'X-Platform': 'ReactNative',
          'X-Environment': 'production',
        },
      });

      logger.debug('✅ === GET RIDE DETAILS API RESPONSE ===');
      logger.debug('📊 Response Status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ API Error Response:', errorData);
        throw new Error(`API request failed: ${response.status} - ${errorData.message || response.statusText}`);
      }

      const data = await response.json();
      if (__DEV__) {
        logger.debug('📏 Data Size:', JSON.stringify(data).length, 'characters');
      }

      return data;
    } catch (error) {
      console.error('❌ === GET RIDE DETAILS API ERROR ===');
      console.error('Error getting ride details:', error);
      throw error;
    }
  }

  /**
   * Cancel a ride
   */
  async cancelRide(
    rideId: string,
    getToken: () => Promise<string>
  ): Promise<{ success: boolean; message: string }> {
    try {
      logger.debug('❌ === CANCEL RIDE API CALL ===');
      logger.debug('🎯 Endpoint: /api/rides/' + rideId + '/cancel');
      logger.debug('📋 Method: PUT');

      const token = await getToken();
      const response = await fetch(`${this.baseUrl}/api/rides/${rideId}/cancel`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-App-Version': '1.0.0',
          'X-Platform': 'ReactNative',
          'X-Environment': 'production',
        },
      });

      logger.debug('✅ === CANCEL RIDE API RESPONSE ===');
      logger.debug('📊 Response Status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ API Error Response:', errorData);
        throw new Error(`API request failed: ${response.status} - ${errorData.message || response.statusText}`);
      }

      const data = await response.json();
      if (__DEV__) {
        logger.debug('📏 Data Size:', JSON.stringify(data).length, 'characters');
      }

      return data;
    } catch (error) {
      console.error('❌ === CANCEL RIDE API ERROR ===');
      console.error('Error canceling ride:', error);
      throw error;
    }
  }

  /**
   * Get user's active rides
   */
  async getActiveRides(
    getToken: () => Promise<string>
  ): Promise<RideRequestResponse[]> {
    try {
      logger.debug('📋 === GET ACTIVE RIDES API CALL ===');
      logger.debug('🎯 Endpoint: /api/rides/active');
      logger.debug('📋 Method: GET');

      const token = await getToken();
      const response = await fetch(`${this.baseUrl}/api/rides/active`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-App-Version': '1.0.0',
          'X-Platform': 'ReactNative',
          'X-Environment': 'production',
        },
      });

      logger.debug('✅ === GET ACTIVE RIDES API RESPONSE ===');
      logger.debug('📊 Response Status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ API Error Response:', errorData);
        throw new Error(`API request failed: ${response.status} - ${errorData.message || response.statusText}`);
      }

      const data = await response.json();
      if (__DEV__) {
        logger.debug('📏 Data Size:', JSON.stringify(data).length, 'characters');
      }

      return data;
    } catch (error) {
      console.error('❌ === GET ACTIVE RIDES API ERROR ===');
      console.error('Error getting active rides:', error);
      throw error;
    }
  }

  async getRideDetailsForOTP(rideId: string, token?: string): Promise<RideDetailsResponse> {
    try {
      if (!token) {
        throw new Error('No authentication token provided');
      }

      if (!rideId) {
        throw new Error('Ride ID is required');
      }

      logger.debug('🚀 Fetching ride details via API...');
      logger.debug('📍 Endpoint:', `${this.baseUrl}/api/rides/${rideId}`);
      logger.debug('🕐 API call timestamp:', new Date().toISOString());
      logger.debug('🆔 Ride ID:', rideId);

      const response = await fetch(`${this.baseUrl}/api/rides/${rideId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-App-Version': '1.0.0',
          'X-Platform': 'ReactNative',
          'X-Environment': 'production',
        },
      });

      logger.debug('📡 API Response Status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ API Error Response:', errorData);
        console.error('❌ API Status:', response.status);
        console.error('❌ API Status Text:', response.statusText);
        throw new Error(`API request failed: ${response.status} - ${errorData.message || response.statusText}`);
      }

      const data = await response.json();
      logger.debug('✅ Ride details fetched successfully via API:', data);
      logger.debug('🔐 OTP from backend:', data.otp);

      return {
        success: true,
        data: data,
        message: 'Ride details fetched successfully'
      };
    } catch (error) {
      console.error('❌ Error fetching ride details via API:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        message: 'Failed to fetch ride details'
      };
    }
  }

  async completeRide(rideId: string, token?: string): Promise<RideDetailsResponse> {
    try {
      if (!token) {
        throw new Error('No authentication token provided');
      }

      if (!rideId) {
        throw new Error('Ride ID is required');
      }

      logger.debug('🚀 Completing ride via API...');
      logger.debug('📍 Endpoint:', `${this.baseUrl}/api/rides/${rideId}/complete`);
      logger.debug('🕐 API call timestamp:', new Date().toISOString());
      logger.debug('🆔 Ride ID:', rideId);

      const response = await fetch(`${this.baseUrl}/api/rides/${rideId}/complete`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-App-Version': '1.0.0',
          'X-Platform': 'ReactNative',
          'X-Environment': 'production',
        },
      });

      logger.debug('📡 API Response Status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ API Error Response:', errorData);
        console.error('❌ API Status:', response.status);
        console.error('❌ API Status Text:', response.statusText);
        throw new Error(`API request failed: ${response.status} - ${errorData.message || response.statusText}`);
      }

      const data = await response.json();
      logger.debug('✅ Ride completed successfully via API:', data);

      return {
        success: true,
        data: data,
        message: 'Ride completed successfully'
      };
    } catch (error) {
      console.error('❌ Error completing ride via API:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        message: 'Failed to complete ride'
      };
    }
  }
}

export const rideService = new RideService();

// Export convenience functions for backward compatibility
export const rideApi = {
  requestRide: rideService.requestRide.bind(rideService),
  getRideDetails: rideService.getRideDetails.bind(rideService),
  cancelRide: rideService.cancelRide.bind(rideService),
  getActiveRides: rideService.getActiveRides.bind(rideService),
  convertToApiPayload: rideService.convertToApiPayload.bind(rideService),
};

export default rideService; 
