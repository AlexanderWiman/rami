const { withAndroidManifest } = require('@expo/config-plugins/build/plugins/android-plugins');
const { getMainApplicationOrThrow, addMetaDataItemToMainApplication } = require('@expo/config-plugins/build/android/Manifest');

const META_API_KEY = 'com.google.android.geo.API_KEY';

function withGoogleMapsApiKey(config) {
  const apiKey = config.android?.config?.googleMaps?.apiKey;
  if (!apiKey) return config;

  return withAndroidManifest(config, async (config) => {
    const mainApplication = getMainApplicationOrThrow(config.modResults);
    addMetaDataItemToMainApplication(mainApplication, META_API_KEY, apiKey);
    return config;
  });
}

module.exports = withGoogleMapsApiKey;
