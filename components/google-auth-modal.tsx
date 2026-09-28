'use client';

import React, { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { X, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Key, ExternalLink, Loader2 } from 'lucide-react';

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEmail?: string;
}

export default function GoogleAuthModal({ isOpen, onClose, defaultEmail = '' }: GoogleAuthModalProps) {
  const [email, setEmail] = useState(defaultEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showConfigGuide, setShowConfigGuide] = useState(false);

  useEffect(() => {
    if (defaultEmail) setEmail(defaultEmail);
  }, [defaultEmail]);

  if (!isOpen) return null;

  const handleDirectGoogleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Veuillez saisir votre adresse email Google.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      // Connexion Google réelle (OAuth). Nécessite GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET.
      await signIn('google', { callbackUrl: '/dashboard' });
    } catch {
      setError('Une erreur est survenue lors de la connexion.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center shrink-0">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Connexion Google</h3>
            <p className="text-xs text-muted-foreground">Authentification directe ou OAuth 2.0</p>
          </div>
        </div>

        {/* Info Alert */}
        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-200 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-300">Mode Local / Sans configuration Cloud :</p>
            <p className="text-amber-200/90 mt-0.5">
              Les identifiants Google OAuth ne sont pas encore configurés dans <code className="bg-amber-950/60 px-1 py-0.5 rounded text-[11px]">.env</code>. Vous pouvez vous connecter <strong>directement</strong> avec votre adresse Google ci-dessous !
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-3 p-2.5 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">
            {error}
          </div>
        )}

        {/* Formulaire de connexion directe */}
        <form onSubmit={handleDirectGoogleLogin} className="space-y-3 mb-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Votre adresse Google / Gmail
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre.email@gmail.com"
              className="w-full px-3.5 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Connexion en cours...
              </>
            ) : (
              'Se connecter avec cette adresse Google'
            )}
          </button>
        </form>

        {/* Toggle Guide Configuration Cloud */}
        <div className="border-t border-border pt-3">
          <button
            type="button"
            onClick={() => setShowConfigGuide(!showConfigGuide)}
            className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground font-medium py-1 transition"
          >
            <span className="flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-primary" />
              Comment activer le popup Google officiel ?
            </span>
            {showConfigGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showConfigGuide && (
            <div className="mt-2.5 p-3 rounded-xl bg-muted/60 border border-border text-[11px] text-muted-foreground space-y-2 animate-fade-in">
              <p>Pour activer la fenêtre de connexion Google officielle :</p>
              <ol className="list-decimal list-inside space-y-1 text-foreground/90">
                <li>
                  Rendez-vous sur{' '}
                  <a
                    href="https://console.cloud.google.com/apis/credentials"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-0.5"
                  >
                    Google Cloud Console <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </li>
                <li>Créez des identifiants <strong>ID client OAuth</strong> (Application Web)</li>
                <li>
                  Ajoutez l'URI de redirection :
                  <div className="font-mono bg-background/80 p-1.5 rounded border border-border mt-0.5 select-all text-[10px]">
                    http://localhost:3000/api/auth/callback/google
                  </div>
                </li>
                <li>
                  Ajoutez les deux clés dans votre fichier <code className="text-primary">.env</code> :
                  <pre className="font-mono bg-background/80 p-1.5 rounded border border-border mt-0.5 overflow-x-auto text-[10px]">
{`GOOGLE_CLIENT_ID="votre-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-votre-secret"`}
                  </pre>
                </li>
                <li>Redémarrez le serveur avec <code className="text-primary">npm run dev</code>.</li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
