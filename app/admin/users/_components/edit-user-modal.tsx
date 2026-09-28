'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Loader2, Camera, Check, AlertCircle, Phone, Calendar,
  CreditCard, Building2, Shield, UserCheck, RefreshCw, KeyRound
} from 'lucide-react';
import toast from 'react-hot-toast';
import FacialCaptureModal from '@/components/facial-capture-modal';
import {
  AFRICAN_COUNTRIES,
  PAYMENT_METHODS,
  PARTNER_UNIVERSITIES,
  generateDossierNumber,
  CountryOption,
} from '@/config/african-countries';

interface UserItem {
  id: string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  role: string;
  status: string;
  phone?: string | null;
  countryCode?: string | null;
  dialCode?: string | null;
  dossierNumber?: string | null;
  birthDate?: string | null;
  photoUrl?: string | null;
  facialVerificationStatus?: string;
  studentType?: string;
  university?: string | null;
  paymentStatus?: string;
  paymentMethod?: string | null;
  paymentAmount?: number | null;
  createdAt: string;
}

interface EditUserModalProps {
  user: UserItem | null;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated: (updated: UserItem) => void;
}

export default function EditUserModal({ user, isOpen, onClose, onUserUpdated }: EditUserModalProps) {
  const defaultCountry = AFRICAN_COUNTRIES[0];
  const [selectedCountry, setSelectedCountry] = useState<CountryOption>(defaultCountry);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    countryCode: defaultCountry.code,
    dialCode: defaultCountry.dialCode,
    dossierNumber: '',
    birthDate: '',
    studentType: 'LIBRE' as 'LIBRE' | 'UNIVERSITAIRE',
    university: '',
    customUniversity: '',
    paymentStatus: 'PENDING',
    paymentMethod: 'MPESA',
    paymentAmount: 500,
    role: 'STUDENT',
    status: 'ACTIVE',
    facialVerificationStatus: 'PENDING',
    photoUrl: '',
    newPassword: '',
  });

  useEffect(() => {
    if (user) {
      const country =
        AFRICAN_COUNTRIES.find((c) => c.code === user.countryCode || c.dialCode === user.dialCode) ||
        defaultCountry;
      setSelectedCountry(country);

      const isKnownUni = PARTNER_UNIVERSITIES.includes(user.university || '');

      setFormData({
        firstName: user.firstName || user.name?.split(' ')?.[0] || '',
        lastName: user.lastName || user.name?.split(' ')?.slice(1)?.join(' ') || '',
        email: user.email || '',
        phone: user.phone || '',
        countryCode: user.countryCode || country.code,
        dialCode: user.dialCode || country.dialCode,
        dossierNumber: user.dossierNumber || '',
        birthDate: user.birthDate ? new Date(user.birthDate).toISOString().split('T')[0] : '',
        studentType: user.studentType === 'UNIVERSITAIRE' ? 'UNIVERSITAIRE' : 'LIBRE',
        university: isKnownUni ? user.university || '' : (user.university ? 'Autre université (saisie libre)' : ''),
        customUniversity: isKnownUni ? '' : (user.university || ''),
        paymentStatus: user.paymentStatus || 'PENDING',
        paymentMethod: user.paymentMethod || 'MPESA',
        paymentAmount:
          typeof user.paymentAmount === 'number'
            ? user.paymentAmount
            : user.studentType === 'UNIVERSITAIRE'
            ? 0
            : 500,
        role: user.role || 'STUDENT',
        status: user.status || 'ACTIVE',
        facialVerificationStatus: user.facialVerificationStatus || 'PENDING',
        photoUrl: user.photoUrl || '',
        newPassword: '',
      });
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const handleCountryChange = (countryCode: string) => {
    const country = AFRICAN_COUNTRIES.find((c) => c.code === countryCode) || defaultCountry;
    setSelectedCountry(country);
    setFormData((prev) => ({
      ...prev,
      countryCode: country.code,
      dialCode: country.dialCode,
    }));
  };

  const handleRegenerateDossier = () => {
    setFormData((prev) => ({
      ...prev,
      dossierNumber: generateDossierNumber(selectedCountry.prefixDossier),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast.error('Le prénom et le nom sont requis.');
      return;
    }
    if (!formData.email.trim()) {
      toast.error('L\'adresse email est requise.');
      return;
    }

    if (formData.studentType === 'UNIVERSITAIRE') {
      const uni =
        formData.university === 'Autre université (saisie libre)'
          ? formData.customUniversity.trim()
          : formData.university;
      if (!uni) {
        toast.error('Veuillez spécifier l\'université partenaire pour cet étudiant universitaire.');
        return;
      }
    }

    if (formData.newPassword && formData.newPassword.length < 6) {
      toast.error('Le nouveau mot de passe doit comporter au moins 6 caractères.');
      return;
    }

    setSaving(true);
    try {
      const finalUniversity =
        formData.studentType === 'UNIVERSITAIRE'
          ? formData.university === 'Autre université (saisie libre)'
            ? formData.customUniversity.trim()
            : formData.university
          : null;

      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim(),
          countryCode: formData.countryCode,
          dialCode: formData.dialCode,
          dossierNumber: formData.dossierNumber.trim(),
          birthDate: formData.birthDate || null,
          studentType: formData.studentType,
          university: finalUniversity,
          paymentStatus: formData.paymentStatus,
          paymentMethod: formData.paymentMethod,
          paymentAmount: formData.studentType === 'UNIVERSITAIRE' ? 0 : Number(formData.paymentAmount),
          role: formData.role,
          status: formData.status,
          facialVerificationStatus: formData.facialVerificationStatus,
          photoUrl: formData.photoUrl || null,
          newPassword: formData.newPassword || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || 'Erreur lors de la mise à jour.');
        return;
      }

      toast.success(`Étudiant ${data.user?.name || data.user?.email} mis à jour avec succès !`);
      onUserUpdated(data.user);
      onClose();
    } catch {
      toast.error('Erreur de connexion au serveur.');
    } finally {
      setSaving(false);
    }
  };

  const isSuperAdmin = ['gmuntusip@gmail.com', 'admin@cs50x-francophone.com'].includes(user.email || '');

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-card border border-border rounded-2xl shadow-2xl max-w-2xl w-full my-8 overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border bg-muted/40 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Modifier la fiche étudiant</h2>
                <p className="text-xs text-muted-foreground">
                  {user.name || user.email} • Dossier : {user.dossierNumber || 'N/A'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
            {/* 1. Identité */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-primary" /> Identité & Coordonnées
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-foreground mb-1">Prénom *</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-xl text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-foreground mb-1">Nom *</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-xl text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="block font-semibold text-foreground mb-1">Adresse Email *</label>
                  <input
                    type="email"
                    required
                    disabled={isSuperAdmin}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-xl text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
                  />
                  {isSuperAdmin && (
                    <p className="text-[10px] text-amber-500 mt-0.5">Email du Super Admin principal verrouillé.</p>
                  )}
                </div>
                <div>
                  <label className="block font-semibold text-foreground mb-1">Date de naissance</label>
                  <input
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-xl text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Téléphone & Code Pays */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                <div>
                  <label className="block font-semibold text-foreground mb-1">Pays</label>
                  <select
                    value={formData.countryCode}
                    onChange={(e) => handleCountryChange(e.target.value)}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-xl text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {AFRICAN_COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.name} ({c.dialCode})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block font-semibold text-foreground mb-1">
                    Téléphone ({formData.dialCode})
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder={selectedCountry.phonePlaceholder}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-xl text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Numéro de dossier */}
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-foreground">
                    Numéro de dossier (doit débuter par {selectedCountry.prefixDossier})
                  </label>
                  <button
                    type="button"
                    onClick={handleRegenerateDossier}
                    className="text-[11px] text-primary hover:underline flex items-center gap-1 font-semibold"
                  >
                    <RefreshCw className="w-3 h-3" /> Régénérer
                  </button>
                </div>
                <input
                  type="text"
                  value={formData.dossierNumber}
                  onChange={(e) => setFormData({ ...formData, dossierNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-xl font-mono text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* 2. Type d'étudiant & Paiement */}
            <div className="border-t border-border pt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-primary" /> Typologie & Frais d'inscription
              </h3>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      studentType: 'LIBRE',
                      paymentAmount: 500,
                      paymentStatus: prev.paymentStatus === 'EXEMPTED' ? 'PENDING' : prev.paymentStatus,
                    }))
                  }
                  className={`p-3 rounded-xl border text-left transition flex flex-col ${
                    formData.studentType === 'LIBRE'
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <span className="font-bold text-xs">Étudiant Libre</span>
                  <span className="text-primary font-black text-sm mt-0.5">500 USD</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      studentType: 'UNIVERSITAIRE',
                      paymentAmount: 0,
                      paymentStatus: 'EXEMPTED',
                      paymentMethod: 'EXEMPT_UNIVERSITY',
                    }))
                  }
                  className={`p-3 rounded-xl border text-left transition flex flex-col ${
                    formData.studentType === 'UNIVERSITAIRE'
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <span className="font-bold text-xs">Étudiant Universitaire</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-black text-sm mt-0.5">0 USD (Gratuit)</span>
                </button>
              </div>

              {formData.studentType === 'UNIVERSITAIRE' && (
                <div className="space-y-2 mb-3 p-3 rounded-xl bg-muted/40 border border-border">
                  <label className="block font-semibold text-foreground">Université Partenaire *</label>
                  <select
                    value={formData.university}
                    onChange={(e) => setFormData({ ...formData, university: e.target.value })}
                    className="w-full px-3 py-2 bg-card border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Sélectionnez l'université partenaire...</option>
                    {PARTNER_UNIVERSITIES.map((uni) => (
                      <option key={uni} value={uni}>
                        {uni}
                      </option>
                    ))}
                  </select>

                  {formData.university === 'Autre université (saisie libre)' && (
                    <input
                      type="text"
                      placeholder="Nom de l'université partenaire..."
                      value={formData.customUniversity}
                      onChange={(e) => setFormData({ ...formData, customUniversity: e.target.value })}
                      className="w-full px-3 py-2 bg-card border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary mt-2"
                    />
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-foreground mb-1">Mode de paiement</label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-xl text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {PAYMENT_METHODS.map((pm) => (
                      <option key={pm.id} value={pm.id}>
                        {pm.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-foreground mb-1">Statut du paiement</label>
                  <select
                    value={formData.paymentStatus}
                    onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-xl text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="PAID">✅ Payé / Validé</option>
                    <option value="PENDING">⏳ En attente</option>
                    <option value="EXEMPTED">🎓 Exempté (Convention)</option>
                    <option value="FAILED">❌ Échoué</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-foreground mb-1">Montant ($ USD)</label>
                  <input
                    type="number"
                    value={formData.paymentAmount}
                    onChange={(e) => setFormData({ ...formData, paymentAmount: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-xl text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            {/* 3. Statut du compte & Reconnaissance faciale */}
            <div className="border-t border-border pt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-primary" /> Reconnaissance Faciale & État du Compte
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block font-semibold text-foreground mb-1">Rôle de l'utilisateur</label>
                  <select
                    value={formData.role}
                    disabled={isSuperAdmin}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-xl text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
                  >
                    <option value="STUDENT">Étudiant</option>
                    <option value="INSTRUCTOR">Formateur</option>
                    <option value="ADMIN">Administrateur</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-foreground mb-1">Statut du compte</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-xl text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="ACTIVE">Actif (Accès autorisé)</option>
                    <option value="SUSPENDED">Suspendu (Accès bloqué)</option>
                    <option value="PENDING">En attente de validation</option>
                  </select>
                </div>
              </div>

              {/* Photo & Reconnaissance faciale */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-background border border-border flex items-center justify-center shrink-0">
                    {formData.photoUrl ? (
                      <img src={formData.photoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <span className="font-semibold text-foreground block">Photo faciale</span>
                    <select
                      value={formData.facialVerificationStatus}
                      onChange={(e) => setFormData({ ...formData, facialVerificationStatus: e.target.value })}
                      className="mt-1 px-2 py-1 bg-background border border-border rounded-lg text-[11px] text-foreground focus:outline-none"
                    >
                      <option value="VERIFIED">🟢 Vérifiée</option>
                      <option value="PENDING">🟡 En attente</option>
                      <option value="REJECTED">🔴 Rejetée</option>
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPhotoModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition flex items-center gap-1.5"
                >
                  <Camera className="w-3.5 h-3.5" /> Reprendre / Téléverser
                </button>
              </div>
            </div>

            {/* 4. Changer le mot de passe (optionnel) */}
            <div className="border-t border-border pt-4">
              <label className="block font-semibold text-foreground mb-1 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                Définir un nouveau mot de passe (laisser vide pour ne pas changer)
              </label>
              <input
                type="password"
                placeholder="6 caractères minimum..."
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                className="w-full px-3 py-2 bg-muted border border-border rounded-xl text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground transition shadow-md flex items-center gap-1.5 disabled:opacity-50"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Enregistrer les modifications
              </button>
            </div>
          </form>
        </motion.div>
      </div>

      {/* Modal webcam pour retouche photo */}
      <FacialCaptureModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        initialPhoto={formData.photoUrl}
        dossierNumber={formData.dossierNumber}
        userName={`${formData.firstName} ${formData.lastName}`.trim()}
        onCapture={(photoBase64) => {
          setFormData((prev) => ({
            ...prev,
            photoUrl: photoBase64,
            facialVerificationStatus: 'VERIFIED',
          }));
          toast.success('Nouvelle photo capturée et associée au dossier !');
        }}
      />
    </>
  );
}
