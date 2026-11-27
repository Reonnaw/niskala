import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import SiteHeader from '@/components/site-header';
import { Toaster } from '@/components/ui-client';
import { SITE_URL } from '@/lib/site';
import { THEME_SCRIPT } from '@/lib/store';
import './globals.css';

// Drawn by Tokotype for Jakarta's own city identity: warm, open shapes and clear figures for live readouts.
const jakarta = Plus_Jakarta_Sans({ variable: '--font-jakarta', subsets: ['latin'] });

const description =
  'Stres nggak kelihatan, tapi badan dan kebiasaan kerjamu kelihatan. Niskala ngecek postur dan kedipan lewat webcam di perangkatmu, ngajak jeda napas dan stretching, dan nunjukin dari datamu sendiri gimana jeda ngaruh ke stresmu.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'Niskala: jaga kesehatan mental lewat badan dan kebiasaan kerja', template: '%s · Niskala' },
  description,
  applicationName: 'Niskala',
  openGraph: { type: 'website', locale: 'id_ID', siteName: 'Niskala', title: 'Niskala', description },
  twitter: { card: 'summary_large_image' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4eee3' },
    { media: '(prefers-color-scheme: dark)', color: '#13141d' },
  ],
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="id" className={`${jakarta.variable} antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-dvh">
        <a href="#isi" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-xl focus:bg-raised focus:px-4 focus:py-2 focus:text-sm focus:font-semibold">
          Lewati ke isi
        </a>
        <SiteHeader />
        <div id="isi">{children}</div>
        <Toaster />
      </body>
    </html>
  );
}
