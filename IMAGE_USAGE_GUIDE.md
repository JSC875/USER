# Image Usage Guide

This guide explains how to use the new `@/images` alias and centralized image constants in the app.

## Overview

We've set up a centralized image management system that uses:
- `@/images` alias for direct image imports
- `Images` constants for centralized image management
- `Logo` component for consistent logo usage

## Configuration

The following files have been configured to support the image alias:

### 1. TypeScript Configuration (`tsconfig.json`)
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/images/*": ["assets/images/*"]
    }
  }
}
```

### 2. Metro Configuration (`metro.config.ts`)
```typescript
config.resolver.alias = {
  '@': path.resolve(__dirname, 'src'),
  '@/images': path.resolve(__dirname, 'assets/images'),
};
```

### 3. Babel Configuration (`babel.config.js`)
```javascript
plugins: [
  [
    'module-resolver',
    {
      root: ['./src'],
      alias: {
        '@': './src',
        '@/images': './assets/images',
      },
    },
  ],
],
```

## Usage Methods

### Method 1: Using Images Constants (Recommended)

Import the Images constants and use them in your components:

```typescript
import { Images } from '../../constants/Images';

// In your component
<Image source={Images.LOGO} style={styles.logo} />
```

### Method 2: Using @/images Alias Directly

Import images directly using the alias:

```typescript
// Direct import
const logo = require('@/images/roqetlogo.jpg');

// In your component
<Image source={logo} style={styles.logo} />
```

### Method 3: Using the Logo Component

For consistent logo usage across the app:

```typescript
import Logo from '../../components/common/Logo';

// In your component
<Logo size={100} variant="default" />
```

## Available Images

### Main Logo
- `Images.LOGO` - roqetlogo.jpg (main app logo)

### App Icons
- `Images.ICON` - roqetlogo.jpg
- `Images.ADAPTIVE_ICON` - roqetlogo.jpg
- `Images.FAVICON` - roqetlogo.jpg

### Splash Screens
- `Images.SPLASH_ICON` - roqetlogo.jpg
- `Images.SPLASH_5` - splash5.png
- `Images.SPLASH_6` - splash6.png
- `Images.SPLASH_7` - splash7.png
- `Images.SPLASH_12` - splash12.jpg
- `Images.SPLASH_13` - splash13.png
- `Images.SPLASH_14` - splash14.png

### Other Images
- `Images.SAFE_AND_RELIABLE` - safeandrelaible.png
- `Images.ICON_ANIMATION` - iconAnimation.jpg
- `Images.ICON_ANIMATION_1` - iconAnimation1.png
- `Images.SCOOTER_1` - scoooter1.jpg

### Appacella Logos (for reference)
- `Images.APPACELLA_LOGO_BLACK` - appacella-logo-black.png
- `Images.APPACELLA_LOGO_BLUE` - appacella-logo-blue.png
- `Images.APPACELLA_LOGO_GREEN` - appacella-logo-green.png
- `Images.APPACELLA_LOGO_ORIGINAL` - appacella-logo-original.png
- `Images.APPACELLA_LOGO_PARTIAL` - appacella-logo-partial.png
- `Images.APPACELLA_LOGO_WHITE` - appacella-logo-white.png
- `Images.APPACELLA_LOGO_WHITE_PARTIAL` - appacella-logo-white-partial.png

## Logo Component Variants

The Logo component supports different variants:

```typescript
<Logo size={100} variant="default" />  // Uses roqetlogo.jpg
<Logo size={100} variant="white" />    // Uses appacella-logo-white.png
<Logo size={100} variant="black" />    // Uses appacella-logo-black.png
<Logo size={100} variant="blue" />     // Uses appacella-logo-blue.png
<Logo size={100} variant="green" />    // Uses appacella-logo-green.png
```

## App Configuration

The app has been configured to use `roqetlogo.jpg` for:
- App icon
- Splash screen
- Android adaptive icon
- Web favicon

## Best Practices

1. **Use Images constants** for consistency and easier maintenance
2. **Use the Logo component** for logo displays to ensure consistency
3. **Add new images** to the `Images` constants file when adding new assets
4. **Use descriptive names** for image constants
5. **Keep the @/images alias** for direct imports when needed

## Adding New Images

When adding new images:

1. Place the image in `assets/images/`
2. Add it to `src/constants/Images.ts`:
```typescript
export const Images = {
  // ... existing images
  NEW_IMAGE: require('@/images/new-image.png'),
} as const;
```

3. Use it in your components:
```typescript
import { Images } from '../../constants/Images';
<Image source={Images.NEW_IMAGE} style={styles.image} />
```

## Troubleshooting

If you encounter issues:

1. **Restart the Metro bundler** after configuration changes
2. **Clear Metro cache**: `npx expo start --clear`
3. **Check file paths** are correct
4. **Verify TypeScript paths** are properly configured
5. **Ensure Babel plugin** is installed and configured

## Migration Notes

The following files have been updated to use the new system:
- `src/screens/auth/SplashScreen.tsx`
- `src/screens/auth/LoginScreen.tsx`
- `src/screens/home/RideOptionsScreen.tsx`
- `src/screens/ride/LiveTrackingScreen.tsx`
- `src/screens/profile/HistoryDetailScreen.tsx`
- `app.json` (app configuration) 