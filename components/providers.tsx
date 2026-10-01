'use client';

import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'sonner';
import PwaRegister from '@/components/pwa/pwa-register';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <PwaRegister />
      <Toaster position="top-right" richColors />
    </SessionProvider>
  );
}
