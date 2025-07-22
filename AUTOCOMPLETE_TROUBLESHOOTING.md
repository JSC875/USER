# Autocomplete Feature Troubleshooting Guide

## 🔍 **Issue Overview**
The autocomplete feature may not work properly in APK builds due to network security restrictions and API configuration issues.

## ✅ **What We Fixed**

### 1. **Network Security Configuration**
- ✅ Added Google Maps API domains to `network_security_config.xml`
- ✅ Allowed cleartext traffic for Google APIs
- ✅ Added `ACCESS_NETWORK_STATE` permission

### 2. **API Key Configuration**
- ✅ Verified API key is properly set in environment variables
- ✅ Confirmed API key is included in production builds
- ✅ Added comprehensive API key validation

### 3. **Testing Tools**
- ✅ Created `autocompleteTest.ts` utility
- ✅ Added autocomplete tests to debug screen
- ✅ Implemented comprehensive error reporting

## 🛠️ **Configuration Files Updated**

### `android/app/src/main/res/xml/network_security_config.xml`
```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">testsocketio-roqet.up.railway.app</domain>
        <domain includeSubdomains="true">railway.app</domain>
        <domain includeSubdomains="true">localhost</domain>
        <domain includeSubdomains="true">10.0.2.2</domain>
        <domain includeSubdomains="true">127.0.0.1</domain>
    </domain-config>
    <!-- Google Maps API domains -->
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">maps.googleapis.com</domain>
        <domain includeSubdomains="true">maps.google.com</domain>
        <domain includeSubdomains="true">googleapis.com</domain>
        <domain includeSubdomains="true">google.com</domain>
    </domain-config>
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors>
            <certificates src="system"/>
        </trust-anchors>
    </base-config>
</network-security-config>
```

### `android/app/src/main/AndroidManifest.xml`
```xml
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE"/>
```

## 🧪 **Testing the Autocomplete Feature**

### 1. **Using Debug Screen**
1. Open the app
2. Go to HomeScreen
3. Tap the analytics icon (📊) in the header
4. Use the autocomplete test buttons:
   - **Auto Test**: Quick autocomplete functionality test
   - **Auto Full**: Comprehensive API testing

### 2. **Manual Testing**
1. Go to location search screen
2. Type "Delhi" or any location
3. Check if suggestions appear
4. Verify place details are fetched

### 3. **Console Logs**
Look for these log messages:
- ✅ `🔑 Using API key: Present`
- ✅ `📡 Places API response: OK`
- ✅ `✅ Found X places`
- ❌ `❌ Places API access denied`
- ❌ `❌ Network error`

## 🔧 **Common Issues and Solutions**

### Issue 1: "REQUEST_DENIED" Error
**Symptoms:**
- Places API returns `REQUEST_DENIED` status
- No autocomplete suggestions

**Solutions:**
1. **Check API Key**: Verify `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` is set
2. **Enable APIs**: Ensure these APIs are enabled in Google Cloud Console:
   - Places API
   - Geocoding API
   - Maps JavaScript API
3. **Billing**: Set up billing for the Google Cloud project
4. **API Restrictions**: Check if API key has restrictions that block the app

### Issue 2: Network Security Errors
**Symptoms:**
- Network error messages
- No API responses

**Solutions:**
1. **Rebuild APK**: Network security config changes require a fresh build
2. **Check Domains**: Verify Google domains are in network security config
3. **Clear App Data**: Clear app data and cache
4. **Check Permissions**: Ensure `INTERNET` and `ACCESS_NETWORK_STATE` permissions

### Issue 3: No Results Found
**Symptoms:**
- API responds with `ZERO_RESULTS`
- No suggestions for valid queries

**Solutions:**
1. **Location Bias**: Check if location bias is working
2. **Query Format**: Try different query formats
3. **API Limits**: Check if you've hit API quotas
4. **Fallback**: App has offline fallback for common locations

### Issue 4: Slow Response Times
**Symptoms:**
- Long delays before suggestions appear
- Timeout errors

**Solutions:**
1. **Debounce**: App uses 500ms debounce (already optimized)
2. **Timeout**: 10-second timeout for API calls
3. **Caching**: Consider implementing result caching
4. **Network**: Check internet connection quality

## 📱 **APK Build Checklist**

### Before Building:
- [ ] API key is set in `app.json` and `eas.json`
- [ ] Network security config includes Google domains
- [ ] All required permissions are in AndroidManifest.xml
- [ ] Google Maps API key is in AndroidManifest.xml

### After Building:
- [ ] Test autocomplete in location search
- [ ] Run autocomplete tests from debug screen
- [ ] Check console logs for errors
- [ ] Verify place details are fetched correctly

## 🚀 **Expected Behavior**

### Working Autocomplete:
- ✅ Type 3+ characters → suggestions appear
- ✅ Tap suggestion → place details fetched
- ✅ Location coordinates retrieved
- ✅ Address formatted correctly
- ✅ Recent locations saved

### Fallback Behavior:
- ✅ API fails → geocoding fallback
- ✅ Geocoding fails → offline locations
- ✅ No internet → offline mode
- ✅ Invalid API key → offline mode

## 🔍 **Debug Information**

### API Endpoints Used:
- `https://maps.googleapis.com/maps/api/place/autocomplete/json`
- `https://maps.googleapis.com/maps/api/place/details/json`
- `https://maps.googleapis.com/maps/api/geocode/json`

### Test Queries:
- "Delhi" (should return multiple results)
- "Mumbai" (major city)
- "Airport" (common location type)

### Expected Response Format:
```json
{
  "status": "OK",
  "predictions": [
    {
      "place_id": "ChIJLbZ-NFv9DDkRzk0gTkm3wlI",
      "description": "Delhi, India",
      "structured_formatting": {
        "main_text": "Delhi",
        "secondary_text": "India"
      }
    }
  ]
}
```

## 📞 **Support**

If autocomplete is still not working after following this guide:

1. **Run Tests**: Use the debug screen tests
2. **Check Logs**: Look at console output
3. **Verify API Key**: Test API key in browser
4. **Check Network**: Ensure internet connectivity
5. **Rebuild**: Clean build and try again

## 🎯 **Success Criteria**

Autocomplete is working correctly when:
- ✅ Suggestions appear within 1-2 seconds
- ✅ Place details are fetched correctly
- ✅ Coordinates are accurate
- ✅ Addresses are properly formatted
- ✅ Recent locations are saved
- ✅ Offline fallback works
- ✅ No network security errors
- ✅ All API tests pass in debug screen 