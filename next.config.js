/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NODE_VERSION: process.env.NODE_VERSION,
    SUPABASE_KEY: process.env.SUPABASE_KEY,
    SUPABASE_PASSWORD: process.env.SUPABASE_PASSWORD,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_URL: process.env.SUPABASE_URL,
  },
  // Set runtime configuration
  experimental: {
    // These are the supported experimental options
    serverActions: {
      bodySizeLimit: '2mb',
    },
    turbo: {
      enabled: true,
    },
  },

  // Add specific configuration for Cloudflare Pages
  transpilePackages: ['@cloudflare/next-on-pages'],

  // Other Next.js configurations
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

  // This is important for Cloudflare deployment
  output: 'standalone',
};

export default nextConfig;