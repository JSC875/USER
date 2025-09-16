import { config } from '../config/environment';

/**
 * Conditional logger utility that respects environment settings
 */
class Logger {
  private isDebugEnabled: boolean;

  constructor() {
    this.isDebugEnabled = config.features.enableDebugLogs;
  }

  /**
   * Log debug information (only in development)
   */
  debug(message: string, ...args: any[]): void {
    if (this.isDebugEnabled) {
      console.log(`🔍 [DEBUG] ${message}`, ...args);
    }
  }

  /**
   * Log info messages (always shown)
   */
  info(message: string, ...args: any[]): void {
    console.log(`ℹ️ [INFO] ${message}`, ...args);
  }

  /**
   * Log warnings (always shown)
   */
  warn(message: string, ...args: any[]): void {
    console.warn(`⚠️ [WARN] ${message}`, ...args);
  }

  /**
   * Log errors (always shown)
   */
  error(message: string, ...args: any[]): void {
    console.error(`❌ [ERROR] ${message}`, ...args);
  }

  /**
   * Log success messages (always shown)
   */
  success(message: string, ...args: any[]): void {
    console.log(`✅ [SUCCESS] ${message}`, ...args);
  }

  /**
   * Log API calls (only in development)
   */
  api(message: string, ...args: any[]): void {
    if (this.isDebugEnabled) {
      console.log(`🌐 [API] ${message}`, ...args);
    }
  }

  /**
   * Log socket events (only in development)
   */
  socket(message: string, ...args: any[]): void {
    if (this.isDebugEnabled) {
      console.log(`🔌 [SOCKET] ${message}`, ...args);
    }
  }

  /**
   * Log location updates (only in development)
   */
  location(message: string, ...args: any[]): void {
    if (this.isDebugEnabled) {
      console.log(`📍 [LOCATION] ${message}`, ...args);
    }
  }

  /**
   * Log ride history operations (only in development)
   */
  rideHistory(message: string, ...args: any[]): void {
    if (this.isDebugEnabled) {
      console.log(`🚗 [RIDE_HISTORY] ${message}`, ...args);
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export individual methods for convenience
export const { debug, info, warn, error, success, api, socket, location, rideHistory } = logger;
