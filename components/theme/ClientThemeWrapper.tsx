'use client';

import { ReactNode, useState, useEffect } from 'react';
import { CacheProvider, EmotionCache } from '@emotion/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import createEmotionCache from '@/utils/createEmotionCache';
import { theme } from '@/utils/theme'; // Adjust the import path to where your theme is defined

interface ClientThemeWrapperProps {
  children: ReactNode;
  emotionCache?: EmotionCache;
}

// Client-side cache shared across the whole user session
const clientSideEmotionCache = createEmotionCache();

export default function ClientThemeWrapper({ 
  children, 
  emotionCache = clientSideEmotionCache 
}: ClientThemeWrapperProps) {
  // Use a state to prevent hydration issues with dynamic client-side initialization
  const [mounted, setMounted] = useState(false);

  // Only show the UI after first client-side render to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <CacheProvider value={emotionCache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {mounted ? children : null}
      </ThemeProvider>
    </CacheProvider>
  );
}
