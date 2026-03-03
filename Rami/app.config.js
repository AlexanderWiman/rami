const appJson = require('./app.json');

module.exports = {
  ...appJson.expo,
  android: {
    ...appJson.expo.android,
    config: {
      googleMaps: {
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_APIKEY || process.env.GOOGLE_MAPS_ANDROID_APIKEY,
      },
    },
  },
  plugins: [
    ...appJson.expo.plugins,
    './plugins/withGoogleMapsApiKey',
  ],
};
