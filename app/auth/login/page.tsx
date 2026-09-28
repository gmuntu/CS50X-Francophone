'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, BookOpen, Github, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import GoogleAuthModal from '@/components/google-auth-modal';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [providersStatus, setProvidersStatus] = useState<{ hasGoogleOAuth: boolean; hasGithubOAuth: boolean }>({
    hasGoogleOAuth: false,
    hasGithubOAuth: false,
  });

  // Détection des erreurs NextAuth dans l'URL
  useEffect(() => {
    const urlError = searchParams?.get('error');
    if (urlError === 'OAuthSignin' || urlError === 'OAuthCallback') {
      setError('Erreur lors de la communication avec le fournisseur d\'authentification.');
    } else if (urlError === 'OAuthAccountNotLinked') {
      setError('Cette adresse email est déjà associée à un autre mode de connexion.');
    } else if (urlError === 'Configuration') {
      setError('Configuration OAuth incomplète sur le serveur.');
    } else if (urlError) {
      setError('Une erreur d\'authentification est survenue.');
    }
  }, [searchParams]);

  // Vérifier la disponibilité des clés OAuth réelles
  useEffect(() => {
    fetch('/api/auth/providers-status')
      .then((res) => res.json())
      .then((data) => setProvidersStatus(data))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const email = formData.email.trim().toLowerCase();
      const password = formData.password;

      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        console.error('Erreur authentification:', result.error);
        if (result.error === 'Configuration') {
          setError('Erreur de configuration réseau. Veuillez actualiser la page et réessayer.');
        } else {
          setError('Email ou mot de passe incorrect.');
        }
      } else {
        window.location.href = '/dashboard';
      }
    } catch (err) {
      console.error('Exception connexion:', err);
      setError('Une erreur est survenue lors de la connexion.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleClick = () => {
    if (providersStatus.hasGoogleOAuth) {
      signIn('google', { redirectTo: '/dashboard' });
    } else {
      setIsGoogleModalOpen(true);
    }
  };

  const handleGithubClick = () => {
    if (providersStatus.hasGithubOAuth) {
      signIn('github', { redirectTo: '/dashboard' });
    } else {
      setError('GitHub OAuth n\'est pas encore configuré dans votre fichier .env.');
    }
  };

  const fillCredentials = (email: string, pass: string) => {
    setFormData({ email, password: pass });
    setError('');
  };

  return (
    <>
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-12">
        <div className="w-full max-w-md mb-6">
          <Link
            href="/"
            className="inline-flex items-center text-sm font-semibold text-muted-foreground hover:text-foreground transition"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Retour à l'accueil
          </Link>
        </div>

        <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-xl">
          <div className="text-center mb-6">
            <Link href="/" className="inline-flex items-center justify-center gap-2.5 mb-4">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-extrabold text-foreground">
                CS50X <span className="text-primary">Francophone</span>
              </span>
            </Link>
            <h1 className="text-2xl font-extrabold text-foreground">Connexion Membres</h1>
            <p className="text-sm text-muted-foreground mt-1">Accédez à votre espace de formation</p>
          </div>

          {/* Boutons OAuth Google & GitHub */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              type="button"
              onClick={handleGoogleClick}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-sm font-semibold border border-border transition relative group"
              title={providersStatus.hasGoogleOAuth ? 'Connexion via Google' : 'Connexion Google (Mode direct / configuration)'}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
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
              <span>Google</span>
            </button>
            <button
              type="button"
              onClick={handleGithubClick}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-sm font-semibold border border-border transition"
            >
              <Github className="w-4 h-4" />
              <span>GitHub</span>
            </button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-3 text-muted-foreground">Ou avec votre email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Email</label>
              <input
                type="email"
                required
                className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="votre.email@exemple.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold text-foreground">Mot de passe</label>
                <Link href="/auth/forgot-password" className="text-xs text-primary hover:underline font-medium">
                  Mot de passe oublié ?
                </Link>
              </div>
              <input
                type="password"
                required
                className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Connexion...
                </>
              ) : (
                'Se connecter'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Pas encore de compte ?{' '}
            <Link href="/auth/signup" className="text-primary font-bold hover:underline">
              S'inscrire
            </Link>
          </p>
        </div>
      </div>

      {/* Modal Google Auth direct / configuration */}
      <GoogleAuthModal
        isOpen={isGoogleModalOpen}
        onClose={() => setIsGoogleModalOpen(false)}
        defaultEmail={formData.email || ''}
      />
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
