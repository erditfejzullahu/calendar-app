module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./'],
        alias: {
          '@app': './src/app',
          '@features': './src/features',
          '@shared': './src/shared',
          '@store': './src/store',
          '@services': './src/services',
          '@app-types': './src/types',
          '@testing': './src/testing',
        },
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      },
    ],
    // Reanimated 4 moved its babel plugin into `react-native-worklets`.
    // This plugin MUST be listed last.
    'react-native-worklets/plugin',
  ],
};
