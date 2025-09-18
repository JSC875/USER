import { apiConfig, isDevelopment, isProduction } from '../config/environment';
import { getUserIdFromJWT, getUserTypeFromJWT } from '../utils/jwtDecoder';
import { logger } from '../utils/logger';

// Conditional logging function
const log = (message: string, data?: any) => {
  if (isDevelopment) {
    if (data) {
      logger.debug(message, data);
    } else {
      logger.debug(message);
    }
  }
};

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  statusCode?: number;
}

export interface ApiError {
  message: string;
  statusCode: number;
  error: string;
}

// Request configuration
interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  requireAuth?: boolean;
  getToken?: () => Promise<string | null>;
}

// API Service class
class ApiService {
  private baseUrl: string;
  private defaultTimeout: number;
  private defaultRetryAttempts: number;
  private defaultRetryDelay: number;

  constructor() {
    this.baseUrl = apiConfig.baseUrl;
    this.defaultTimeout = apiConfig.timeout;
    this.defaultRetryAttempts = apiConfig.retryAttempts;
    this.defaultRetryDelay = apiConfig.retryDelay;
    
    log('🔧 === API SERVICE CONFIGURATION ===');
    log(`📍 Base URL: ${this.baseUrl}`);
    log(`⏱️ Default Timeout: ${this.defaultTimeout}ms`);
    log(`🔄 Default Retry Attempts: ${this.defaultRetryAttempts}`);
    log(`⏳ Default Retry Delay: ${this.defaultRetryDelay}ms`);
    log('🔧 === END CONFIGURATION ===');
  }

