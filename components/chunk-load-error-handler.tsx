'use client';
import { useEffect } from 'react';
export default function ChunkLoadErrorHandler() {
  useEffect(() => {
    const handler = (e: ErrorEvent) => {
      if (e?.message?.includes?.('ChunkLoadError') || e?.message?.includes?.('Loading chunk')) {
        window.location.reload();
      }
    };
    window.addEventListener('error', handler);
    return () => window.removeEventListener('error', handler);
  }, []);
  return null;
}
