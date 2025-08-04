import { apiService } from './api';
import { apiConfig, isDevelopment } from '../config/environment';

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
  private baseUrl: string;

  constructor() {
    this.baseUrl = apiConfig.baseUrl;
    console.log('🚗 === RIDE SERVICE INITIALIZED ===');
    console.log('🌐 API Base URL:', this.baseUrl);
    console.log('🏗️ Environment:', isDevelopment ? 'development' : 'production');
  }

  /**
   * Request a ride via API endpoint
   */
  async requestRide(
    rideData: RideRequestPayload,
    getToken: () => Promise<string>
  ): Promise<RideRequestResponse> {
    try {
      console.log('🚗 === RIDE REQUEST API CALL ===');
      console.log('🎯 Endpoint: /api/rides/request');
      console.log('📋 Method: POST');
      console.log('📦 Request Payload:', JSON.stringify(rideData, null, 2));

      const response = await apiService.postAuth(
        '/api/rides/request',
        rideData,
        getToken
      );

      console.log('✅ === RIDE REQUEST API RESPONSE ===');
      console.log('📊 Response Success:', response.success);
      console.log('📦 Response Data:', response.data);
      console.log('📏 Data Size:', JSON.stringify(response.data).length, 'characters');

      if (!response.success) {
        throw new Error(response.error || 'Failed to request ride');
      }

      return response.data;
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
      'AUTO': 'AUTO'
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
      console.log('🔍 === GET RIDE DETAILS API CALL ===');
      console.log('🎯 Endpoint: /api/rides/' + rideId);
      console.log('📋 Method: GET');

      const response = await apiService.getAuth(
        `/api/rides/${rideId}`,
        getToken
      );

      console.log('✅ === GET RIDE DETAILS API RESPONSE ===');
      console.log('📊 Response Success:', response.success);
      console.log('📦 Response Data:', response.data);

      if (!response.success) {
        throw new Error(response.error || 'Failed to get ride details');
      }

      return response.data;
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
      console.log('❌ === CANCEL RIDE API CALL ===');
      console.log('🎯 Endpoint: /api/rides/' + rideId + '/cancel');
      console.log('📋 Method: POST');

      const response = await apiService.postAuth(
        `/api/rides/${rideId}/cancel`,
        {},
        getToken
      );

      console.log('✅ === CANCEL RIDE API RESPONSE ===');
      console.log('📊 Response Success:', response.success);
      console.log('📦 Response Data:', response.data);

      if (!response.success) {
        throw new Error(response.error || 'Failed to cancel ride');
      }

      return response.data;
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
      console.log('📋 === GET ACTIVE RIDES API CALL ===');
      console.log('🎯 Endpoint: /api/rides/active');
      console.log('📋 Method: GET');

      const response = await apiService.getAuth(
        '/api/rides/active',
        getToken
      );

      console.log('✅ === GET ACTIVE RIDES API RESPONSE ===');
      console.log('📊 Response Success:', response.success);
      console.log('📦 Response Data:', response.data);

      if (!response.success) {
        throw new Error(response.error || 'Failed to get active rides');
      }

      return response.data;
    } catch (error) {
      console.error('❌ === GET ACTIVE RIDES API ERROR ===');
      console.error('Error getting active rides:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const rideService = new RideService();

// Convenience functions
export const rideApi = {
  requestRide: rideService.requestRide.bind(rideService),
  getRideDetails: rideService.getRideDetails.bind(rideService),
  cancelRide: rideService.cancelRide.bind(rideService),
  getActiveRides: rideService.getActiveRides.bind(rideService),
  convertToApiPayload: rideService.convertToApiPayload.bind(rideService),
}; 