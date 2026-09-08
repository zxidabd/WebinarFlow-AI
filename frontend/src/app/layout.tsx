import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Script from 'next/script';
import { Providers } from '@/components/providers';
import { FloatingAIAssistant } from '@/components/FloatingAIAssistant';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'WebinarFlow AI — Build AI-Powered Webinar Funnels That Convert',
  description:
    'Generate landing pages, webinar scripts, email campaigns, WhatsApp sequences, and sales funnels with AI. The all-in-one platform to launch high-converting webinars in minutes.',
  keywords: [
    'AI webinar funnel',
    'webinar automation',
    'email automation',
    'WhatsApp automation',
    'AI funnel builder',
    'sales funnel',
  ],
  openGraph: {
    title: 'WebinarFlow AI — Build AI-Powered Webinar Funnels That Convert',
    description:
      'Generate landing pages, webinar scripts, email campaigns, WhatsApp sequences, and sales funnels with AI.',
    type: 'website',
  },
  icons: {
    icon: [
      { url: '/logo.png', type: 'image/png' },
    ],
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.variable}>
        <Providers>
          {children}
          <FloatingAIAssistant />
        </Providers>
        <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      </body>
    </html>
  );
}
