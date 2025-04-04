import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import ThemeRegistry from './ThemeRegistry';
import { Providers } from './providers';
import InitialAuthHydration from '@/components/auth/InitialAuthHydration';
import EnvironmentProvider from '@/components/EnvironmentProvider';
import '@/styles/globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Vacation Tracker',
  description: 'Track your vacation days, holidays, and maximize time off',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <InitialAuthHydration />
        <EnvironmentProvider />
      </head>
      <body className={inter.className}>
        <Providers>
          <ThemeRegistry>
            {children}
          </ThemeRegistry>
        </Providers>
      </body>
    </html>
  );
}