  // Create request headers
  private async createHeaders(config: RequestConfig): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-App-Version': '1.0.0',
      'X-Platform': 'ReactNative',
      'X-Environment': isProduction ? 'production' : 'development',
      ...config.headers,
    };

    // Add authentication header if required
    if (config.requireAuth && config.getToken) {
      try {
        const token = await config.getToken();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
          
          // Add user info from JWT
          try {
            const userId = await getUserIdFromJWT(() => Promise.resolve(token));
            const userType = await getUserTypeFromJWT(() => Promise.resolve(token));
            
            if (userId) headers['X-User-ID'] = userId;
            if (userType) headers['X-User-Type'] = userType;
          } catch (error) {
            if (isDevelopment) {
              console.warn('Failed to extract user info from JWT:', error);
            }
          }
        }
      } catch (error) {
        if (isDevelopment) {
          console.warn('Failed to get auth token:', error);
        }
      }
    }

    return headers;
  }

  // Create request timeout
  private createTimeout(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Request timeout after ${timeout}ms`));
      }, timeout);
    });
  }

  // Retry logic
  private async retryRequest<T>(
    requestFn: () => Promise<T>,
    retryAttempts: number,
    retryDelay: number
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= retryAttempts; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === retryAttempts) {
          break;
        }

        // Don't retry on certain errors
        if (error instanceof Error) {
          if (error.message.includes('timeout') || 
              error.message.includes('network') ||
              error.message.includes('fetch')) {
            // Continue retrying for network/timeout errors
          } else if (error.message.includes('401') || 
                     error.message.includes('403') ||
                     error.message.includes('404')) {
            // Don't retry auth/not found errors
            break;
          }
        }

        if (isDevelopment) {
          console.warn(`API request failed (attempt ${attempt + 1}/${retryAttempts + 1}):`, error);
        }

        // Wait before retrying with exponential backoff
        const delay = retryDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  // Make HTTP request
  private async makeRequest<T>(
    endpoint: string,
    config: RequestConfig
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const timeout = config.timeout || this.defaultTimeout;
    const retryAttempts = config.retryAttempts ?? this.defaultRetryAttempts;
    const retryDelay = config.retryDelay || this.defaultRetryDelay;

    const headers = await this.createHeaders(config);
    const method = config.method || 'GET';

    if (isDevelopment) {
      // Simplified logging for debugging
      log('🔍 === API REQUEST LOG ===');
      log(`🎯 Endpoint: ${endpoint}`);
      log(`📋 Method: ${method}`);
      log(`🏗️ Environment: ${isProduction ? 'production' : 'development'}`);
      
      // Log token info only
      const authHeader = headers['Authorization'];
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        log(`🔑 Token Length: ${token.length} characters`);
      }
      
      log('🔍 === END REQUEST LOG ===');
    }

    const requestFn = async (): Promise<ApiResponse<T>> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, timeout);

      try {
        const response = await fetch(url, {
          method,
          headers,
          body: config.body ? JSON.stringify(config.body) : null,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const responseText = await response.text();
        let responseData: any;

        try {
          responseData = responseText ? JSON.parse(responseText) : null;
        } catch (parseError) {
          if (isDevelopment) {
            console.warn('Failed to parse response as JSON:', responseText);
          }
          responseData = { message: responseText };
        }

        if (isDevelopment) {
          log('📡 === API RESPONSE LOG ===');
          log(`🎯 Endpoint: ${endpoint}`);
          log(`✅ Status: ${response.status} ${response.statusText}`);
          log(`📏 Response Size: ${responseText.length} characters`);
          log('📡 === END RESPONSE LOG ===');
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return {
          success: true,
          data: responseData,
          statusCode: response.status,
        };
      } catch (error) {
        clearTimeout(timeoutId);
        
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            throw new Error(`Request timeout after ${timeout}ms`);
          }
          
          // Handle network errors
          if (error.message.includes('fetch')) {
            throw new Error('Network error: Unable to connect to server. Please check your internet connection.');
          }
          
          // Handle CORS errors
          if (error.message.includes('CORS')) {
            throw new Error('CORS error: Cross-origin request blocked. Please check server configuration.');
          }
          
          throw error;
        }
        
        throw new Error('Unknown error occurred');
      }
    };

    return this.retryRequest(requestFn, retryAttempts, retryDelay);
  }

  // Public API methods
  async get<T>(endpoint: string, config: Omit<RequestConfig, 'method'> = {}): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { ...config, method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any, config: Omit<RequestConfig, 'method' | 'body'> = {}): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { ...config, method: 'POST', body: data });
  }

  async put<T>(endpoint: string, data?: any, config: Omit<RequestConfig, 'method' | 'body'> = {}): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { ...config, method: 'PUT', body: data });
  }

  async patch<T>(endpoint: string, data?: any, config: Omit<RequestConfig, 'method' | 'body'> = {}): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { ...config, method: 'PATCH', body: data });
  }

  async delete<T>(endpoint: string, config: Omit<RequestConfig, 'method'> = {}): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { ...config, method: 'DELETE' });
  }

  // Authenticated request methods
  async getAuth<T>(endpoint: string, getToken: () => Promise<string | null>, config: Omit<RequestConfig, 'method' | 'requireAuth' | 'getToken'> = {}): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { ...config, method: 'GET', requireAuth: true, getToken });
  }

  async postAuth<T>(endpoint: string, data: any, getToken: () => Promise<string | null>, config: Omit<RequestConfig, 'method' | 'body' | 'requireAuth' | 'getToken'> = {}): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { ...config, method: 'POST', body: data, requireAuth: true, getToken });
  }

  async putAuth<T>(endpoint: string, data: any, getToken: () => Promise<string | null>, config: Omit<RequestConfig, 'method' | 'body' | 'requireAuth' | 'getToken'> = {}): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { ...config, method: 'PUT', body: data, requireAuth: true, getToken });
  }

  async patchAuth<T>(endpoint: string, data: any, getToken: () => Promise<string | null>, config: Omit<RequestConfig, 'method' | 'body' | 'requireAuth' | 'getToken'> = {}): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { ...config, method: 'PATCH', body: data, requireAuth: true, getToken });
  }

  async deleteAuth<T>(endpoint: string, getToken: () => Promise<string | null>, config: Omit<RequestConfig, 'method' | 'requireAuth' | 'getToken'> = {}): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { ...config, method: 'DELETE', requireAuth: true, getToken });
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.get('/health', { timeout: 5000, retryAttempts: 1 });
      return response.success;
    } catch (error) {
      if (isDevelopment) {
        console.warn('Health check failed:', error);
      }
      return false;
    }
  }

  // Get configuration info
  getConfig() {
    return {
      baseUrl: this.baseUrl,
      timeout: this.defaultTimeout,
      retryAttempts: this.defaultRetryAttempts,
      retryDelay: this.defaultRetryDelay,
    };
  }
}

// Create singleton instance
export const apiService = new ApiService();

// Export convenience functions
export const api = {
  get: <T>(endpoint: string, config?: Omit<RequestConfig, 'method'>) => apiService.get<T>(endpoint, config),
  post: <T>(endpoint: string, data?: any, config?: Omit<RequestConfig, 'method' | 'body'>) => apiService.post<T>(endpoint, data, config),
  put: <T>(endpoint: string, data?: any, config?: Omit<RequestConfig, 'method' | 'body'>) => apiService.put<T>(endpoint, data, config),
  patch: <T>(endpoint: string, data?: any, config?: Omit<RequestConfig, 'method' | 'body'>) => apiService.patch<T>(endpoint, data, config),
  delete: <T>(endpoint: string, config?: Omit<RequestConfig, 'method'>) => apiService.delete<T>(endpoint, config),
  
  // Authenticated methods
  getAuth: <T>(endpoint: string, getToken: () => Promise<string | null>, config?: Omit<RequestConfig, 'method' | 'requireAuth' | 'getToken'>) => apiService.getAuth<T>(endpoint, getToken, config),
  postAuth: <T>(endpoint: string, data: any, getToken: () => Promise<string | null>, config?: Omit<RequestConfig, 'method' | 'body' | 'requireAuth' | 'getToken'>) => apiService.postAuth<T>(endpoint, data, getToken, config),
  putAuth: <T>(endpoint: string, data: any, getToken: () => Promise<string | null>, config?: Omit<RequestConfig, 'method' | 'body' | 'requireAuth' | 'getToken'>) => apiService.putAuth<T>(endpoint, data, getToken, config),
  patchAuth: <T>(endpoint: string, data: any, getToken: () => Promise<string | null>, config?: Omit<RequestConfig, 'method' | 'body' | 'requireAuth' | 'getToken'>) => apiService.patchAuth<T>(endpoint, data, getToken, config),
  deleteAuth: <T>(endpoint: string, getToken: () => Promise<string | null>, config?: Omit<RequestConfig, 'method' | 'requireAuth' | 'getToken'>) => apiService.deleteAuth<T>(endpoint, getToken, config),
  
  healthCheck: () => apiService.healthCheck(),
  getConfig: () => apiService.getConfig(),
};

export default apiService; 
