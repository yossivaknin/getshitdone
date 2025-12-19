/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  transpilePackages: [
    'react-hot-toast',
    '@radix-ui/react-dialog',
    '@tauri-apps/api',
    '@tauri-apps/plugin-notification',
  ],
  // For Tauri: use static export when building for desktop
  output: process.env.TAURI_BUILD === 'true' ? 'export' : undefined,
  // Output configuration for Tauri
  output: process.env.TAURI_BUILD === 'true' ? 'export' : undefined,
  // PWA configuration
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
