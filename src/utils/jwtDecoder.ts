// JWT Decoder utility for user app
export const decodeJWT = (token: string) => {
  try {
    if (!token || typeof token !== 'string') {
      throw new Error('Invalid token: token is null, undefined, or not a string');
    }
    
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format: token must have 3 parts');
    }
    
    const payload = parts[1];
    const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
    const decodedPayload = atob(paddedPayload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decodedPayload);
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
};

// Utility to get user ID for socket connection
export const getUserIdFromJWT = async (getToken: any) => {
  try {
    // Enhanced validation for APK builds
    if (!getToken) {
      console.error('❌ getToken is null or undefined');
      throw new Error('getToken is not available - this might be an APK build issue');
    }
    
    if (typeof getToken !== 'function') {
      console.error('❌ getToken is not a function, type:', typeof getToken);
      throw new Error('getToken is not a function - this indicates a Clerk authentication issue');
    }
    
    console.log('🔍 Attempting to get token with template: my_app_token');
    const token = await getToken({ template: 'my_app_token' });
    
    if (!token) {
      console.error('❌ No token returned from getToken');
      throw new Error('No token available - user might not be authenticated');
    }
    
    console.log('✅ Token received, length:', token.length);
    
    const decoded = decodeJWT(token);
    if (!decoded) {
      console.error('❌ Failed to decode JWT token');
      throw new Error('Failed to decode JWT - token might be malformed');
    }
    
    console.log('✅ JWT decoded successfully');
    
    // Try different possible user ID fields
    const userId = decoded.sub || decoded.user_id || decoded.userId || decoded.id;
    if (!userId) {
      console.error('❌ No user ID found in JWT payload:', Object.keys(decoded));
      throw new Error('No user ID found in JWT payload');
    }
    
    console.log('✅ User ID extracted:', userId);
    return userId;
  } catch (error) {
    console.error('❌ Error getting user ID from JWT:', error);
    console.error('❌ getToken function:', getToken);
    console.error('❌ getToken type:', typeof getToken);
    throw error; // Re-throw to let caller handle the error
  }
};

// Utility to get user type from JWT
export const getUserTypeFromJWT = async (getToken: any) => {
  try {
    // Enhanced validation for APK builds
    if (!getToken) {
      console.error('❌ getToken is null or undefined for user type');
      throw new Error('getToken is not available - this might be an APK build issue');
    }
    
    if (typeof getToken !== 'function') {
      console.error('❌ getToken is not a function for user type, type:', typeof getToken);
      throw new Error('getToken is not a function - this indicates a Clerk authentication issue');
    }
    
    console.log('🔍 Attempting to get token for user type');
    const token = await getToken({ template: 'my_app_token' });
    
    if (!token) {
      console.error('❌ No token returned for user type');
      throw new Error('No token available for user type');
    }
    
    const decoded = decodeJWT(token);
    if (!decoded) {
      console.error('❌ Failed to decode JWT for user type');
      throw new Error('Failed to decode JWT for user type');
    }
    
    // Try different possible user type fields
    const userType = decoded.user_type || decoded.type || decoded.role || 'customer';
    console.log('✅ User type extracted:', userType);
    return userType;
  } catch (error) {
    console.error('❌ Error getting user type from JWT:', error);
    console.error('❌ Defaulting to customer type for APK compatibility');
    // Default to customer if we can't get the type
    return 'customer';
  }
};

// Comprehensive JWT logging utility
export const logJWTDetails = async (getToken: any, context: string = 'JWT Analysis') => {
  try {
    console.log(`🔍 === ${context} ===`);
    
    // Get the JWT token
    const token = await getToken({ template: 'my_app_token', skipCache: true });
    if (!token) {
      console.log('❌ No JWT token available');
      return null;
    }
    
    console.log(`🔑 Token Length: ${token.length} characters`);
    console.log(`🔑 Token Preview: ${token.substring(0, 50)}...${token.substring(token.length - 20)}`);
    
    // Decode the JWT
    const decoded = decodeJWT(token);
    if (!decoded) {
      console.log('❌ Failed to decode JWT');
      return null;
    }
    
    console.log('📋 Decoded JWT Payload:');
    console.log(JSON.stringify(decoded, null, 2));
    
    // Check for custom fields
    const customFields = {
      firstName: decoded.firstName || 'Not found',
      lastName: decoded.lastName || 'Not found',
      userType: decoded.userType || 'Not found',
      phoneNumber: decoded.phoneNumber || 'Not found'
    };
    
    console.log('🎯 Custom Fields Check:');
    Object.entries(customFields).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
    
    console.log(`✅ === ${context} COMPLETED ===`);
    return decoded;
    
  } catch (error) {
    console.error(`❌ === ${context} ERROR ===`);
    console.error('Error in JWT logging:', error);
    return null;
  }
};

// Full JWT token logging utility
export const logFullJWT = async (getToken: any, context: string = 'Full JWT Token') => {
  try {
    console.log(`🔍 === ${context} ===`);
    
    const token = await getToken({ template: 'my_app_token', skipCache: true });
    if (!token) {
      console.log('❌ No JWT token available');
      return null;
    }
    
    console.log('🔑 Full JWT Token:');
    console.log(token);
    
    const decoded = decodeJWT(token);
    if (decoded) {
      console.log('📋 Full Decoded Payload:');
      console.log(JSON.stringify(decoded, null, 2));
    }
    
    console.log(`✅ === ${context} COMPLETED ===`);
    return token;
    
  } catch (error) {
    console.error(`❌ === ${context} ERROR ===`);
    console.error('Error in full JWT logging:', error);
    return null;
  }
}; 