# Map Positioning Troubleshooting Guide

## 🚨 **Issue Description**
The customer app is receiving the correct coordinates (17.453093, 78.394507) but the driver location is showing differently on the map compared to the driver app.

## 🔍 **Possible Causes**

### **1. Map Region/Viewport Issues**
- Map might be centered on wrong coordinates
- Zoom level might be different
- Map might be showing cached/old region

### **2. Coordinate System Issues**
- Different coordinate formats (WGS84 vs other systems)
- Precision/rounding issues
- Coordinate transformation problems

### **3. Marker Positioning Issues**
- Driver marker might be offset
- Marker anchor point might be wrong
- Custom marker image might have positioning issues

### **4. Map Provider Issues**
- Google Maps vs Apple Maps differences
- Map tile loading issues
- Cached map data

## 🛠️ **Debugging Steps Added**

### **1. Test Marker Added**
```typescript
{/* Test marker with exact driver app coordinates for verification */}
{__DEV__ && (
  <Marker 
    coordinate={{ latitude: 17.453093, longitude: 78.394507 }} 
    title="Test Driver Location"
    pinColor="red"
  />
)}
```

### **2. Debug Buttons Added**
- **"Center on Driver"**: Centers map on received driver location
- **"Center on Exact"**: Centers map on exact coordinates (17.453093, 78.394507)

### **3. Coordinate Comparison Logging**
```typescript
console.log('🔍 Coordinate comparison:', {
  received: newLocation,
  expected: expectedCoords,
  latDifference: latDiff,
  lngDifference: lngDiff,
  isExactMatch: latDiff < 0.000001 && lngDiff < 0.000001
});
```

## 🧪 **Testing Instructions**

### **Step 1: Check Test Marker**
1. Look for the **red test marker** on the map
2. This marker should be at the exact coordinates from driver app
3. Compare its position with the driver marker

### **Step 2: Use Debug Buttons**
1. Tap **"Center on Driver"** to center on received coordinates
2. Tap **"Center on Exact"** to center on exact coordinates
3. Compare the two positions

### **Step 3: Check Console Logs**
Look for these logs:
```
🔍 Coordinate comparison: {
  received: {latitude: 17.453093, longitude: 78.394507},
  expected: {latitude: 17.453093, longitude: 78.394507},
  latDifference: 0,
  lngDifference: 0,
  isExactMatch: true
}
```

### **Step 4: Compare Marker Positions**
1. **Red test marker** = exact coordinates from driver app
2. **Green driver marker** = received coordinates from socket
3. They should be in the same position if coordinates match

## 🎯 **Expected Results**

### **If coordinates are truly the same:**
- Red test marker and green driver marker should overlap
- Both debug buttons should center on the same location
- Console should show `isExactMatch: true`

### **If there's a positioning issue:**
- Markers might be offset from each other
- Debug buttons might center on different locations
- This indicates a map/marker positioning problem

## 🔧 **Potential Fixes**

### **If markers don't overlap:**
1. **Check marker anchor point**:
```typescript
<Marker 
  coordinate={driverLocation} 
  anchor={{ x: 0.5, y: 0.5 }} // Center of marker
>
```

2. **Check custom marker image**:
```typescript
<Image 
  source={Images.ICON_ANIMATION_1}
  style={{ width: 40, height: 40 }}
  resizeMode="contain"
/>
```

3. **Try default marker**:
```typescript
<Marker coordinate={driverLocation} pinColor="green" />
```

### **If map region is wrong:**
1. **Force map region update**:
```typescript
mapRef.current?.setRegion({
  latitude: driverLocation.latitude,
  longitude: driverLocation.longitude,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
});
```

2. **Clear map cache**:
```typescript
mapRef.current?.clearCache();
```

## 📝 **Next Steps**

1. **Test the debug features** added to the customer app
2. **Compare marker positions** on the map
3. **Check console logs** for coordinate comparison
4. **Use debug buttons** to verify map centering
5. **Report findings** based on the test results

This will help identify whether the issue is with:
- ✅ **Coordinate data** (if markers overlap)
- ❌ **Map positioning** (if markers don't overlap)
- ❌ **Marker rendering** (if markers are offset)
