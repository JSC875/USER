# Socket Debugging Steps

## 🚨 **Issue Identified**
The customer app is not receiving location updates from the driver app, even after fixing the socket event name mismatch.

### **Problem Details:**
- **Driver App**: Successfully emitting `driver_location` event with coordinates `17.4520242, 78.3934915`
- **Customer App**: Not receiving any location updates
- **Socket Event**: Fixed from `driver_location_update` to `driver_location`
- **Result**: Still no location updates reaching customer app

## 🔍 **Debugging Steps Implemented**

### **1. Added Debug Event Listener** (`src/utils/socket.ts`)

**Changes Made:**
- Added `socket.onAny()` listener to catch ALL socket events
- This will help identify if any events are being received by the customer app

**Code Changes:**
```typescript
// Debug listener to catch ALL events
socket.onAny((eventName, data) => {
  log("🔍 DEBUG: Received socket event:", { eventName, data });
});
```

### **2. Added Socket Connection Test** (`src/screens/ride/LiveTrackingScreen.tsx`)

**Changes Made:**
- Added test to emit a `test_event` from customer app
- This will verify if the socket connection is working
- Added import for `getSocket` function

**Code Changes:**
```typescript
// Test socket connection
useEffect(() => {
  const testSocketConnection = () => {
    console.log('🧪 Testing socket connection...');
    const socket = getSocket();
    if (socket && socket.connected) {
      console.log('✅ Socket is connected, emitting test event');
      socket.emit('test_event', { message: 'Hello from customer app', timestamp: Date.now() });
    } else {
      console.log('❌ Socket is not connected');
    }
  };

  // Test after 2 seconds
  const timer = setTimeout(testSocketConnection, 2000);
  return () => clearTimeout(timer);
}, []);
```

## 🧪 **Testing Instructions**

### **1. Test Customer App Socket Connection:**
1. **Open Customer App**: Navigate to LiveTrackingScreen
2. **Check Logs**: Look for "🧪 Testing socket connection..." message
3. **Verify Connection**: Should see "✅ Socket is connected, emitting test event"
4. **Check Debug Events**: Look for "🔍 DEBUG: Received socket event:" messages

### **2. Test Driver App Location Emission:**
1. **Open Driver App**: Navigate to HomeScreen
2. **Click Debug Button**: Press "🚀 Force Emit Location" button
3. **Check Logs**: Look for "📍 Sending location update:" message
4. **Verify Event**: Confirm `driver_location` event is being emitted

### **3. Monitor Customer App for Events:**
1. **Check Debug Listener**: Look for "🔍 DEBUG: Received socket event:" messages
2. **Check Driver Location**: Look for "📍 Driver location update:" messages
3. **Check Test Event**: Look for any `test_event` responses

## 📝 **Expected Results**

### **If Socket Connection is Working:**
- Customer app should show "✅ Socket is connected, emitting test event"
- Customer app should show "🔍 DEBUG: Received socket event:" messages
- Customer app should receive `driver_location` events from driver app

### **If Socket Connection is Not Working:**
- Customer app should show "❌ Socket is not connected"
- No debug events should be received
- No location updates should be received

### **If Events are Not Being Forwarded:**
- Customer app should show socket is connected
- Customer app should receive test events
- Customer app should NOT receive `driver_location` events
- This indicates server-side event forwarding issue

## 🔍 **Troubleshooting Steps**

### **If No Debug Events are Received:**

1. **Check Socket Connection:**
   - Verify customer app shows "✅ Socket is connected"
   - Check if socket URL is correct
   - Verify socket server is running

2. **Check Network Connectivity:**
   - Ensure both apps have internet connection
   - Check if firewall is blocking socket connections
   - Verify socket server is accessible

### **If Debug Events are Received but No Driver Location:**

1. **Check Server-Side Event Forwarding:**
   - Verify socket server is forwarding `driver_location` events
   - Check server logs for event handling
   - Verify event routing logic

2. **Check Event Names:**
   - Confirm driver app is emitting `driver_location`
   - Confirm customer app is listening for `driver_location`
   - Check for any event name mismatches

### **If Driver Location Events are Received:**

1. **Check Event Processing:**
   - Verify "📍 Driver location update:" logs appear
   - Check coordinate processing logic
   - Verify driver ID matching

2. **Check Map Updates:**
   - Verify bike icon position updates
   - Check coordinate validation
   - Monitor map rendering

## 🎯 **Next Steps**

1. **Run the debugging tests** with both apps
2. **Monitor all debug logs** to identify the issue
3. **Check socket server logs** for event forwarding
4. **Verify network connectivity** between apps and server
5. **Test with different event names** if needed

## 🔧 **Key Technical Changes**

### **Customer App Socket Debugging:**
- Added universal event listener to catch all events
- Added socket connection test
- Enhanced logging for debugging
- Added test event emission

### **Event Flow Debugging:**
- **Driver App**: Emits `driver_location` event
- **Socket Server**: Should forward event to customer app
- **Customer App**: Should receive event via debug listener
- **Customer App**: Should process event via driver location listener

### **Debug Information:**
- Socket connection status
- Event reception status
- Event processing status
- Coordinate validation status

This debugging approach will help identify exactly where the communication is breaking down between the driver app and customer app.
