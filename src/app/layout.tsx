import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { Providers } from './providers';
import { HorizonLine } from '@/components/HorizonLine';
import { RpcStatusBanner } from '@/components/RpcStatusBanner';
import './globals.css';

const geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' });

export const metadata: Metadata = {
  metadataBase: new URL('https://loopdeloop.xyz'),
  title: 'loopdeloop · leveraged loops on Morpho',
  description:
    'Non-custodial leveraged exposure to PRIME, executed in a single transaction. Connect Phantom, pick your leverage, go.',
  openGraph: {
    title: 'loopdeloop',
    description: 'Leveraged PRIME loops on Morpho Blue. Non-custodial. One transaction.',
    url: 'https://loopdeloop.xyz',
  },
  twitter: { card: 'summary_large_image' },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32.png', sizes: '32x32' },
      { url: '/favicon-16.png', sizes: '16x16' },
    ],
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <AppRouterCacheProvider options={{ key: 'mui' }}>
          <Providers>
            <HorizonLine />
            <RpcStatusBanner />
            <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
          </Providers>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
