import Polyline from '@mapbox/polyline';

interface RoutePoint {
  latitude: number;
  longitude: number;
}

interface RouteResponse {
  success: boolean;
  route?: RoutePoint[];
  error?: string;
}

class RoutingService {
  private static instance: RoutingService;
  private apiKey: string = 'AIzaSyDHN3SH_ODlqnHcU9Blvv2pLpnDNkg03lU'; // Using the same API key as driver app

  private constructor() {}

  public static getInstance(): RoutingService {
    if (!RoutingService.instance) {
      RoutingService.instance = new RoutingService();
    }
    return RoutingService.instance;
  }

  /**
   * Get actual road route between two points using Google Directions API
   */
  async getRoute(
    origin: RoutePoint,
    destination: RoutePoint,
    mode: 'driving' | 'walking' | 'bicycling' = 'driving'
  ): Promise<RouteResponse> {
    try {
      console.log('🛣️ Fetching real route from Google Directions API...');
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&mode=${mode}&key=${this.apiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.routes.length > 0) {
        const route = data.routes[0];
        const points = this.decodePolyline(route.overview_polyline.points);
        
        console.log('✅ Real route fetched successfully with', points.length, 'points');
        return {
          success: true,
          route: points
        };
      } else {
        console.log('⚠️ Google Directions API error:', data.status);
        return {
          success: false,
          error: `Directions API error: ${data.status}`
        };
      }
    } catch (error) {
      console.error('❌ Routing service error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Decode Google's polyline format to coordinate array using @mapbox/polyline
   */
  private decodePolyline(encoded: string): RoutePoint[] {
    try {
      const points = Polyline.decode(encoded);
      return points.map(([latitude, longitude]: [number, number]) => ({ 
        latitude, 
        longitude 
      }));
    } catch (error) {
      console.error('❌ Polyline decoding error:', error);
      return [];
    }
  }

  /**
   * Generate a realistic road-following path with multiple turns and street routing
   */
  generateCurvedPath(
    origin: RoutePoint,
    destination: RoutePoint,
    points: number = 30
  ): RoutePoint[] {
    const path: RoutePoint[] = [];
    
    // Calculate the direction vector
    const deltaLat = destination.latitude - origin.latitude;
    const deltaLng = destination.longitude - origin.longitude;
    const distance = Math.sqrt(deltaLat * deltaLat + deltaLng * deltaLng);
    
    // Create a realistic road-following path with multiple turns
    // This simulates actual street navigation with intersections and turns
    
    // Determine the number of turns based on distance (simplified)
    const numTurns = Math.min(4, Math.max(2, Math.floor(distance * 500)));
    
    // Generate waypoints for realistic routing
    const waypoints: RoutePoint[] = [];
    waypoints.push(origin);
    
    // Create intermediate waypoints that simulate street intersections
    for (let i = 1; i < numTurns; i++) {
      const progress = i / numTurns;
      
      // Add some randomness to simulate real street patterns
      const randomOffset = (Math.random() - 0.5) * 0.0005; // Smaller random offset
      
      // Create waypoints with alternating patterns
      if (i % 2 === 0) {
        // Move more in latitude direction
        const lat = origin.latitude + (deltaLat * progress) + randomOffset;
        const lng = origin.longitude + (deltaLng * progress * 0.8);
        waypoints.push({ latitude: lat, longitude: lng });
      } else {
        // Move more in longitude direction
        const lat = origin.latitude + (deltaLat * progress * 0.8);
        const lng = origin.longitude + (deltaLng * progress) + randomOffset;
        waypoints.push({ latitude: lat, longitude: lng });
      }
    }
    
    waypoints.push(destination);
    
    // Generate path between waypoints with sharp turns
    const pointsPerSegment = Math.floor(points / (waypoints.length - 1));
    
    for (let i = 0; i < waypoints.length - 1; i++) {
      const start = waypoints[i];
      const end = waypoints[i + 1];
      
      if (start && end) {
        // Generate points for this segment
        for (let j = 0; j <= pointsPerSegment; j++) {
          const t = j / pointsPerSegment;
          const lat = start.latitude + (end.latitude - start.latitude) * t;
          const lng = start.longitude + (end.longitude - start.longitude) * t;
          path.push({ latitude: lat, longitude: lng });
        }
      }
    }
    
    // Ensure we end exactly at destination
    if (path.length > 0) {
      path[path.length - 1] = { latitude: destination.latitude, longitude: destination.longitude };
    }
    
    return path;
  }
}

export default RoutingService;
