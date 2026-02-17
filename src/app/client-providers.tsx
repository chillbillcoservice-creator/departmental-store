'use client';

import { ThemeProvider } from 'next-themes';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { ThemeColorProvider } from '@/contexts/theme-color-context';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <ThemeColorProvider>
        <FirebaseClientProvider>{children}</FirebaseClientProvider>
      </ThemeColorProvider>
    </ThemeProvider>
  );
}
