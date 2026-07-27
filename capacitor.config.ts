import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.scholarx.app',
  appName: 'ScholarX',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    url: 'http://10.0.2.2:3000',
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      backgroundColor: '#0A0628',
      showSpinner: true,
      spinnerColor: '#7C3AED',
    },
  },
};

export default config;
