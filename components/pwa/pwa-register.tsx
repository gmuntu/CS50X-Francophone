'use client';

import { useEffect, useState } from 'react';
import { Download, X, WifiOff, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { flushQueue, pendingCount, SYNC_EVENT } from '@/lib/sync-queue';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'savoiria-install-dismissed';

/** Enregistre le service worker, propose l'installation et signale le mode hors ligne. */
export default function PwaRegister() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [offline, setOffline] = useState(false);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js', { updateViaCache: 'none' })
        .then((reg) => reg.update().catch(() => {}))
        .catch(() => {});
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      let dismissed = false;
      try { dismissed = localStorage.getItem(DISMISS_KEY) === '1'; } catch {}
      if (!dismissed) setInstallEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstallEvent(null);
    const sync = async () => {
      const n = await flushQueue();
      if (n > 0) toast.success(n === 1 ? '1 résultat de quiz synchronisé.' : `${n} résultats de quiz synchronisés.`);
    };
    const update = () => {
      setOffline(!navigator.onLine);
      if (navigator.onLine) sync();
    };
    const onQueue = () => setPending(pendingCount());
    onQueue();
    update();
    window.addEventListener(SYNC_EVENT, onQueue);
    const timer = window.setInterval(() => { if (navigator.onLine && pendingCount() > 0) sync(); }, 60_000);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
      window.removeEventListener(SYNC_EVENT, onQueue);
      window.clearInterval(timer);
    };
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch {}
    setInstallEvent(null);
  };

  return (
    <>
      {offline && (
        <div className="fixed top-0 inset-x-0 z-[60] bg-amber-500 text-black text-xs font-bold text-center py-1.5 flex items-center justify-center gap-2">
          <WifiOff className="w-3.5 h-3.5" /> Hors ligne — vos cours enregistrés restent disponibles
          {pending > 0 && <span>· {pending} quiz en attente d'envoi</span>}
        </div>
      )}
      {!offline && pending > 0 && (
        <button
          onClick={async () => { const n = await flushQueue(); if (n === 0) toast.info("Envoi impossible pour l'instant : reconnectez-vous à votre compte ou réessayez plus tard."); }}
          className="fixed bottom-4 left-4 z-[60] inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-card border border-border shadow-lg text-xs font-bold text-foreground"
        >
          <RefreshCw className="w-3.5 h-3.5" /> {pending} quiz à envoyer
        </button>
      )}
      {installEvent && (
        <div className="fixed bottom-4 inset-x-4 sm:left-auto sm:right-4 sm:w-96 z-[60] bg-card border border-border rounded-2xl shadow-lg p-4 flex items-start gap-3">
          <img src="/icons/icon-192.png" alt="" className="w-10 h-10 rounded-xl" />
          <div className="flex-1 space-y-2">
            <p className="text-sm font-bold text-foreground">Installer SavoirIA</p>
            <p className="text-xs text-muted-foreground">Ouvrez vos cours comme une application et écoutez les podcasts même sans connexion.</p>
            <button
              onClick={async () => { await installEvent.prompt(); setInstallEvent(null); }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90"
            >
              <Download className="w-3.5 h-3.5" /> Installer
            </button>
          </div>
          <button onClick={dismiss} aria-label="Fermer" className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  );
}
