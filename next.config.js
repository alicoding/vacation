/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't attempt to bundle server-only packages on the client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'async_hooks': false,
        'fs': false,
        'child_process': false,
        'fs/promises': false,
      };
    }
    return config;
  },
  
  async headers() {
    return [
      {
        source: '/_next/static/media/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/webpack-hmr',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
    ];
  },
  
  poweredByHeader: false,
  
  // Specific Cloudflare configuration
  images: {
    domains: ['vacation.alicoding.com'],
    unoptimized: true,
  },
  
  // Allow cross-origin requests during development
  allowedDevOrigins: ['vacation.alicoding.com'],
  
  // Enable Turbopack for development
  experimental: {
    // Enable Turbopack
    turbo: {
      enabled: true
    }
  },
};

module.exports = nextConfig;