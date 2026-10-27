import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { Providers } from './providers';
import PwaRegister from '@/components/pwa-register';

export const metadata: Metadata = {
  title: {
    default: 'Departmental Store POS & Management System',
    template: '%s | Departmental Store POS',
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
  manifest: '/site.webmanifest',
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Departmental Store POS',
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
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#ffffff" />
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
