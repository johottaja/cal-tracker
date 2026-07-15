import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Cal Tracker',
  slug: 'cal-tracker',
  version: '1.0.0',
  platforms: ['ios'],
  orientation: 'portrait',
  scheme: 'caltracker',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: false,
    bundleIdentifier:
      process.env.EXPO_PUBLIC_IOS_BUNDLE_IDENTIFIER ?? 'com.joonas.caltracker',
    infoPlist: {
      NSCameraUsageDescription:
        'Cal Tracker uses the camera to estimate nutrition from meal photos.',
      NSPhotoLibraryUsageDescription:
        'Cal Tracker analyzes only the meal photos you choose.',
    },
  },
  plugins: [
    'expo-router',
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
    'expo-splash-screen',
  ],
  experiments: {
    typedRoutes: true,
  },
};

export default config;
