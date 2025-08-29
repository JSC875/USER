import { io, Socket } from 'socket.io-client';
import UberStyleNotificationService, {
  RideProgressData,
  DriverInfo,
} from './uberStyleNotificationService';
import { config } from '../config/environment';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface RideUpdateEvent {
  rideId: string;
  status: 'accepted' | 'en_route' | 'arrived' | 'pickup_complete' | 'in_progress' | 'completed';
  driverInfo?: DriverInfo;
  eta?: string;
  distance?: string;
  progress?: number;
  pinCode?: string;
  fare?: number;
  pickupLocation?: string;
  dropoffLocation?: string;
  timestamp: number;
}

export interface DriverLocationUpdate {
  rideId: string;
  driverId: string;
  latitude: number;
  longitude: number;
  eta: string;
  distance: string;
  progress: number;
  timestamp: number;
}

class RideNotificationSocketService {
  private static instance: RideNotificationSocketService;
  private socket: Socket | null = null;
  private notificationService: UberStyleNotificationService;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval: NodeJS.Timeout | null = null;
  private activeRides: Map<string, RideProgressData> = new Map();
  private locationUpdateInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.notificationService = UberStyleNotificationService.getInstance();
  }

  static getInstance(): RideNotificationSocketService {
    if (!RideNotificationSocketService.instance) {
      RideNotificationSocketService.instance = new RideNotificationSocketService();
    }
    return RideNotificationSocketService.instance;
  }

  /**
   * Initialize socket connection
   */
  async initialize(): Promise<void> {
    try {
      await this.notificationService.initialize();
      await this.connectSocket();
      this.setupSocketEventListeners();
      console.log('✅ Ride notification socket service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize ride notification socket service:', error);
    }
  }

  /**
   * Connect to Socket.IO server
   */
  private async connectSocket(): Promise<void> {
    try {
      const authToken = await this.getAuthToken();
      if (!authToken) {
        console.error('❌ No auth token available for socket connection');
        return;
      }

      this.socket = io(config.SOCKET_URL || 'https://testsocketio-roqet.up.railway.app', {
        auth: {
          token: authToken,
        },
        transports: ['websocket', 'polling'],
        timeout: 20000,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        pingTimeout: 60000,
        pingInterval: 25000,
      });

      this.socket.on('connect', this.handleSocketConnect.bind(this));
      this.socket.on('disconnect', this.handleSocketDisconnect.bind(this));
      this.socket.on('connect_error', this.handleSocketError.bind(this));

      console.log('🔌 Socket connection initiated');
    } catch (error) {
      console.error('❌ Error connecting to socket:', error);
    }
  }

  /**
   * Set up socket event listeners for ride updates
   */
  private setupSocketEventListeners(): void {
    if (!this.socket) return;

    // Ride status updates
    this.socket.on('ride_accepted', this.handleRideAccepted.bind(this));
    this.socket.on('ride_en_route', this.handleRideEnRoute.bind(this));
    this.socket.on('ride_arrived', this.handleRideArrived.bind(this));
    this.socket.on('ride_started', this.handleRideStarted.bind(this));
    this.socket.on('ride_completed', this.handleRideCompleted.bind(this));
    this.socket.on('ride_cancelled', this.handleRideCancelled.bind(this));

    // Driver location updates
    this.socket.on('driver_location_update', this.handleDriverLocationUpdate.bind(this));

    // PIN confirmation
    this.socket.on('pin_generated', this.handlePinGenerated.bind(this));
    
    // Action response handlers
    this.socket.on('pin_confirmation_success', this.handlePinConfirmationSuccess.bind(this));
    this.socket.on('pin_confirmation_error', this.handlePinConfirmationError.bind(this));
    this.socket.on('message_driver_success', this.handleMessageDriverSuccess.bind(this));
    this.socket.on('message_driver_error', this.handleMessageDriverError.bind(this));
    this.socket.on('call_driver_success', this.handleCallDriverSuccess.bind(this));
    this.socket.on('call_driver_error', this.handleCallDriverError.bind(this));
    this.socket.on('ride_cancellation_success', this.handleRideCancellationSuccess.bind(this));
    this.socket.on('ride_cancellation_error', this.handleRideCancellationError.bind(this));

    // Error handling
    this.socket.on('error', this.handleSocketError.bind(this));
  }

  /**
   * Handle socket connection
   */
  private handleSocketConnect(): void {
    console.log('✅ Socket connected successfully');
    this.isConnected = true;
    this.reconnectAttempts = 0;
    
    // Join customer room
    this.joinCustomerRoom();
  }

  /**
   * Handle socket disconnection
   */
  private handleSocketDisconnect(reason: string): void {
    console.log('❌ Socket disconnected:', reason);
    this.isConnected = false;
    
    if (reason === 'io server disconnect') {
      // Server disconnected us, try to reconnect
      this.socket?.connect();
    }
  }

  /**
   * Handle socket connection error
   */
  private handleSocketError(error: Error): void {
    console.error('❌ Socket connection error:', error);
    this.isConnected = false;
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.socket?.connect();
      }, 1000 * this.reconnectAttempts);
    }
  }

  /**
   * Join customer room for ride updates
   */
  private async joinCustomerRoom(): Promise<void> {
    try {
      const userId = await this.getUserId();
      if (userId && this.socket) {
        this.socket.emit('join_customer_room', { userId });
        console.log('👤 Joined customer room for user:', userId);
      }
    } catch (error) {
      console.error('❌ Error joining customer room:', error);
    }
  }

  /**
   * Handle ride accepted event
   */
  private handleRideAccepted(data: RideUpdateEvent): void {
    console.log('🚗 Ride accepted:', data);
    
    if (!data.driverInfo) {
      console.error('❌ No driver info in ride accepted event');
      return;
    }

    const rideProgress: RideProgressData = {
      rideId: data.rideId,
      driverInfo: data.driverInfo,
      pickupLocation: data.pickupLocation || '',
      dropoffLocation: data.dropoffLocation || '',
      eta: data.eta || 'Calculating...',
      distance: data.distance || 'Calculating...',
      progress: data.progress || 0,
      status: 'accepted',
    };

    this.activeRides.set(data.rideId, rideProgress);
    this.notificationService.sendRideProgressNotification(rideProgress);
  }

  /**
   * Handle ride en route event
   */
  private handleRideEnRoute(data: RideUpdateEvent): void {
    console.log('🚗 Ride en route:', data);
    
    const existingRide = this.activeRides.get(data.rideId);
    if (!existingRide) {
      console.error('❌ No existing ride found for en route update');
      return;
    }

    const updatedRide: RideProgressData = {
      ...existingRide,
      status: 'en_route',
      eta: data.eta || existingRide.eta,
      distance: data.distance || existingRide.distance,
      progress: data.progress || existingRide.progress,
    };

    this.activeRides.set(data.rideId, updatedRide);
    this.notificationService.updateRideProgressNotification(updatedRide);
  }

  /**
   * Handle ride arrived event
   */
  private handleRideArrived(data: RideUpdateEvent): void {
    console.log('🚗 Driver arrived:', data);
    
    const existingRide = this.activeRides.get(data.rideId);
    if (!existingRide) {
      console.error('❌ No existing ride found for arrived update');
      return;
    }

    const updatedRide: RideProgressData = {
      ...existingRide,
      status: 'arrived',
      eta: 'Arrived',
      distance: 'At pickup location',
      progress: 100,
    };

    this.activeRides.set(data.rideId, updatedRide);
    this.notificationService.updateRideProgressNotification(updatedRide);
  }

  /**
   * Handle ride started event
   */
  private handleRideStarted(data: RideUpdateEvent): void {
    console.log('🚗 Ride started:', data);
    
    const existingRide = this.activeRides.get(data.rideId);
    if (!existingRide) {
      console.error('❌ No existing ride found for started update');
      return;
    }

    const updatedRide: RideProgressData = {
      ...existingRide,
      status: 'pickup_complete',
      eta: 'Ride in progress',
      distance: 'En route to destination',
      progress: 0, // Reset progress for destination journey
    };

    this.activeRides.set(data.rideId, updatedRide);
    this.notificationService.updateRideProgressNotification(updatedRide);
  }

  /**
   * Handle ride completed event
   */
  private handleRideCompleted(data: RideUpdateEvent): void {
    console.log('✅ Ride completed:', data);
    
    const existingRide = this.activeRides.get(data.rideId);
    if (!existingRide) {
      console.error('❌ No existing ride found for completed update');
      return;
    }

    const completedRide: RideProgressData = {
      ...existingRide,
      status: 'completed',
      eta: 'Completed',
      distance: 'Ride finished',
      progress: 100,
      fare: data.fare,
    };

    this.activeRides.delete(data.rideId);
    this.notificationService.sendRideCompletedNotification(completedRide);
  }

  /**
   * Handle ride cancelled event
   */
  private handleRideCancelled(data: { rideId: string; reason?: string }): void {
    console.log('❌ Ride cancelled:', data);
    
    const existingRide = this.activeRides.get(data.rideId);
    if (existingRide) {
      this.activeRides.delete(data.rideId);
    }

    // Cancel any active notifications for this ride
    this.notificationService.updateRideProgressNotification({
      ...existingRide!,
      status: 'completed',
      eta: 'Cancelled',
      distance: 'Ride cancelled',
      progress: 0,
    });
  }

  /**
   * Handle driver location update
   */
  private handleDriverLocationUpdate(data: DriverLocationUpdate): void {
    console.log('📍 Driver location update:', data);
    
    const existingRide = this.activeRides.get(data.rideId);
    if (!existingRide) {
      console.log('⚠️ No active ride found for location update');
      return;
    }

    // Update ride progress with new location data
    const updatedRide: RideProgressData = {
      ...existingRide,
      eta: data.eta,
      distance: data.distance,
      progress: data.progress,
    };

    this.activeRides.set(data.rideId, updatedRide);
    
    // Update notification if ride is in progress
    if (['en_route', 'arrived'].includes(updatedRide.status)) {
      this.notificationService.updateRideProgressNotification(updatedRide);
    }
  }

  /**
   * Handle PIN generation
   */
  private handlePinGenerated(data: { rideId: string; pinCode: string }): void {
    console.log('🔐 PIN generated:', data);
    
    const existingRide = this.activeRides.get(data.rideId);
    if (!existingRide) {
      console.error('❌ No existing ride found for PIN generation');
      return;
    }

    const rideWithPin: RideProgressData = {
      ...existingRide,
      pinCode: data.pinCode,
    };

    this.activeRides.set(data.rideId, rideWithPin);
    this.notificationService.sendPinConfirmationNotification(rideWithPin);
  }

  /**
   * Subscribe to ride updates
   */
  subscribeToRide(rideId: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('subscribe_to_ride', { rideId });
      console.log('📡 Subscribed to ride updates:', rideId);
    }
  }

  /**
   * Unsubscribe from ride updates
   */
  unsubscribeFromRide(rideId: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('unsubscribe_from_ride', { rideId });
      console.log('📡 Unsubscribed from ride updates:', rideId);
    }
    
    this.activeRides.delete(rideId);
  }

  /**
   * Send ride cancellation request
   */
  cancelRide(rideId: string, reason?: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('cancel_ride', { rideId, reason });
      console.log('❌ Ride cancellation requested:', rideId);
    }
  }

  /**
   * Send PIN confirmation
   */
  confirmPin(rideId: string, pinCode: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('confirm_pin', { rideId, pinCode });
      console.log('🔐 PIN confirmation sent:', rideId);
    }
  }

  /**
   * Send message to driver
   */
  sendMessageToDriver(rideId: string, message: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('message_driver', { rideId, message });
      console.log('💬 Message sent to driver:', rideId);
    }
  }

  /**
   * Request driver call information
   */
  callDriver(rideId: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('call_driver', { rideId });
      console.log('📞 Call driver requested:', rideId);
    }
  }

  /**
   * Get current ride data
   */
  getCurrentRide(rideId: string): RideProgressData | undefined {
    return this.activeRides.get(rideId);
  }

  /**
   * Get all active rides
   */
  getAllActiveRides(): RideProgressData[] {
    return Array.from(this.activeRides.values());
  }

  /**
   * Check if connected to socket
   */
  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  /**
   * Get authentication token
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('authToken');
    } catch (error) {
      console.error('❌ Error getting auth token:', error);
      return null;
    }
  }

  /**
   * Get user ID
   */
  private async getUserId(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('userId');
    } catch (error) {
      console.error('❌ Error getting user ID:', error);
      return null;
    }
  }

  // ========================================
  // ACTION RESPONSE HANDLERS
  // ========================================

  /**
   * Handle PIN confirmation success
   */
  private handlePinConfirmationSuccess(data: any): void {
    console.log('✅ PIN confirmation successful:', data);
    // Trigger callback for PIN confirmation success
    this.notificationService.triggerCallback('pin_confirmation_success', data);
  }

  /**
   * Handle PIN confirmation error
   */
  private handlePinConfirmationError(data: any): void {
    console.error('❌ PIN confirmation failed:', data);
    // Trigger callback for PIN confirmation error
    this.notificationService.triggerCallback('pin_confirmation_error', data);
  }

  /**
   * Handle message driver success
   */
  private handleMessageDriverSuccess(data: any): void {
    console.log('✅ Message sent to driver successfully:', data);
    // Trigger callback for message success
    this.notificationService.triggerCallback('message_driver_success', data);
  }

  /**
   * Handle message driver error
   */
  private handleMessageDriverError(data: any): void {
    console.error('❌ Failed to send message to driver:', data);
    // Trigger callback for message error
    this.notificationService.triggerCallback('message_driver_error', data);
  }

  /**
   * Handle call driver success
   */
  private handleCallDriverSuccess(data: any): void {
    console.log('✅ Call driver info received:', data);
    // Trigger callback for call success
    this.notificationService.triggerCallback('call_driver_success', data);
  }

  /**
   * Handle call driver error
   */
  private handleCallDriverError(data: any): void {
    console.error('❌ Failed to get call driver info:', data);
    // Trigger callback for call error
    this.notificationService.triggerCallback('call_driver_error', data);
  }

  /**
   * Handle ride cancellation success
   */
  private handleRideCancellationSuccess(data: any): void {
    console.log('✅ Ride cancelled successfully:', data);
    // Trigger callback for cancellation success
    this.notificationService.triggerCallback('ride_cancellation_success', data);
  }

  /**
   * Handle ride cancellation error
   */
  private handleRideCancellationError(data: any): void {
    console.error('❌ Failed to cancel ride:', data);
    // Trigger callback for cancellation error
    this.notificationService.triggerCallback('ride_cancellation_error', data);
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }
    
    if (this.locationUpdateInterval) {
      clearInterval(this.locationUpdateInterval);
      this.locationUpdateInterval = null;
    }
    
    this.activeRides.clear();
    this.isConnected = false;
    this.reconnectAttempts = 0;
  }
}

export default RideNotificationSocketService;
