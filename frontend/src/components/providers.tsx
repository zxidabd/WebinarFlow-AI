'use client';

import { useState } from 'react';
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
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  // Background keep-warm ping to Render backend
  useState(() => {
    if (typeof window !== 'undefined') {
      const rawApi = (process.env.NEXT_PUBLIC_API_URL || 'https://webinarflow-ai.onrender.com').replace(/\/$/, '').replace(/\/api\/v1\/?$/, '');
      fetch(`${rawApi}/health`, { method: 'GET', keepalive: true }).catch(() => {});
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        {children}
        <ThemedToaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
