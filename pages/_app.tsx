import type { AppProps } from 'next/app'
import { SessionProvider } from 'next-auth/react'

// If you have a theme provider, import it here
import ThemeRegistry from '../app/ThemeRegistry'; 

function MyApp({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  return (
    <SessionProvider session={session}>
      <ThemeRegistry>
        <Component {...pageProps} />
      </ThemeRegistry>
    </SessionProvider>
  )
}

export default MyApp
