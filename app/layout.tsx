import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';

export const dynamic = 'force-dynamic';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000'),
  title: 'Savoiria - Apprendre l\'informatique en français',
  description: 'Plateforme francophone pour apprendre la programmation avec le cours CS50, accompagnement indépendant (non affilié à Harvard)',
  applicationName: 'Savoiria',
  appleWebApp: { capable: true, title: 'Savoiria', statusBarStyle: 'black-translucent' },
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/icons/apple-touch-icon.png',
  },
  openGraph: {
    title: 'Savoiria',
    description: 'Accompagnement indépendant en français pour réussir CS50x, le cours gratuit de l’Université Harvard',
    images: ['/og-image.png'],
  },
};

export const viewport: Viewport = {
  themeColor: '#0f172a',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
