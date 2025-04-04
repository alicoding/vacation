'use client';

import { useEffect } from 'react';

// This component hydrates environment variables for client-side use
// Place this in the root layout to ensure it's available globally
export default function EnvironmentProvider() {
  useEffect(() => {
    // Only run on the client side
    if (typeof window !== 'undefined') {
      // Store environment variables in sessionStorage instead of window object
      // This is more secure than exposing them in the DOM via a script tag
      window.__ENV__ = {
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        NEXT_PUBLIC_SUPABASE_ANON_KEY:
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || '',
      };
    }
  }, []);

  // Return null instead of injecting a script
  return null;
}
