import type { ExpoConfig } from 'expo/config';

const splashBackgroundColor = '#1B4332';
const easProjectId = 'c6752fca-d273-48d8-b208-a875741f43a5';

const config: ExpoConfig = {
  name: 'Cal Tracker',
  slug: 'cal-tracker',
  owner: 'johocharger',
  version: '1.0.0',
  runtimeVersion: { policy: 'appVersion' },
  updates: {
    url: `https://u.expo.dev/${easProjectId}`,
    checkAutomatically: 'ON_LOAD',
    fallbackToCacheTimeout: 0,
  },
  extra: { eas: { projectId: easProjectId } },
  platforms: ['ios', 'web'],
  orientation: 'portrait',
  scheme: 'caltracker',
  userInterfaceStyle: 'automatic',
  icon: './assets/icon-v2.png',
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/icon-v2.png',
    name: 'Cal Tracker',
    shortName: 'Cal Tracker',
    themeColor: splashBackgroundColor,
    backgroundColor: splashBackgroundColor,
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.joonaslindroos.caltracker',
    config: { usesNonExemptEncryption: false },
    infoPlist: {
      NSCameraUsageDescription:
        'Cal Tracker uses the camera to estimate nutrition from meal photos.',
      NSPhotoLibraryUsageDescription:
        'Cal Tracker analyzes only the meal photos you choose.',
    },
  },
  plugins: [
    [
      'expo-router',
      {
        headers: {
          'Cross-Origin-Embedder-Policy': 'credentialless',
          'Cross-Origin-Opener-Policy': 'same-origin',
        },
      },
    ],
    'expo-sqlite',
    'expo-font',
    [
      'expo-secure-store',
      {
        configureAndroidBackup: true,
        faceIDPermission:
          'Allow Cal Tracker to securely access your saved session.',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission:
          'Cal Tracker analyzes only the meal photos you choose.',
        cameraPermission:
          'Cal Tracker uses the camera to estimate nutrition from meal photos.',
        microphonePermission: false,
      },
    ],
    [
      'expo-splash-screen',
      {
        image: './assets/splash-screen.png',
        imageWidth: 240,
        resizeMode: 'contain',
        backgroundColor: splashBackgroundColor,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
};

export default config;
