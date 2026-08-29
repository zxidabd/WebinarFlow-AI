'use client';

import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, useTheme } from 'next-themes';
import { Toaster } from 'sonner';

function ThemedToaster() {
  const { theme } = useTheme();
  return <Toaster theme={theme as 'light' | 'dark' | 'system'} position="top-right" richColors closeButton />;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            gcTime: 300_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  // Background keep-warm ping to prevent Render cold-starts
  useEffect(() => {
    const rawApi = (process.env.NEXT_PUBLIC_API_URL || 'https://webinarflow-ai.onrender.com').replace(/\/$/, '').replace(/\/api\/v1\/?$/, '');
    const ping = () => fetch(`${rawApi}/health`, { method: 'GET', keepalive: true }).catch(() => {});
    ping();
    const interval = setInterval(ping, 240_000); // every 4 minutes
    return () => clearInterval(interval);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        {children}
        <ThemedToaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
