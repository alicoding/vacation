import type { AppProps } from 'next/app';
import { AuthProvider } from '@/components/auth/AuthProvider';

// If you have a theme provider, import it here
import ThemeRegistry from '../app/ThemeRegistry'; 

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <ThemeRegistry>
        <Component {...pageProps} />
      </ThemeRegistry>
    </AuthProvider>
  );
}

export default MyApp;
