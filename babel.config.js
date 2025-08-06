module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        "module:react-native-dotenv",
        {
          "moduleName": "@env",
          "path": ".env",
        }
      ],
      'react-native-reanimated/plugin',
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: {
            '@': './src',
            '@/components': './src/components',
            '@/screens': './src/screens',
            '@/utils': './src/utils',
            '@/services': './src/services',
            '@/config': './src/config',
            '@/constants': './src/constants',
            '@/navigation': './src/navigation',
            '@/store': './src/store',
            '@/data': './src/data',
            '@/images': './assets/images',
            '@/fonts': './assets/fonts',
          },
        },
      ],
    ],
    env: {
      production: {
        plugins: ['transform-remove-console'],
      },
    },
  };
}; 