import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'co.uk.designspin.orbitaldrift',
  appName: 'Orbital Drift',
  webDir: 'dist',
  ios: {
    minVersion: '15.0'
  }
};

export default config;
