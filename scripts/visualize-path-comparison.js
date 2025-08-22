// Visual comparison between straight line and curved path
function generateStraightLine(origin, destination, points = 10) {
  const path = [];
  for (let i = 0; i <= points; i++) {
    const t = i / points;
    const lat = origin.latitude + (destination.latitude - origin.latitude) * t;
    const lng = origin.longitude + (destination.longitude - origin.longitude) * t;
    path.push({ latitude: lat, longitude: lng });
  }
  return path;
}

function generateCurvedPath(origin, destination, points = 20) {
  const path = [];
  
  // Calculate distance to determine curvature intensity
  const distance = Math.sqrt(
    Math.pow(destination.latitude - origin.latitude, 2) + 
    Math.pow(destination.longitude - origin.longitude, 2)
  );
  
  // Adjust curvature based on distance - increased for more visible curves
  const curvatureIntensity = Math.min(distance * 0.8, 0.005);
  
  for (let i = 0; i <= points; i++) {
    const t = i / points;
    
    // Create multiple sine waves for more complex road-like curves
    const curve1 = Math.sin(Math.PI * t) * curvatureIntensity;
    const curve2 = Math.sin(Math.PI * 2 * t) * curvatureIntensity * 0.5;
    const curve3 = Math.sin(Math.PI * 3 * t) * curvatureIntensity * 0.3;
    
    // Combine curves for natural road-like path
    const totalCurve = curve1 + curve2 + curve3;
    
    // Add perpendicular offset to create road-like curves
    const latOffset = totalCurve * Math.cos(Math.PI / 4);
    const lngOffset = totalCurve * Math.sin(Math.PI / 4);
    
    // Calculate base linear interpolation
    const baseLat = origin.latitude + (destination.latitude - origin.latitude) * t;
    const baseLng = origin.longitude + (destination.longitude - origin.longitude) * t;
    
    // Apply curved offsets
    const lat = baseLat + latOffset;
    const lng = baseLng + lngOffset;
    
    path.push({ latitude: lat, longitude: lng });
  }
  
  return path;
}

function visualizePathComparison() {
  console.log('🛣️ PATH COMPARISON: Straight Line vs Curved Path');
  console.log('=' .repeat(60));
  
  // Test coordinates (Hyderabad area)
  const origin = { latitude: 17.4448, longitude: 78.3498 };
  const destination = { latitude: 17.4514, longitude: 78.3885 };
  
  console.log('📍 Origin:', origin);
  console.log('🎯 Destination:', destination);
  console.log('');
  
  // Generate straight line
  console.log('📏 STRAIGHT LINE PATH (Before):');
  const straightPath = generateStraightLine(origin, destination, 5);
  straightPath.forEach((point, index) => {
    console.log(`   Point ${index}: ${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}`);
  });
  console.log('');
  
  // Generate curved path
  console.log('🛣️ CURVED PATH (After):');
  const curvedPath = generateCurvedPath(origin, destination, 10);
  curvedPath.forEach((point, index) => {
    console.log(`   Point ${index}: ${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}`);
  });
  console.log('');
  
  // Visual representation
  console.log('🎨 VISUAL COMPARISON:');
  console.log('');
  console.log('Before (Straight Line):');
  console.log('Driver --------→ Pickup');
  console.log('');
  console.log('After (Curved Path):');
  console.log('Driver ~~~~~→ Pickup');
  console.log('    \\     /');
  console.log('     \\   /');
  console.log('      \\ /');
  console.log('       ~');
  console.log('');
  
  // Calculate curvature metrics
  const straightDistance = Math.sqrt(
    Math.pow(destination.latitude - origin.latitude, 2) + 
    Math.pow(destination.longitude - origin.longitude, 2)
  );
  
  let curvedDistance = 0;
  for (let i = 1; i < curvedPath.length; i++) {
    const prev = curvedPath[i - 1];
    const curr = curvedPath[i];
    curvedDistance += Math.sqrt(
      Math.pow(curr.latitude - prev.latitude, 2) + 
      Math.pow(curr.longitude - prev.longitude, 2)
    );
  }
  
  console.log('📊 METRICS:');
  console.log(`   Straight line distance: ${(straightDistance * 111000).toFixed(0)}m`);
  console.log(`   Curved path distance: ${(curvedDistance * 111000).toFixed(0)}m`);
  console.log(`   Curvature increase: ${((curvedDistance / straightDistance - 1) * 100).toFixed(1)}%`);
  console.log('');
  
  console.log('✅ IMPROVEMENT:');
  console.log('   • More realistic road-like visualization');
  console.log('   • Better user experience');
  console.log('   • Professional appearance');
  console.log('   • Matches industry standards');
}

visualizePathComparison();
