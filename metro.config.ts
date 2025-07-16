const {
  wrapWithReanimatedMetroConfig,
} = require('react-native-reanimated/metro-config');
const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);
config.resolver.unstable_enablePackageExports = false;

// Add resolver alias for @/images
config.resolver.alias = {
  '@': path.resolve(__dirname, 'src'),
  '@/images': path.resolve(__dirname, 'assets/images'),
};

module.exports = wrapWithReanimatedMetroConfig(config);