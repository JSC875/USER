# Socket.IO Connection Troubleshooting Guide

## Common Issues in Production APK

### 1. WebSocket Connection Errors
**Error**: `❌ Socket.IO connection error: Error: websocket error`

**Causes**:
- Android network security restrictions
- SSL/TLS certificate issues
- Transport fallback problems
- Network configuration issues

**Solutions Applied**:
- ✅ Added `network_security_config.xml` for domain-specific cleartext traffic
- ✅ Updated AndroidManifest.xml with `usesCleartextTraffic="true"`
- ✅ Forced WebSocket transport only (disabled polling fallback)
- ✅ Improved error handling and retry logic
- ✅ Added connection status monitoring

### 2. Network Security Configuration
The app now includes:
```xml
<!-- android/app/src/main/res/xml/network_security_config.xml -->
<network-security-config>
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">testsocketio-roqet.up.railway.app</domain>
        <domain includeSubdomains="true">railway.app</domain>
    </domain-config>
</network-security-config>
```

### 3. Socket Configuration Changes
- **Transport**: Forced to WebSocket only (no polling fallback)
- **Timeout**: Reduced to 20 seconds
- **Retry attempts**: Increased to 15
- **Reconnection delay**: Optimized with exponential backoff
- **SSL verification**: Disabled for development/testing

### 4. Debugging Tools
Use the debug function to troubleshoot:
```typescript
import { debugSocketConnection } from '../utils/socket';

// Call this to get detailed connection info
debugSocketConnection();
```

### 5. Connection Status Component
The `ConnectionStatus` component now shows:
- 🟢 **Connected**: Both internet and socket working
- 🟡 **No Server**: Internet working but socket disconnected
- 🔴 **Offline**: No internet connection

### 6. Testing Steps
1. Build and install the APK
2. Check logs for connection attempts
3. Use `debugSocketConnection()` in console
4. Monitor the ConnectionStatus component
5. Verify server is accessible from device

### 7. Server-Side Considerations
Ensure your Socket.IO server:
- Accepts WebSocket connections
- Has proper CORS configuration
- Is accessible from mobile networks
- Has valid SSL certificates

### 8. Environment Variables
Verify these are set correctly:
```json
{
  "EXPO_PUBLIC_SOCKET_URL": "https://testsocketio-roqet.up.railway.app"
}
```

### 9. Common Fixes
If issues persist:
1. Clear app data and cache
2. Check device network settings
3. Verify server is running and accessible
4. Test with different network (WiFi vs Mobile)
5. Check server logs for connection attempts

### 10. Production Checklist
- [ ] Network security config added
- [ ] AndroidManifest.xml updated
- [ ] Socket configuration optimized
- [ ] Error handling improved
- [ ] Connection status monitoring added
- [ ] Debug functions available
- [ ] Server accessible from mobile networks
- [ ] SSL certificates valid
- [ ] CORS properly configured 