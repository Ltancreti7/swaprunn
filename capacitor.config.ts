import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.swaprunn.app',
  appName: 'SwapRunn',
  webDir: 'dist',
  
  server: {
    url: process.env.CAPACITOR_SERVER_URL || 'https://swaprunn.com',
    cleartext: false,
    androidScheme: 'https',
  },
  
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    backgroundColor: '#ffffff',
    allowsLinkPreview: true,
    scrollEnabled: true,
    limitsNavigationsToAppBoundDomains: true,
  },
  
  android: {
    backgroundColor: '#ffffff',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#ffffff',
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#DC2626',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    Geolocation: {
      requestPermissions: true,
    },
    Device: {},
    Haptics: {},
    Browser: {
      presentationStyle: 'popover',
    },
  },
  
  loggingBehavior: process.env.NODE_ENV === 'production' ? 'none' : 'debug',
};

export default config;
