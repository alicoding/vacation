import type { AppProps } from 'next/app';
import { useState, useEffect } from 'react';
import ThemeRegistry from '../app/ThemeRegistry';

/**
 * Custom App component with dynamic auth provider loading
 * This prevents createBrowserSupabaseClient from being called during SSR
 */
function MyApp({ Component, pageProps }: AppProps) {
  // State to track if we're in client-side rendering
  const [mounted, setMounted] = useState(false);

  // Effect only runs on client
  useEffect(() => {
    setMounted(true);
  }, []);

  // During SSR or initial render, render without AuthProvider
  if (!mounted) {
    return (
      <ThemeRegistry>
        <Component {...pageProps} />
      </ThemeRegistry>
    );
  }

  // Dynamically import AuthProvider only on client side
  // This avoids the "createBrowserSupabaseClient called in server context" error
  const { AuthProvider } = require('@/components/auth/AuthProvider');
  
  return (
    <AuthProvider>
      <ThemeRegistry>
        <Component {...pageProps} />
      </ThemeRegistry>
    </AuthProvider>
  );
}

export default MyApp;
