'use client';

import React, { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, ArrowRight, BookOpen, Camera, Check, CheckCircle2,
  Shield, ShieldCheck, AlertTriangle, X, Loader2, RefreshCw,
  User, GraduationCap, CreditCard, Lock, Sparkles, FolderCheck,
  Building2, Phone, Calendar, Globe, ZoomIn
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import FacialCaptureModal from '@/components/facial-capture-modal';
import GoogleAuthModal from '@/components/google-auth-modal';
import {
  AFRICAN_COUNTRIES, CountryOption, generateDossierNumber,
  PAYMENT_METHODS, PARTNER_UNIVERSITIES
} from '@/config/african-countries';

export default function SignupPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [causes, setCauses] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Configuration Pays & Dossier
  const defaultCountry = AFRICAN_COUNTRIES[0]; // RDC par défaut (+243)
  const [selectedCountry, setSelectedCountry] = useState<CountryOption>(defaultCountry);

  // État du formulaire d'admission
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    birthDate: '',
    countryCode: defaultCountry.code,
    dialCode: defaultCountry.dialCode,
    phone: '',
    dossierNumber: generateDossierNumber(defaultCountry.prefixDossier),
    photoUrl: '',
    studentType: 'LIBRE' as 'LIBRE' | 'UNIVERSITAIRE',
    university: PARTNER_UNIVERSITIES[0],
    customUniversity: '',
    studentMatricule: '',
    partnerCode: '',
    paymentMethod: 'MPESA',
    mobileMoneyPhone: '',
    paymentAmount: 500,
    academicHonorCodeAccepted: false,
  });

  // Modales
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [providersStatus, setProvidersStatus] = useState<{ hasGoogleOAuth: boolean; hasGithubOAuth: boolean }>({
    hasGoogleOAuth: false,
    hasGithubOAuth: false,
  });

  // Établissements partenaires gérés dans /admin/partners (repli : liste statique)
  const [partnerOptions, setPartnerOptions] = useState<string[]>(PARTNER_UNIVERSITIES);
  useEffect(() => {
    fetch('/api/partners')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const names: string[] = (d?.institutions ?? []).map((i: any) => i.name);
        if (names.length > 0) {
          setPartnerOptions([...names, 'Autre université (saisie libre)']);
          setFormData((prev: any) => ({ ...prev, university: names[0] }));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/auth/providers-status')
      .then((res) => res.json())
      .then((data) => setProvidersStatus(data))
      .catch(() => {});
  }, []);

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (causes.length > 0) {
      setCauses([]);
    }
  };

  const handleCountryChange = (countryCode: string) => {
    const country = AFRICAN_COUNTRIES.find((c) => c.code === countryCode) || defaultCountry;
    setSelectedCountry(country);
    setFormData((prev) => ({
      ...prev,
      countryCode: country.code,
      dialCode: country.dialCode,
      dossierNumber: generateDossierNumber(country.prefixDossier),
    }));
  };

  const handleRegenerateDossier = () => {
    setFormData((prev) => ({
      ...prev,
      dossierNumber: generateDossierNumber(selectedCountry.prefixDossier),
    }));
  };

  // Validation par étape
  const validateStep = (step: number): boolean => {
    const stepCauses: string[] = [];
    const localFieldErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.firstName.trim()) {
        stepCauses.push("Prénom manquant : Veuillez saisir votre prénom.");
        localFieldErrors.firstName = "Le prénom est obligatoire.";
      }
      if (!formData.lastName.trim()) {
        stepCauses.push("Nom manquant : Veuillez saisir votre nom de famille.");
        localFieldErrors.lastName = "Le nom de famille est obligatoire.";
      }
      if (!formData.phone.trim()) {
        stepCauses.push("Téléphone manquant : Le numéro de téléphone avec indicatif est requis.");
        localFieldErrors.phone = "Le téléphone est obligatoire.";
      }
      if (!formData.birthDate) {
        stepCauses.push("Date de naissance manquante : Veuillez indiquer votre date de naissance.");
        localFieldErrors.birthDate = "La date de naissance est obligatoire.";
      }
    }

    if (step === 2) {
      if (!formData.photoUrl) {
        stepCauses.push("Reconnaissance faciale requise : Veuillez capturer votre photo biométrique pour certifier l'absence de plagiat.");
        localFieldErrors.photoUrl = "Capture faciale obligatoire.";
      }
      if (!formData.academicHonorCodeAccepted) {
        stepCauses.push("Charte anti-plagiat non acceptée : Vous devez souscrire à la charte d'intégrité académique pour continuer.");
        localFieldErrors.academicHonorCodeAccepted = "Signature de la charte requise.";
      }
    }

    if (step === 3) {
      if (formData.studentType === 'UNIVERSITAIRE') {
        const univ = formData.university === 'Autre université (saisie libre)'
          ? formData.customUniversity.trim()
          : formData.university;
        if (!univ) {
          stepCauses.push("Université requise : Veuillez spécifier le nom de votre établissement partenaire.");
          localFieldErrors.university = "Université obligatoire.";
        }
      }
    }

    if (step === 4) {
      const email = formData.email.trim().toLowerCase();
      if (!email) {
        stepCauses.push("Email manquant : L'adresse email est requise.");
        localFieldErrors.email = "L'adresse email est obligatoire.";
      } else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        stepCauses.push("Format d'email invalide : Veuillez saisir une adresse valide.");
        localFieldErrors.email = "Format d'email invalide.";
      }

      if ((formData.password?.length ?? 0) < 10) {
        stepCauses.push("Mot de passe trop court : Au moins 10 caractères requis.");
        localFieldErrors.password = "Au moins 10 caractères.";
      }

      if (formData.password !== formData.confirmPassword) {
        stepCauses.push("Confirmation incorrecte : Les mots de passe ne correspondent pas.");
        localFieldErrors.confirmPassword = "Mots de passe non identiques.";
      }
    }

    if (stepCauses.length > 0) {
      setCauses(stepCauses);
      setFieldErrors(localFieldErrors);
      return false;
    }

    setCauses([]);
    setFieldErrors({});
    return true;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 4) as 1 | 2 | 3 | 4);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1) as 1 | 2 | 3 | 4);
    setCauses([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Soumission finale de l'admission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(4)) return;

    setLoading(true);
    setError('');
    setCauses([]);

    const resolvedUniversity = formData.studentType === 'UNIVERSITAIRE'
      ? (formData.university === 'Autre université (saisie libre)' ? formData.customUniversity.trim() : formData.university)
      : null;

    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          name: `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          birthDate: formData.birthDate || null,
          countryCode: formData.countryCode,
          dialCode: formData.dialCode,
          phone: `${formData.dialCode} ${formData.phone.trim()}`,
          dossierNumber: formData.dossierNumber,
          photoUrl: formData.photoUrl || null,
          partnerCode: formData.studentType === 'UNIVERSITAIRE' ? formData.partnerCode.trim() : undefined,
          studentType: formData.studentType,
          university: resolvedUniversity,
          paymentMethod: formData.studentType === 'UNIVERSITAIRE' ? 'EXEMPT_UNIVERSITY' : formData.paymentMethod,
          paymentAmount: formData.studentType === 'UNIVERSITAIRE' ? 0 : 500,
          academicHonorCodeAccepted: formData.academicHonorCodeAccepted,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        const serverCauses = Array.isArray(data?.causes) && data.causes.length > 0
          ? data.causes
          : [data?.error || "Erreur lors de la création du dossier d'admission."];
        setCauses(serverCauses);
        if (data?.field) {
          setFieldErrors({ [data.field]: serverCauses[0] });
        }
        return;
      }

      // Connexion automatique après enregistrement
      const signInRes = await signIn('credentials', {
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        redirect: false,
      });

      if (signInRes?.error) {
        router.replace('/auth/login?registered=true');
      } else {
        router.replace('/dashboard');
      }
    } catch {
      setCauses(["Une erreur réseau imprévue est survenue. Veuillez vérifier votre connexion."]);
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

  // Calcul indicateur force mot de passe
  const getPasswordStrength = (pass: string) => {
    if (!pass) return 0;
    let score = 0;
    if (pass.length >= 6) score += 25;
    if (pass.length >= 10) score += 25;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 25;
    if (/[0-9]/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score += 25;
    return score;
  };
  const passwordScore = getPasswordStrength(formData.password);

  const stepsInfo = [
    { num: 1, title: 'Identité', subtitle: 'Dossier académique', icon: User },
    { num: 2, title: 'Biométrie', subtitle: 'Sécurité anti-plagiat', icon: ShieldCheck },
    { num: 3, title: 'Scolarité', subtitle: 'Financement & Statut', icon: GraduationCap },
    { num: 4, title: 'Accès', subtitle: 'Identifiants & Validation', icon: Lock },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* En-tête officiel */}
      <header className="border-b border-border/80 bg-card/60 backdrop-blur-md py-4 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2.5 text-foreground hover:opacity-90 transition">
            <div className="w-10 h-10 bg-primary/10 border border-primary/20 text-primary rounded-xl flex items-center justify-center shadow-inner">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-extrabold tracking-tight">CS50X <span className="text-primary">Francophone</span></span>
              <p className="text-[10px] text-muted-foreground font-semibold">Portail d'Admission Savoiria</p>
            </div>
          </Link>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
            <GraduationCap className="w-3.5 h-3.5" />
            Accompagnement vers le certificat CS50x
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 sm:py-12">
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground transition">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Retour à l'accueil
          </Link>
        </div>

        {/* Stepper Progress Bar */}
        <div className="bg-card border border-border/80 rounded-3xl p-5 sm:p-6 mb-8 shadow-sm">
          <div className="grid grid-cols-4 gap-2 sm:gap-4 relative">
            {stepsInfo.map((s) => {
              const Icon = s.icon;
              const isDone = currentStep > s.num;
              const isCurrent = currentStep === s.num;
              return (
                <div key={s.num} className="flex flex-col items-center text-center relative z-10">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs transition-all duration-300 shadow-sm ${
                    isDone
                      ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                      : isCurrent
                      ? 'bg-primary text-primary-foreground shadow-primary/25 scale-105 ring-4 ring-primary/15'
                      : 'bg-muted text-muted-foreground border border-border/70'
                  }`}>
                    {isDone ? <Check className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className={`text-xs font-bold mt-2 truncate w-full ${isCurrent ? 'text-primary' : isDone ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {s.title}
                  </span>
                  <span className="text-[10px] text-muted-foreground hidden sm:block truncate w-full mt-0.5">
                    {s.subtitle}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-5 w-full bg-muted/70 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-500 ease-out"
              style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Bannière d'alerte des causes de rejet */}
        {causes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-5 rounded-2xl bg-rose-500/10 border-2 border-rose-500/30 text-rose-300 space-y-2.5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs text-rose-400">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>Admission suspendue : {causes.length} anomalie{causes.length > 1 ? 's' : ''} à corriger</span>
              </div>
              <button
                type="button"
                onClick={() => setCauses([])}
                className="p-1 text-rose-400 hover:bg-rose-500/20 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <ul className="space-y-1.5 pt-1 text-xs text-rose-200">
              {causes.map((c, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="font-bold text-rose-400">•</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}

        {/* Formulaire Multi-Étapes */}
        <form onSubmit={handleSubmit} className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <AnimatePresence mode="wait">
            {/* ========================================================
                ÉTAPE 1 : IDENTITÉ & DOSSIER ACADÉMIQUE
                ======================================================== */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div className="border-b border-border/70 pb-4">
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wider">
                    Étape 1 sur 4
                  </span>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-foreground mt-2 tracking-tight">
                    Identité & Dossier de Candidature
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Renseignez vos coordonnées certifiées pour l'enregistrement officiel de votre dossier d'admission.
                  </p>
                </div>

                {/* Numéro de dossier académique officiel auto-généré */}
                <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <FolderCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">Numéro de dossier académique</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          Attribué
                        </span>
                      </div>
                      <p className="text-sm font-mono font-black text-primary tracking-wider mt-0.5">
                        {formData.dossierNumber}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRegenerateDossier}
                    className="self-start sm:self-auto px-3 py-1.5 text-xs font-semibold rounded-xl bg-background border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition flex items-center gap-1.5"
                    title="Générer un autre numéro de dossier conforme au pays"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Régénérer
                  </button>
                </div>

                {/* Prénom & Nom */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">
                      Prénom <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => updateField('firstName', e.target.value)}
                      placeholder="Ex: David"
                      className={`w-full px-4 py-3 rounded-xl bg-background border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
                        fieldErrors.firstName ? 'border-rose-500 bg-rose-500/5 ring-1 ring-rose-500' : 'border-border'
                      }`}
                    />
                    {fieldErrors.firstName && <p className="text-[11px] text-rose-500 font-semibold">{fieldErrors.firstName}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">
                      Nom de famille <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => updateField('lastName', e.target.value)}
                      placeholder="Ex: Malan"
                      className={`w-full px-4 py-3 rounded-xl bg-background border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
                        fieldErrors.lastName ? 'border-rose-500 bg-rose-500/5 ring-1 ring-rose-500' : 'border-border'
                      }`}
                    />
                    {fieldErrors.lastName && <p className="text-[11px] text-rose-500 font-semibold">{fieldErrors.lastName}</p>}
                  </div>
                </div>

                {/* Date de naissance */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    Date de naissance <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => updateField('birthDate', e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className={`w-full px-4 py-3 rounded-xl bg-background border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
                      fieldErrors.birthDate ? 'border-rose-500 bg-rose-500/5' : 'border-border'
                    }`}
                  />
                  {fieldErrors.birthDate && <p className="text-[11px] text-rose-500 font-semibold">{fieldErrors.birthDate}</p>}
                </div>

                {/* Pays de résidence & Indicatif */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-primary" />
                    Pays de résidence & Indicatif <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.countryCode}
                    onChange={(e) => handleCountryChange(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {AFRICAN_COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.name} ({c.dialCode})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Numéro de téléphone international */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-primary" />
                    Numéro de téléphone <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <span className="px-3.5 py-3 rounded-xl bg-muted border border-border text-sm font-mono font-bold text-foreground shrink-0 flex items-center gap-1.5">
                      {selectedCountry.flag} {selectedCountry.dialCode}
                    </span>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => updateField('phone', e.target.value)}
                      placeholder={selectedCountry.phonePlaceholder}
                      className={`flex-1 px-4 py-3 rounded-xl bg-background border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
                        fieldErrors.phone ? 'border-rose-500 bg-rose-500/5 ring-1 ring-rose-500' : 'border-border'
                      }`}
                    />
                  </div>
                  {fieldErrors.phone && <p className="text-[11px] text-rose-500 font-semibold">{fieldErrors.phone}</p>}
                </div>
              </motion.div>
            )}

            {/* ========================================================
                ÉTAPE 2 : BIOMÉTRIE & CHARTE ANTI-PLAGIAT
                ======================================================== */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div className="border-b border-border/70 pb-4">
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wider">
                    Étape 2 sur 4
                  </span>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-foreground mt-2 tracking-tight">
                    Reconnaissance Faciale & Mesures Anti-Plagiat
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Dispositif officiel d'authentification biométrique garantissant l'intégrité académique et l'originalité des soumissions.
                  </p>
                </div>

                {/* Explication Institutionnelle */}
                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 flex gap-3 items-start">
                  <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-foreground/90 leading-relaxed">
                    <strong className="text-primary font-bold">Sécurité d'identité certifiée :</strong> Votre cliché photographique servira d'empreinte d'identité officielle pour vérifier que les devoirs et examens sont soumis par vous-même, éliminant tout risque de plagiat ou de substitution d'identité.
                  </p>
                </div>

                {/* Zone de Capture Photo Biométrique */}
                <div className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-border/80 bg-muted/20">
                  {formData.photoUrl ? (
                    <div className="flex flex-col items-center gap-4">
                      <div className="relative w-48 h-48 rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-xl bg-black">
                        <img
                          src={formData.photoUrl}
                          alt="Photo biométrique"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 right-2 bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow">
                          <Check className="w-3 h-3" /> Biométrie HD
                        </div>
                        <div className="absolute bottom-2 left-2 right-2 bg-black/75 backdrop-blur-md text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded text-center truncate">
                          {formData.dossierNumber}
                        </div>
                      </div>

                      <div className="text-center space-y-1">
                        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> Photo d'identité biométrique enregistrée
                        </p>
                        <button
                          type="button"
                          onClick={() => setIsPhotoModalOpen(true)}
                          className="px-4 py-2 rounded-xl text-xs font-bold bg-background border border-border hover:bg-muted text-foreground transition inline-flex items-center gap-1.5 shadow-sm"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Reprendre la photo
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center space-y-4 max-w-sm">
                      <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-inner">
                        <Camera className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-foreground">Enregistrez votre photo faciale</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          Capture directe par webcam (cadrage ovale 1:1, compte à rebours 3s, anti-flou) ou téléphone.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsPhotoModalOpen(true)}
                        className="px-6 py-3 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs transition shadow-lg shadow-primary/25 inline-flex items-center gap-2"
                      >
                        <Camera className="w-4 h-4" /> Déclencher la Reconnaissance Faciale
                      </button>
                      {fieldErrors.photoUrl && (
                        <p className="text-xs text-rose-500 font-bold">{fieldErrors.photoUrl}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Charte d'Intégrité Académique & Engagement Anti-Plagiat */}
                <div className="p-5 rounded-2xl border border-border/80 bg-card space-y-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Charte d'intégrité académique (inspirée de la politique d'honnêteté académique de CS50)
                    </h3>
                  </div>

                  <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 text-xs text-muted-foreground space-y-2 leading-relaxed">
                    <p>
                      <strong className="text-foreground">1. Travaux Originaux :</strong> Tout code soumis sur CS50x doit être rédigé personnellement par l'étudiant.
                    </p>
                    <p>
                      <strong className="text-foreground">2. Règle Anti-Plagiat :</strong> L'emprunt ou la copie de code tiers disponible en ligne ou produit par autrui est formellement interdit et sanctionné par l'exclusion.
                    </p>
                    <p>
                      <strong className="text-foreground">3. Utilisation Responsable de l'IA :</strong> Le tuteur Socrate IA est votre mentor socratique : il guide votre raisonnement sans générer de solutions prêtes à l'emploi.
                    </p>
                  </div>

                  <label className="flex items-start gap-3 p-3 rounded-xl border border-border hover:bg-muted/40 transition cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.academicHonorCodeAccepted}
                      onChange={(e) => updateField('academicHonorCodeAccepted', e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-primary focus:ring-primary border-border"
                    />
                    <span className="text-xs text-foreground font-semibold leading-snug">
                      Je souscris solennellement à la Charte d'Intégrité Académique et m'engage à respecter les normes strictes de non-plagiat pour l'obtention de mon certificat.
                    </span>
                  </label>
                  {fieldErrors.academicHonorCodeAccepted && (
                    <p className="text-xs text-rose-500 font-bold">{fieldErrors.academicHonorCodeAccepted}</p>
                  )}
                </div>
              </motion.div>
            )}

            {/* ========================================================
                ÉTAPE 3 : SCOLARITÉ & MODES DE PAIEMENT
                ======================================================== */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div className="border-b border-border/70 pb-4">
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wider">
                    Étape 3 sur 4
                  </span>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-foreground mt-2 tracking-tight">
                    Statut Académique & Financement
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Choisissez votre modalité de scolarité : admission autonome ou bourse conventionnée universitaire.
                  </p>
                </div>

                {/* Sélecteur de typologie d'étudiant */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Option 1 : Candidat Libre (500 USD) */}
                  <div
                    onClick={() => updateField('studentType', 'LIBRE')}
                    className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      formData.studentType === 'LIBRE'
                        ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                        : 'border-border/80 hover:border-primary/40 bg-card'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                          Autonome
                        </span>
                        <span className="text-lg font-black text-foreground">500 USD</span>
                      </div>
                      <h3 className="font-bold text-sm text-foreground">Candidat Libre</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Accès permanent aux 11 modules CS50, tuteur Socrate IA illimité, correction de devoirs et accompagnement jusqu'au certificat CS50x (délivré gratuitement par CS50).
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs font-semibold text-primary">
                      <span>Règlement direct</span>
                      <span className="w-5 h-5 rounded-full border border-primary flex items-center justify-center">
                        {formData.studentType === 'LIBRE' && <span className="w-2.5 h-2.5 rounded-full bg-primary" />}
                      </span>
                    </div>
                  </div>

                  {/* Option 2 : Étudiant Universitaire Partenaire (0 USD) */}
                  <div
                    onClick={() => updateField('studentType', 'UNIVERSITAIRE')}
                    className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      formData.studentType === 'UNIVERSITAIRE'
                        ? 'border-emerald-500 bg-emerald-500/5 shadow-md shadow-emerald-500/10'
                        : 'border-border/80 hover:border-emerald-500/40 bg-card'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          Bourse Universitaire
                        </span>
                        <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">0 USD</span>
                      </div>
                      <h3 className="font-bold text-sm text-foreground">Étudiant Conventionné</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Prise en charge intégrale à 100 % dans le cadre des accords de partenariat avec les universités africaines.
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      <span>Convention Partenaire</span>
                      <span className="w-5 h-5 rounded-full border border-emerald-500 flex items-center justify-center">
                        {formData.studentType === 'UNIVERSITAIRE' && <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Détails pour Étudiant Universitaire */}
                {formData.studentType === 'UNIVERSITAIRE' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-4"
                  >
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        Université Partenaire Conventionnée <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={formData.university}
                        onChange={(e) => updateField('university', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        {partnerOptions.map((u) => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </div>

                    {formData.university === 'Autre université (saisie libre)' && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-foreground">
                          Nom de votre université / institut <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.customUniversity}
                          onChange={(e) => updateField('customUniversity', e.target.value)}
                          placeholder="Ex: Université de Kisangani (UNIKIS)"
                          className="w-full px-4 py-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground">
                        Code de convention fourni par votre université <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.partnerCode}
                        onChange={(e) => updateField('partnerCode', e.target.value)}
                        placeholder="Ex : UOM-CS50X-S1-2027-7Q4K9X"
                        autoComplete="off"
                        className="w-full px-4 py-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground">
                        Matricule ou Faculté étudiante (optionnel)
                      </label>
                      <input
                        type="text"
                        value={formData.studentMatricule}
                        onChange={(e) => updateField('studentMatricule', e.target.value)}
                        placeholder="Ex: FSI-2026-089"
                        className="w-full px-4 py-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </motion.div>
                )}

                {/* Détails pour Candidat Libre (Modes de Paiement) */}
                {formData.studentType === 'LIBRE' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 rounded-2xl bg-card border border-border/80 space-y-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-primary" /> Mode de règlement des frais (500 USD)
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        Paiement sécurisé
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {PAYMENT_METHODS.filter((p) => p.category !== 'EXEMPT').map((pm) => {
                        const isSelected = formData.paymentMethod === pm.id;
                        return (
                          <button
                            key={pm.id}
                            type="button"
                            onClick={() => updateField('paymentMethod', pm.id)}
                            className={`p-3 rounded-xl border text-left transition-all ${
                              isSelected
                                ? 'border-primary bg-primary/10 shadow-sm font-bold'
                                : 'border-border/80 hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            <p className="text-xs font-bold text-foreground leading-snug">{pm.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate mt-0.5">{pm.description}</p>
                          </button>
                        );
                      })}
                    </div>

                    {['MPESA', 'ORANGE_MONEY', 'AIRTEL_MONEY', 'MTN_MOMO', 'WAVE', 'AFRIMONEY'].includes(formData.paymentMethod) && (
                      <div className="space-y-1.5 pt-2">
                        <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-primary" />
                          Numéro de compte Mobile Money pour la facturation
                        </label>
                        <input
                          type="tel"
                          value={formData.mobileMoneyPhone}
                          onChange={(e) => updateField('mobileMoneyPhone', e.target.value)}
                          placeholder="Ex: 0812345678"
                          className="w-full px-4 py-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    )}
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* ========================================================
                ÉTAPE 4 : SÉCURITÉ DU COMPTE & VALIDATION FINALE
                ======================================================== */}
            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div className="border-b border-border/70 pb-4">
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wider">
                    Étape 4 sur 4
                  </span>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-foreground mt-2 tracking-tight">
                    Identifiants & Validation du Dossier
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Définissez vos accès sécurisés et confirmez votre dossier d'admission.
                  </p>
                </div>

                {/* Synthèse du Dossier Étudiant */}
                <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {formData.photoUrl ? (
                      <img
                        src={formData.photoUrl}
                        alt="Photo d'identité"
                        className="w-12 h-12 rounded-xl object-cover border border-emerald-500 shrink-0 shadow-sm"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <User className="w-6 h-6" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-extrabold text-foreground">
                        {formData.firstName} {formData.lastName}
                      </p>
                      <p className="text-xs font-mono font-bold text-primary">
                        Dossier : {formData.dossierNumber}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {formData.studentType === 'UNIVERSITAIRE'
                          ? `Partenariat : ${formData.university}`
                          : `Candidat Libre (${formData.paymentMethod})`}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                    Dossier Complet
                  </span>
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    Adresse email officielle <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    placeholder="etudiant@domaine.com"
                    className={`w-full px-4 py-3 rounded-xl bg-background border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
                      fieldErrors.email ? 'border-rose-500 bg-rose-500/5 ring-1 ring-rose-500' : 'border-border'
                    }`}
                  />
                  {fieldErrors.email && <p className="text-[11px] text-rose-500 font-semibold">{fieldErrors.email}</p>}
                </div>

                {/* Mot de passe & Indicateur de force */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-foreground">
                    Mot de passe <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    placeholder="Minimum 10 caractères"
                    className={`w-full px-4 py-3 rounded-xl bg-background border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
                      fieldErrors.password ? 'border-rose-500 bg-rose-500/5 ring-1 ring-rose-500' : 'border-border'
                    }`}
                  />
                  {fieldErrors.password && <p className="text-[11px] text-rose-500 font-semibold">{fieldErrors.password}</p>}

                  {formData.password && (
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
                        <span>Sécurité du mot de passe</span>
                        <span>{passwordScore <= 25 ? 'Faible' : passwordScore <= 50 ? 'Moyen' : passwordScore <= 75 ? 'Bon' : 'Excellent'}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            passwordScore <= 25
                              ? 'bg-rose-500 w-1/4'
                              : passwordScore <= 50
                              ? 'bg-amber-500 w-2/4'
                              : passwordScore <= 75
                              ? 'bg-blue-500 w-3/4'
                              : 'bg-emerald-500 w-full'
                          }`}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirmation Mot de passe */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    Confirmer le mot de passe <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => updateField('confirmPassword', e.target.value)}
                    placeholder="Répétez le mot de passe"
                    className={`w-full px-4 py-3 rounded-xl bg-background border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
                      formData.confirmPassword && formData.password !== formData.confirmPassword
                        ? 'border-rose-500 bg-rose-500/5'
                        : formData.confirmPassword && formData.password === formData.confirmPassword
                        ? 'border-emerald-500 bg-emerald-500/5'
                        : 'border-border'
                    }`}
                  />
                  {formData.confirmPassword && (
                    <p className={`text-[11px] font-semibold flex items-center gap-1 ${
                      formData.password === formData.confirmPassword ? 'text-emerald-500' : 'text-rose-500'
                    }`}>
                      {formData.password === formData.confirmPassword
                        ? '✓ Mots de passe identiques'
                        : '✗ Les mots de passe ne correspondent pas'}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Boutons de navigation et de soumission */}
          <div className="pt-4 border-t border-border/70 flex items-center justify-between gap-3">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handlePrevStep}
                className="px-5 py-3 rounded-2xl bg-muted hover:bg-muted/80 text-foreground font-bold text-xs transition shadow-sm border border-border/80 flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Précédent
              </button>
            ) : (
              <div />
            )}

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="px-6 py-3 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs transition-all shadow-md shadow-primary/25 flex items-center gap-2"
              >
                Continuer <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="px-7 py-3.5 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm transition-all shadow-xl shadow-primary/25 disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {loading ? "Création du dossier d'admission..." : "Confirmer l'Admission & Accéder aux Cours"}
              </button>
            )}
          </div>
        </form>

        {/* Connexion alternative & Lien compte existant */}
        <div className="mt-8 text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleGoogleClick}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-card hover:bg-muted text-foreground text-xs font-semibold border border-border transition shadow-sm"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Liaison Google SSO
            </button>
          </div>

          <p className="text-xs text-muted-foreground">
            Vous disposez déjà d'un compte ou d'un dossier étudiant ?{' '}
            <Link href="/auth/login" className="text-primary font-bold hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </main>

      {/* Modale Webcam & Reconnaissance Faciale */}
      <FacialCaptureModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        onCapture={(photo) => {
          updateField('photoUrl', photo);
          setIsPhotoModalOpen(false);
        }}
        initialPhoto={formData.photoUrl}
        dossierNumber={formData.dossierNumber}
        userName={`${formData.firstName} ${formData.lastName}`.trim()}
      />

      {/* Modale Google Auth */}
      <GoogleAuthModal
        isOpen={isGoogleModalOpen}
        onClose={() => setIsGoogleModalOpen(false)}
        defaultEmail={formData.email || 'gmuntusip@gmail.com'}
      />
    </div>
  );
}
