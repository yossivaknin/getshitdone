import { CapacitorConfig } from '@capacitor/cli';

// Auto-detect working IP address
function getServerUrl(): string {
  // For production builds (TestFlight), use production server
  // For development, use local dev server
  const isDev = process.env.NODE_ENV === 'development' || process.env.CAPACITOR_DEV === 'true';
  
  if (isDev) {
    // Development: Use local server with auto-detection
    const ips = ['192.168.1.70', '192.168.1.34'];
    const port = 3000;
    return `http://${ips[0]}:${port}`;
  }
  
  // Production/TestFlight: Point to production server
  // This allows the app to work without needing bundled assets
  return 'https://usesitrep.com';
}

const config: CapacitorConfig = {
  appId: 'com.sitrep.app',
  appName: 'SITREP',
  webDir: '.next',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    // Maintained IPs: 192.168.1.70, 192.168.1.34
    // Auto-detects working IP - update getServerUrl() if IPs change
    url: getServerUrl(),
    cleartext: process.env.NODE_ENV === "development" || process.env.CAPACITOR_DEV === "true"
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0F0F0F',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      iosSpinnerStyle: 'small',
      spinnerColor: '#10b981',
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#1A1A1A',
    },
  },
};

export default config;
