import 'dotenv/config';

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'temporarysecretchangethisinproduction',
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'https://vacation.alicoding.com',
    SUPABASE_PASSWORD: process.env.SUPABASE_PASSWORD,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_URL: process.env.SUPABASE_URL,
    // Add the public Supabase variables needed in the browser with fallbacks for build time
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ncgjvozaempugyiqbfxo.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jZ2p2b3phZW1wdWd5aXFiZnhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI5NTg3MDcsImV4cCI6MjA1ODUzNDcwN30.cNs2cD2iCZGzzYngBW3MrDAVF-p5nJz4ngyytzmFbUg',
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
    turbo: {
      enabled: true,
    },
  },
  // Remove any output or distDir settings if present
  
  // For Cloudflare Pages with @cloudflare/next-on-pages
  // Don't set output: 'export' as that strips server functionality
  
  // These are already correctly configured:
  // - transpilePackages: ['@cloudflare/next-on-pages']
  // - trailingSlash: false
  // - skipTrailingSlashRedirect: true
};

export default nextConfig;