import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mingstar556.starphotobooth',
  appName: 'StarPhotobooth',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 400,
      backgroundColor: '#0A0A0D'
    }
  }
};

export default config;
