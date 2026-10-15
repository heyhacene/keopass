import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'fr.keo.pass',
  appName: 'KeoPass',
  webDir: 'out',
  server: {
    androidScheme: 'https',
  },
};

export default config;
