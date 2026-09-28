'use client';

import PasswordInput from '@/components/password-input';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen, KeyRound, CheckCircle2, AlertCircle, ShieldCheck, RefreshCw } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Étape 1 : Demande de réinitialisation
  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Erreur lors de la demande de réinitialisation.');
        return;
      }

      setResetCode('');
      setSuccessMsg(data.message || 'Si un compte existe, un code vous a été envoyé par email.');
      setStep(2);
    } catch {
      setError('Impossible de joindre le serveur. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  };

  // Étape 2 : Réinitialisation avec nouveau mot de passe et contre-vérification
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 10) {
      setError('Le mot de passe doit contenir au moins 10 caractères.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Les deux mots de passe ne correspondent pas. Veuillez vérifier votre saisie.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          token: resetCode.trim().toUpperCase(),
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Erreur lors de la réinitialisation.');
        return;
      }

      setSuccessMsg(data.message || 'Votre mot de passe a été réinitialisé !');
      setStep(3);
    } catch {
      setError('Une erreur est survenue lors de la réinitialisation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md mb-6">
        <Link
          href="/auth/login"
          className="inline-flex items-center text-sm font-semibold text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Retour à la connexion
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
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <KeyRound className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-extrabold text-foreground">Réinitialisation</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {step === 1 && 'Saisissez votre adresse email pour recevoir un code de sécurité'}
            {step === 2 && 'Définissez votre nouveau mot de passe'}
            {step === 3 && 'Mot de passe mis à jour avec succès'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ÉTAPE 1 : Saisie de l'email */}
        {step === 1 && (
          <form onSubmit={handleRequestCode} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Adresse email associée à votre compte
              </label>
              <input
                type="email"
                required
                className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="etudiant@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Génération du code...
                </>
              ) : (
                'Envoyer le code de réinitialisation'
              )}
            </button>
          </form>
        )}

        {/* ÉTAPE 2 : Saisie du code + Nouveau mot de passe avec confirmation */}
        {step === 2 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl text-center">
              <p className="text-xs text-primary font-medium">Consultez votre boîte email (et les courriers indésirables).</p>
              <p className="text-[11px] text-muted-foreground mt-1">Le code de 8 caractères est valable 1 heure.</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Code de sécurité / Vérification
              </label>
              <input
                type="text"
                required
                className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Code reçu par email"
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Nouveau mot de passe
              </label>
              <PasswordInput
                required
                className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="10 caractères minimum"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Confirmer le nouveau mot de passe
              </label>
              <PasswordInput
                required
                className={`w-full px-4 py-2.5 rounded-xl bg-muted border text-foreground text-sm focus:outline-none focus:ring-2 ${
                  confirmPassword && newPassword === confirmPassword
                    ? 'border-emerald-500/50 focus:ring-emerald-500'
                    : confirmPassword && newPassword !== confirmPassword
                    ? 'border-red-500/50 focus:ring-red-500'
                    : 'border-border focus:ring-primary'
                }`}
                placeholder="Ressaisissez le mot de passe identique"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              {confirmPassword && newPassword === confirmPassword && (
                <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Mots de passe identiques
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Mise à jour en cours...
                </>
              ) : (
                'Mettre à jour mon mot de passe'
              )}
            </button>
          </form>
        )}

        {/* ÉTAPE 3 : Succès & redirection */}
        {step === 3 && (
          <div className="text-center py-4 space-y-4">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Mot de passe réinitialisé !</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {successMsg || 'Vous pouvez désormais vous connecter avec votre nouveau mot de passe sécurisé.'}
              </p>
            </div>
            <Link
              href="/auth/login"
              className="inline-block w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm text-center hover:bg-primary/90 transition"
            >
              Aller à la page de connexion
            </Link>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-border text-center">
          <Link href="/auth/login" className="text-xs text-muted-foreground hover:text-primary transition">
            Vous vous souvenez de votre mot de passe ? Se connecter
          </Link>
        </div>
      </div>
    </div>
  );
}
