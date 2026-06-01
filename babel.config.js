module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // SDK 54 / reanimated v4: the worklets plugin replaces the old
      // react-native-reanimated/plugin and must be listed last.
      'react-native-worklets/plugin',
    ],
  };
};
