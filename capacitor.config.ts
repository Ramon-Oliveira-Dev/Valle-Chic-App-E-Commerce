import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vallechic.app',
  appName: 'Valle Chic',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
