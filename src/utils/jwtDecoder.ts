// JWT Decoder utility for user app
export const decodeJWT = (token: string) => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Invalid JWT format');
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
    const token = await getToken({ template: 'my_app_token' });
    if (!token) return 'user123';
    const decoded = decodeJWT(token);
    if (!decoded) return 'user123';
    return decoded.sub || decoded.user_id || decoded.userId || 'user123';
  } catch (error) {
    console.error('Error getting user ID from JWT:', error);
    return 'user123';
  }
};

// Utility to get user type from JWT
export const getUserTypeFromJWT = async (getToken: any) => {
  try {
    const token = await getToken({ template: 'my_app_token' });
    if (!token) return 'customer';
    const decoded = decodeJWT(token);
    if (!decoded) return 'customer';
    return decoded.user_type || decoded.type || 'customer';
  } catch (error) {
    console.error('Error getting user type from JWT:', error);
    return 'customer';
  }
}; 