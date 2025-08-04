import { getDefaultConfig } from 'expo/metro-config';
import { withNativeWind } from 'nativewind/metro';
import path from 'path';

const config = getDefaultConfig(__dirname);

// Performance optimizations for Metro
config.resolver = {
  ...config.resolver,
  // Enable symlinks for better module resolution
  enableSymlinks: true,
  // Optimize module resolution
  resolverMainFields: ['react-native', 'browser', 'main'],
  // Add platform extensions
  platforms: ['ios', 'android', 'native', 'web'],
  // Optimize asset extensions
  assetExts: config.resolver.assetExts.filter((ext: string) => ext !== 'svg'),
  // Add source extensions
  sourceExts: [...config.resolver.sourceExts, 'mjs', 'cjs'],
  // Add alias resolution
  alias: {
    '@': path.resolve(__dirname, 'src'),
    '@/images': path.resolve(__dirname, 'assets/images'),
    '@/fonts': path.resolve(__dirname, 'assets/fonts'),
  },
};

// Transformer optimizations
config.transformer = {
  ...config.transformer,
  // Enable minification for production
  minifierConfig: {
    keep_fnames: true,
    mangle: {
      keep_fnames: true,
    },
  },
  // Optimize babel configuration
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
};

// Server optimizations
config.server = {
  ...config.server,
  // Enable compression
  compress: true,
  // Optimize cache
  cacheStores: [
    {
      name: 'memory',
      type: 'memory',
    },
  ],
};

// Watchman optimizations
config.watchFolders = [
  // Add your project root
  __dirname,
];

// Performance monitoring
if (process.env.NODE_ENV === 'development') {
  config.reporter = {
    ...config.reporter,
    // Add performance reporting
    update: (event: any) => {
      if (event.type === 'bundle_build_done') {
        console.log(`📦 Bundle built in ${event.duration}ms`);
      }
    },
  };
}

// Apply reanimated configuration
const { wrapWithReanimatedMetroConfig } = require('react-native-reanimated/metro-config');
const reanimatedConfig = wrapWithReanimatedMetroConfig(config);

export default withNativeWind(reanimatedConfig, { input: './global.css' });