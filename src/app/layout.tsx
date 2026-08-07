import type { Metadata, Viewport } from 'next';
import './globals.css';
import './ui.css';
import { SITE } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Farhan Labib - Portfolio',
  description: SITE.tagline,
  openGraph: {
    title: 'Farhan Labib - Portfolio',
    description: SITE.tagline,
    type: 'website',
  },
  icons: {
    icon: [
      {
        url: '/portfolio/signature-favicon.png',
        sizes: '64x64',
        type: 'image/png',
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#E9EEF6',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Fonts loaded at runtime (not build time) so the build never depends
            on network access to Google's CDN. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Variable-axis ranges (`300..700`), not a list of static instances.
            The stylesheet uses intermediate weights like 450 for body copy —
            with static instances the browser would snap those to 400 and the
            text would render lighter than intended. */}
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&family=JetBrains+Mono:wght@300..700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
