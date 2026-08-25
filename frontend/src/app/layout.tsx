import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.variable}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
