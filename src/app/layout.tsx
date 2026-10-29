import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { Providers } from './providers';
import PwaRegister from '@/components/pwa-register';

export const metadata: Metadata = {
  title: {
    default: 'ChillBill Retail POS & ERP',
    template: '%s | ChillBill POS',
  },
  description: 'Smart Departmental Store POS & Management System for billing, inventory, vendor management, customer khata, profit analysis, and staff tracking.',
  keywords: [
    'departmental store POS', 'retail billing software', 'supermarket POS',
    'inventory management software', 'store billing app', 'vendor management',
    'customer khata ledger', 'smart POS', 'store management system',
  ],
  authors: [{ name: 'ChillBill' }],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ChillBill POS',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'ChillBill Retail POS & ERP',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description: 'Smart Departmental Store POS for billing, inventory, vendor management, customer khata, and profit analysis.',
    featureList: [
      'Point of Sale (POS)', 'Staff PIN Login', 'Vendor Management',
      'Inventory Tracking & Reorder Alerts', 'Customer Khata / Ledger',
      'Expense Tracking', 'Profit Margin Analysis',
    ],
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        {/* Early capture beforeinstallprompt and register SW immediately so PWA is fully installable without delay */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.deferredPrompt = null;
              window.addEventListener('beforeinstallprompt', function(e) {
                e.preventDefault();
                window.deferredPrompt = e;
                window.dispatchEvent(new CustomEvent('chillbill:caninstall'));
                console.log('[ChillBill PWA] Early beforeinstallprompt captured!');
              });
              window.addEventListener('appinstalled', function() {
                window.deferredPrompt = null;
                window.dispatchEvent(new CustomEvent('chillbill:installed'));
                console.log('[ChillBill PWA] App installed successfully');
              });
              if ('serviceWorker' in navigator && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
                navigator.serviceWorker.register('/sw.js').then(function(reg) {
                  console.log('[ChillBill PWA] Early SW registered:', reg.scope);
                }).catch(function(e) {
                  console.warn('[ChillBill PWA] Early SW reg failed:', e);
                });
              }
            `,
          }}
        />
      </head>
      <body className="font-body antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Providers>
          <PwaRegister />
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
