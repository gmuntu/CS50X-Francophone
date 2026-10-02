'use client';

import { useState } from 'react';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { User, Mail, Shield, Save, Loader2, Phone } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

interface Props {
  user: { id: string; name: string; email: string; image: string | null; role: string };
  phone?: string;
  dialCode?: string;
}

export default function ProfileClient({ user, phone: initialPhone, dialCode: initialDial }: Props) {
  const [name, setName] = useState(user?.name ?? '');
  const [dialCode, setDialCode] = useState(initialDial || '+');
  const [phone, setPhone] = useState(initialPhone ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, dialCode }),
      });
      if (res?.ok) toast?.success?.('Profil mis à jour');
      else {
        const j = await res.json().catch(() => ({}));
        toast?.error?.(j?.error || 'Erreur de mise à jour');
      }
    } catch { toast?.error?.('Erreur réseau'); }
    finally { setSaving(false); }
  };

  const roleLabel: Record<string, string> = { STUDENT: 'Étudiant', INSTRUCTOR: 'Instructeur', ADMIN: 'Administrateur' };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight mb-6">Mon Profil</h1>

          <div className="bg-card border border-border rounded-xl p-6 space-y-5">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary">
                {user?.name?.[0]?.toUpperCase?.() ?? 'U'}
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{user?.name}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> {roleLabel?.[user?.role] ?? user?.role}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1.5">Nom complet</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={name}
                  onChange={(e: any) => setName(e?.target?.value ?? '')}
                  className="w-full bg-muted border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={user?.email}
                  disabled
                  className="w-full bg-muted border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-muted-foreground cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1.5">Téléphone (pour le tuteur par SMS / WhatsApp)</label>
              <div className="flex gap-2">
                <input
                  value={dialCode}
                  onChange={(e: any) => setDialCode(e?.target?.value ?? '')}
                  placeholder="+243"
                  aria-label="Indicatif du pays"
                  inputMode="tel"
                  className="w-24 bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <div className="relative flex-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    value={phone}
                    onChange={(e: any) => setPhone(e?.target?.value ?? '')}
                    placeholder="812345678"
                    aria-label="Numéro de téléphone"
                    inputMode="tel"
                    className="w-full bg-muted border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">Indicatif du pays (ex. +243, +237, +1) puis votre numéro. C'est depuis ce numéro que vous écrirez à Socrate.</p>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Sauvegarder
            </button>
          </div>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}
