import type { Metadata, Viewport } from 'next';
import './globals.css';
import './ui.css';
import { SITE } from '@/lib/data';

export const metadata: Metadata = {
  title: `${SITE.name} — ${SITE.role}`,
  description: SITE.tagline,
  openGraph: {
    title: `${SITE.name} — ${SITE.role}`,
    description: SITE.tagline,
    type: 'website',
  },
  icons: {
    icon: [
      {
        url:
          'data:image/svg+xml,' +
          encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#22E1FF"/><stop offset="1" stop-color="#8B5CFF"/></linearGradient></defs><rect width="32" height="32" rx="8" fill="#05070A"/><circle cx="16" cy="16" r="8" fill="none" stroke="url(#g)" stroke-width="2"/><circle cx="16" cy="16" r="2.5" fill="url(#g)"/></svg>`
          ),
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
