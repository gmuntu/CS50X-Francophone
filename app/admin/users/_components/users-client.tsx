'use client';

import React, { useState, useMemo } from 'react';
import Header from '@/components/header';
import Footer from '@/components/footer';
import {
  Users, ArrowLeft, Shield, Ban, CheckCircle, UserPlus, Loader2,
  Camera, Check, X, Search, Filter, KeyRound, Building2, CreditCard,
  Phone, Calendar, FileText, AlertCircle, RefreshCw, Eye, Sparkles,
  GraduationCap, Smartphone, Pencil, Trash2, AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import FacialCaptureModal from '@/components/facial-capture-modal';
import EditUserModal from './edit-user-modal';
import DeleteUserModal from './delete-user-modal';
import {
  AFRICAN_COUNTRIES,
  PAYMENT_METHODS,
  PARTNER_UNIVERSITIES,
  generateDossierNumber,
  CountryOption
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

interface Props {
  users: UserItem[];
}

export default function UsersClient({ users: initialUsers }: Props) {
  const [users, setUsers] = useState<UserItem[]>(initialUsers ?? []);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);

  // Recherche & Filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'LIBRE' | 'UNIVERSITAIRE'>('ALL');
  const [filterFacial, setFilterFacial] = useState<'ALL' | 'PENDING' | 'VERIFIED' | 'REJECTED'>('ALL');
  const [filterRole, setFilterRole] = useState<'ALL' | 'STUDENT' | 'INSTRUCTOR' | 'ADMIN'>('ALL');

  // Modal Webcam / Photo
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

  // Modal Réinitialisation mot de passe
  const [resetUser, setResetUser] = useState<UserItem | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Modal Modification Étudiant
  const [editUser, setEditUser] = useState<UserItem | null>(null);

  // Modal Suppression Étudiant
  const [deleteUser, setDeleteUser] = useState<UserItem | null>(null);

  // Modal Fiche Détail
  const [detailUser, setDetailUser] = useState<UserItem | null>(null);

  // Formulaire d'enregistrement
  const defaultCountry = AFRICAN_COUNTRIES[0]; // RDC par défaut
  const [selectedCountry, setSelectedCountry] = useState<CountryOption>(defaultCountry);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    passwordConfirm: '',
    phone: '',
    countryCode: defaultCountry.code,
    dialCode: defaultCountry.dialCode,
    dossierNumber: generateDossierNumber(defaultCountry.prefixDossier),
    birthDate: '',
    studentType: 'LIBRE' as 'LIBRE' | 'UNIVERSITAIRE' | 'PERSONNEL',
    role: 'STUDENT' as 'STUDENT' | 'INSTRUCTOR',
    university: '',
    customUniversity: '',
    paymentStatus: 'PENDING' as 'PAID' | 'PENDING' | 'EXEMPTED' | 'FAILED',
    paymentMethod: 'MPESA',
    paymentAmount: 500,
    photoUrl: '' as string,
    facialVerificationStatus: 'PENDING' as 'PENDING' | 'VERIFIED' | 'REJECTED',
  });

  // Mise à jour du pays et auto-génération du numéro de dossier
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

  // États pour le diagnostic détaillé des causes de rejet d'enregistrement
  const [submissionErrors, setSubmissionErrors] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Mise à jour d'un champ avec effacement de l'erreur correspondante
  const updateFormField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Soumission du formulaire avec analyse détaillée des causes de rejet
  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creating) return;

    setSubmissionErrors([]);
    setFieldErrors({});

    const clientCauses: string[] = [];
    const localFieldErrors: Record<string, string> = {};

    // 1. Validation Nom et Prénom
    if (!formData.firstName.trim()) {
      clientCauses.push("Prénom manquant : Veuillez renseigner le prénom de l'étudiant.");
      localFieldErrors.firstName = "Le prénom est obligatoire.";
    }

    if (!formData.lastName.trim()) {
      clientCauses.push("Nom manquant : Veuillez renseigner le nom de famille.");
      localFieldErrors.lastName = "Le nom de famille est obligatoire.";
    }

    // 2. Validation Email
    const emailTrimmed = formData.email.trim();
    if (!emailTrimmed) {
      clientCauses.push("Email manquant : L'adresse email est requise pour créer le compte.");
      localFieldErrors.email = "L'adresse email est obligatoire.";
    } else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailTrimmed)) {
      clientCauses.push(`Format d'email invalide ("${emailTrimmed}") : Veuillez entrer une adresse valide (ex: etudiant@gmail.com).`);
      localFieldErrors.email = "Format d'adresse email invalide.";
    }

    // 3. Validation Mot de passe & Contre-vérification
    if (formData.password.length < 6) {
      clientCauses.push("Mot de passe trop court : Le mot de passe doit comporter au moins 6 caractères pour sécuriser le compte.");
      localFieldErrors.password = "Minimum 6 caractères requis.";
    }

    if (formData.password !== formData.passwordConfirm) {
      clientCauses.push("Erreur de confirmation : Les deux mots de passe ne sont pas identiques (faute de frappe). Veuillez retaper le mot de passe identique dans les deux champs.");
      localFieldErrors.passwordConfirm = "Ne correspond pas au premier mot de passe.";
    }

    // 4. Numéro de téléphone
    if (!formData.phone || formData.phone.trim() === '') {
      clientCauses.push("Numéro de téléphone manquant : Le numéro de téléphone avec indicatif pays est obligatoire.");
      localFieldErrors.phone = "Le numéro de téléphone est obligatoire.";
    }

    const isInstructor = formData.role === 'INSTRUCTOR';

    // 5. Université partenaire pour étudiant universitaire
    if (!isInstructor && formData.studentType === 'UNIVERSITAIRE') {
      const uni = formData.university === 'Autre université (saisie libre)'
        ? formData.customUniversity.trim()
        : formData.university;
      if (!uni) {
        clientCauses.push("Université partenaire obligatoire : Pour un étudiant universitaire bénéficiant de l'exemption à 0 USD, vous devez obligatoirement sélectionner une université conventionnée ou indiquer son nom.");
        localFieldErrors.university = "Sélection de l'université partenaire requise.";
      }
    }

    // Si des erreurs locales existent, bloquer la soumission et afficher les causes
    if (clientCauses.length > 0) {
      setSubmissionErrors(clientCauses);
      setFieldErrors(localFieldErrors);
      toast.error(`Enregistrement rejeté : ${clientCauses.length} cause(s) identifiée(s).`);
      const modalForm = document.getElementById('student-registration-form');
      if (modalForm) modalForm.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setCreating(true);
    try {
      const finalUniversity = !isInstructor && formData.studentType === 'UNIVERSITAIRE'
        ? (formData.university === 'Autre université (saisie libre)' ? formData.customUniversity.trim() : formData.university)
        : null;

      const payload = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        name: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
        email: formData.email.trim(),
        password: formData.password,
        passwordConfirm: formData.passwordConfirm,
        role: formData.role,
        status: 'ACTIVE',
        phone: formData.phone ? `${formData.dialCode} ${formData.phone.trim()}` : null,
        countryCode: formData.countryCode,
        dialCode: formData.dialCode,
        dossierNumber: formData.dossierNumber,
        birthDate: formData.birthDate || null,
        photoUrl: formData.photoUrl || null,
        facialVerificationStatus: formData.facialVerificationStatus,
        studentType: isInstructor ? 'PERSONNEL' : formData.studentType,
        university: finalUniversity,
        paymentStatus: isInstructor || formData.studentType === 'UNIVERSITAIRE' ? 'EXEMPTED' : formData.paymentStatus,
        paymentMethod: isInstructor ? 'PERSONNEL' : (formData.studentType === 'UNIVERSITAIRE' ? 'EXEMPT_UNIVERSITY' : formData.paymentMethod),
        paymentAmount: isInstructor || formData.studentType === 'UNIVERSITAIRE' ? 0 : 500,
      };

      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data?.user) {
        setUsers((prev) => [data.user, ...prev]);
        toast.success(
          isInstructor
            ? `Formateur ${data.user.name} créé avec succès (privilèges limités) !`
            : `Étudiant ${data.user.name} enregistré avec succès !`
        );
        setShowModal(false);
        setSubmissionErrors([]);
        setFieldErrors({});
        // Réinitialiser
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          password: '',
          passwordConfirm: '',
          phone: '',
          countryCode: defaultCountry.code,
          dialCode: defaultCountry.dialCode,
          dossierNumber: generateDossierNumber(defaultCountry.prefixDossier),
          birthDate: '',
          studentType: 'LIBRE',
          role: 'STUDENT',
          university: '',
          customUniversity: '',
          paymentStatus: 'PENDING',
          paymentMethod: 'MPESA',
          paymentAmount: 500,
          photoUrl: '',
          facialVerificationStatus: 'PENDING',
        });
      } else {
        const serverCauses: string[] = Array.isArray(data?.causes) && data.causes.length > 0
          ? data.causes
          : [data?.error || "L'enregistrement a été rejeté par le serveur."];

        setSubmissionErrors(serverCauses);

        if (data?.field) {
          setFieldErrors((prev) => ({ ...prev, [data.field]: serverCauses[0] }));
        } else if (serverCauses.some((c) => c.toLowerCase().includes('email'))) {
          setFieldErrors((prev) => ({ ...prev, email: "Cette adresse email est déjà utilisée." }));
        } else if (serverCauses.some((c) => c.toLowerCase().includes('dossier'))) {
          setFieldErrors((prev) => ({ ...prev, dossierNumber: "Numéro de dossier déjà attribué." }));
        }

        toast.error(`Enregistrement rejeté : ${serverCauses.length} cause(s) à corriger.`);
        const modalForm = document.getElementById('student-registration-form');
        if (modalForm) modalForm.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch {
      const genericError = "Une erreur inattendue de connexion au serveur est survenue lors de l'enregistrement.";
      setSubmissionErrors([genericError]);
      toast.error(genericError);
    } finally {
      setCreating(false);
    }
  };

  // Mise à jour de la vérification faciale
  const handleToggleFacial = async (userId: string, newStatus: 'VERIFIED' | 'REJECTED' | 'PENDING') => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, facialVerificationStatus: newStatus }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, facialVerificationStatus: newStatus } : u))
        );
        toast.success(`Statut facial : ${newStatus}`);
      }
    } catch {
      toast.error('Erreur de mise à jour');
    }
  };

  // Réinitialisation du mot de passe
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUser || newPasswordInput.length < 6) {
      toast.error('Le mot de passe doit comporter au moins 6 caractères.');
      return;
    }
    setIsResetting(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: resetUser.id, newPassword: newPasswordInput }),
      });
      if (res.ok) {
        toast.success(`Mot de passe réinitialisé pour ${resetUser.name || resetUser.email} !`);
        setResetUser(null);
        setNewPasswordInput('');
      } else {
        const d = await res.json();
        toast.error(d?.error || 'Échec de réinitialisation');
      }
    } catch {
      toast.error('Erreur lors de la réinitialisation');
    } finally {
      setIsResetting(false);
    }
  };

  // Changement de statut utilisateur (Actif / Suspendu)
  const handleStatusChange = async (userId: string, newStatus: string) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, status: newStatus }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, status: newStatus } : u))
        );
        toast.success('Statut utilisateur mis à jour');
      }
    } catch {
      toast.error('Erreur');
    }
  };

  // Filtrage des utilisateurs
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        !searchTerm ||
        (u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (u.dossierNumber && u.dossierNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (u.phone && u.phone.includes(searchTerm));

      const matchesType =
        filterType === 'ALL' ||
        (filterType === 'LIBRE' && (u.studentType === 'LIBRE' || !u.studentType)) ||
        (filterType === 'UNIVERSITAIRE' && u.studentType === 'UNIVERSITAIRE');

      const matchesFacial =
        filterFacial === 'ALL' ||
        u.facialVerificationStatus === filterFacial;

      const matchesRole =
        filterRole === 'ALL' ||
        u.role === filterRole;

      return matchesSearch && matchesType && matchesFacial && matchesRole;
    });
  }, [users, searchTerm, filterType, filterFacial, filterRole]);

  // Statistiques
  const stats = useMemo(() => {
    const total = users.length;
    const libres = users.filter((u) => (u.studentType === 'LIBRE' || !u.studentType) && u.role === 'STUDENT').length;
    const universitaires = users.filter((u) => u.studentType === 'UNIVERSITAIRE' && u.role === 'STUDENT').length;
    const instructors = users.filter((u) => u.role === 'INSTRUCTOR').length;
    const facialPending = users.filter((u) => u.facialVerificationStatus === 'PENDING').length;
    return { total, libres, universitaires, instructors, facialPending };
  }, [users]);

  // Validation mot de passe en temps réel
  const isPasswordMatch = formData.password && formData.passwordConfirm && formData.password === formData.passwordConfirm;
  const isPasswordMismatch = formData.passwordConfirm && formData.password !== formData.passwordConfirm;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />

      <main className="max-w-7xl mx-auto w-full px-4 py-8 flex-1">
        {/* Navigation retour */}
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Retour au panneau d'administration
        </Link>

        {/* Titre & Bouton Nouveau */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              Gestion & Enregistrement des Étudiants
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Enregistrement certifié avec vérification faciale, numéro de dossier et gestion des paiements
            </p>
            <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-lg bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
              <Shield className="w-3.5 h-3.5 text-primary" />
              Super Administrateur : Ghislain Muntu (gmuntusip@gmail.com)
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setSubmissionErrors([]);
              setFieldErrors({});
              setShowModal(true);
            }}
            className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold px-5 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
          >
            <UserPlus className="w-4 h-4" /> Créer Étudiant ou Formateur
          </button>
        </div>

        {/* Cartes statistiques */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 mb-8">
          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Comptes</p>
            <p className="text-2xl font-black text-foreground mt-1">{stats.total}</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5" /> Libres (500$)
            </p>
            <p className="text-2xl font-black text-foreground mt-1">{stats.libres}</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" /> Universitaires (0$)
            </p>
            <p className="text-2xl font-black text-foreground mt-1">{stats.universitaires}</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5" /> Formateurs
            </p>
            <p className="text-2xl font-black text-indigo-600 mt-1">{stats.instructors}</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider flex items-center gap-1">
              <Camera className="w-3.5 h-3.5" /> Photos en attente
            </p>
            <p className="text-2xl font-black text-amber-600 mt-1">{stats.facialPending}</p>
          </div>
        </div>

        {/* Barre de Recherche et Filtres */}
        <div className="bg-card border border-border rounded-2xl p-4 mb-6 shadow-sm flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher par nom, email, n° dossier (ex: 243...), téléphone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Filtre Rôle */}
            <select
              value={filterRole}
              onChange={(e: any) => setFilterRole(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-background border border-border rounded-xl focus:outline-none"
            >
              <option value="ALL">Tous les rôles</option>
              <option value="STUDENT">🎓 Étudiants</option>
              <option value="INSTRUCTOR">👨‍🏫 Formateurs (Limités)</option>
              <option value="ADMIN">👑 Administrateurs</option>
            </select>

            {/* Filtre Type Étudiant */}
            <select
              value={filterType}
              onChange={(e: any) => setFilterType(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-background border border-border rounded-xl focus:outline-none"
            >
              <option value="ALL">Tous types étudiant</option>
              <option value="LIBRE">Libres (500$)</option>
              <option value="UNIVERSITAIRE">Universitaires (0$)</option>
            </select>

            {/* Filtre Facial */}
            <select
              value={filterFacial}
              onChange={(e: any) => setFilterFacial(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-background border border-border rounded-xl focus:outline-none"
            >
              <option value="ALL">Tous statuts photo</option>
              <option value="VERIFIED">Photo Vérifiée ✓</option>
              <option value="PENDING">Photo En attente ⏳</option>
              <option value="REJECTED">Photo Rejetée ✕</option>
            </select>
          </div>
        </div>

        {/* Liste / Tableau des Étudiants */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-bold tracking-wider border-b border-border">
                <tr>
                  <th className="py-3.5 px-4">Étudiant & Photo</th>
                  <th className="py-3.5 px-4">N° Dossier</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">Type & Convention</th>
                  <th className="py-3.5 px-4">Paiement</th>
                  <th className="py-3.5 px-4">Vérification Faciale</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">
                      Aucun étudiant ne correspond aux critères de recherche.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isUni = u.studentType === 'UNIVERSITAIRE';
                    const country = AFRICAN_COUNTRIES.find((c) => c.code === u.countryCode);

                    return (
                      <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                        {/* Étudiant & Photo */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="relative w-10 h-10 rounded-full overflow-hidden bg-muted flex items-center justify-center border border-border flex-shrink-0">
                              {u.photoUrl ? (
                                <img src={u.photoUrl} alt={u.name || ''} className="w-full h-full object-cover" />
                              ) : (
                                <span className="font-bold text-xs text-muted-foreground">
                                  {u.name?.slice(0, 2).toUpperCase() || 'ET'}
                                </span>
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-foreground text-sm leading-tight flex items-center gap-1.5">
                                {u.name || `${u.firstName || ''} ${u.lastName || ''}`}
                                {u.role === 'ADMIN' && (
                                  <span className="text-[10px] bg-purple-500/10 text-purple-600 px-1.5 py-0.2 rounded font-bold">
                                    ADMIN
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground">{u.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* N° Dossier */}
                        <td className="py-3 px-4">
                          {u.dossierNumber ? (
                            <span className="font-mono text-xs font-bold px-2 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20">
                              {country?.flag && `${country.flag} `}
                              {u.dossierNumber}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Non attribué</span>
                          )}
                        </td>

                        {/* Contact */}
                        <td className="py-3 px-4">
                          <p className="text-xs font-medium text-foreground">{u.phone || 'Non renseigné'}</p>
                          {u.birthDate && (
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3" />
                              {new Date(u.birthDate).toLocaleDateString('fr-FR')}
                            </p>
                          )}
                        </td>

                        {/* Type & Convention / Rôle */}
                        <td className="py-3 px-4">
                          {u.role === 'INSTRUCTOR' ? (
                            <div>
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 px-2.5 py-0.5 rounded-full">
                                <GraduationCap className="w-3.5 h-3.5" /> Formateur (Limité)
                              </span>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                Évaluation des devoirs & cours
                              </p>
                            </div>
                          ) : u.role === 'ADMIN' ? (
                            <div>
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-2.5 py-0.5 rounded-full">
                                <Shield className="w-3.5 h-3.5" /> Super Admin
                              </span>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                Pleins privilèges
                              </p>
                            </div>
                          ) : isUni ? (
                            <div>
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                                <Building2 className="w-3 h-3" /> Universitaire (0$)
                              </span>
                              <p className="text-[11px] text-muted-foreground truncate max-w-[180px] mt-0.5" title={u.university || ''}>
                                {u.university || 'Université conventionnée'}
                              </p>
                            </div>
                          ) : (
                            <div>
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-full">
                                <CreditCard className="w-3 h-3" /> Étudiant Libre (500$)
                              </span>
                              {u.paymentMethod && (
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  {PAYMENT_METHODS.find((m) => m.id === u.paymentMethod)?.name || u.paymentMethod}
                                </p>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Paiement */}
                        <td className="py-3 px-4">
                          {u.role === 'INSTRUCTOR' || u.role === 'ADMIN' ? (
                            <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-lg border border-border">
                              Personnel (0$)
                            </span>
                          ) : isUni ? (
                            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                              Exonéré (0 USD)
                            </span>
                          ) : u.paymentStatus === 'PAID' ? (
                            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                              Payé (500 USD)
                            </span>
                          ) : u.paymentStatus === 'PENDING' ? (
                            <span className="text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800">
                              En attente
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-lg border border-rose-200 dark:border-rose-800">
                              {u.paymentStatus || 'Non payé'}
                            </span>
                          )}
                        </td>

                        {/* Vérification Faciale */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            {u.facialVerificationStatus === 'VERIFIED' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                <Check className="w-3 h-3" /> Vérifié
                              </span>
                            ) : u.facialVerificationStatus === 'REJECTED' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                                <X className="w-3 h-3" /> Rejeté
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                                En attente
                              </span>
                            )}

                            {/* Boutons d'action rapide pour valider/rejeter la photo */}
                            {u.facialVerificationStatus !== 'VERIFIED' && (
                              <button
                                type="button"
                                title="Valider la reconnaissance faciale"
                                onClick={() => handleToggleFacial(u.id, 'VERIFIED')}
                                className="p-1 rounded-lg hover:bg-emerald-100 text-emerald-700 transition"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {u.facialVerificationStatus !== 'REJECTED' && (
                              <button
                                type="button"
                                title="Rejeter la photo"
                                onClick={() => handleToggleFacial(u.id, 'REJECTED')}
                                className="p-1 rounded-lg hover:bg-rose-100 text-rose-700 transition"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              title="Voir la fiche complète"
                              onClick={() => setDetailUser(u)}
                              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              title="Modifier l'étudiant (Nom, Email, Dossier, Paiement, Statut...)"
                              onClick={() => setEditUser(u)}
                              className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-muted-foreground hover:text-blue-600 transition"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              title="Réinitialiser le mot de passe"
                              onClick={() => { setResetUser(u); setNewPasswordInput(''); }}
                              className="p-1.5 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 text-muted-foreground hover:text-amber-600 transition"
                            >
                              <KeyRound className="w-4 h-4" />
                            </button>

                            {u.status === 'ACTIVE' ? (
                              <button
                                type="button"
                                title="Suspendre l'étudiant"
                                onClick={() => handleStatusChange(u.id, 'SUSPENDED')}
                                className="p-1.5 rounded-lg hover:bg-rose-100 text-muted-foreground hover:text-rose-600 transition"
                              >
                                <Ban className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                title="Réactiver le compte"
                                onClick={() => handleStatusChange(u.id, 'ACTIVE')}
                                className="p-1.5 rounded-lg hover:bg-emerald-100 text-muted-foreground hover:text-emerald-600 transition"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}

                            {!['gmuntusip@gmail.com', 'admin@cs50x-francophone.com'].includes(u.email || '') && (
                              <button
                                type="button"
                                title="Effacer définitivement l'étudiant"
                                onClick={() => setDeleteUser(u)}
                                className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-muted-foreground hover:text-red-600 transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <Footer />

      {/* ========================================================================= */}
      {/* MODAL ENREGISTREMENT ÉTUDIANT (CONFORME DIRECTIVES PDF)                  */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card border border-border rounded-3xl shadow-2xl max-w-2xl w-full my-8 overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Entête modal */}
              <div className="p-5 border-b border-border flex items-center justify-between bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold shadow-md ${
                    formData.role === 'INSTRUCTOR'
                      ? 'bg-amber-600 text-white'
                      : 'bg-primary text-primary-foreground'
                  }`}>
                    {formData.role === 'INSTRUCTOR' ? <Shield className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-foreground">
                      {formData.role === 'INSTRUCTOR' ? 'Nouvel Instructeur / Formateur' : 'Nouvel Enregistrement Étudiant'}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {formData.role === 'INSTRUCTOR'
                        ? 'Privilèges limités : correction des devoirs et consultation pédagogique'
                        : 'Fiche complète d\'admission CS50X Francophone'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Formulaire scrollable */}
              <form id="student-registration-form" onSubmit={handleCreateStudent} className="p-6 space-y-6 overflow-y-auto flex-1">
                {/* BANNIÈRE D'EXPLICATION DES CAUSES DE REJET */}
                {submissionErrors.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border-2 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 space-y-2.5 shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-sm text-rose-700 dark:text-rose-300">
                        <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                        <span>Enregistrement rejeté : {submissionErrors.length} anomalie{submissionErrors.length > 1 ? 's' : ''} à corriger</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSubmissionErrors([])}
                        className="p-1 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-lg transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-xs text-rose-800/90 dark:text-rose-300/90">
                      Le formulaire a été rejeté. Veuillez corriger les points indiqués ci-dessous pour valider l'enregistrement :
                    </p>

                    <div className="bg-white/80 dark:bg-black/40 rounded-xl p-3 border border-rose-200 dark:border-rose-900/50 space-y-2">
                      {submissionErrors.map((cause, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs">
                          <span className="w-5 h-5 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <span className="leading-relaxed font-semibold text-rose-900 dark:text-rose-200">
                            {cause}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="text-[11px] text-rose-700 dark:text-rose-300 font-medium flex items-center gap-1.5 pt-1">
                      💡 <span className="font-bold">Instructions :</span> Les champs erronés sont surlignés en rouge ci-dessous avec des indications précises.
                    </div>
                  </motion.div>
                )}

                {/* 0. CHOIX DU TYPE DE COMPTE (ÉTUDIANT vs FORMATEUR) */}
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    Type de compte à créer *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Option Étudiant */}
                    <div
                      onClick={() => setFormData((prev) => ({
                        ...prev,
                        role: 'STUDENT',
                        studentType: 'LIBRE',
                        paymentAmount: 500,
                        paymentStatus: 'PENDING',
                      }))}
                      className={`cursor-pointer border-2 rounded-2xl p-4 transition flex flex-col justify-between ${
                        formData.role === 'STUDENT'
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-border hover:border-border/80'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                          <GraduationCap className="w-4 h-4" /> Compte Étudiant
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          Standard
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Accès aux cours, rendu de travaux, passage des quiz et délivrance de certificat.
                      </p>
                    </div>

                    {/* Option Formateur */}
                    <div
                      onClick={() => setFormData((prev) => ({
                        ...prev,
                        role: 'INSTRUCTOR',
                        studentType: 'PERSONNEL',
                        paymentAmount: 0,
                        paymentStatus: 'EXEMPTED',
                      }))}
                      className={`cursor-pointer border-2 rounded-2xl p-4 transition flex flex-col justify-between ${
                        formData.role === 'INSTRUCTOR'
                          ? 'border-amber-500 bg-amber-500/5 shadow-sm'
                          : 'border-border hover:border-border/80'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                          <Shield className="w-4 h-4" /> Formateur / Instructeur
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300">
                          Privilèges limités
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Correction et notation des soumissions, consultation des cours. Aucun droit d'administration.
                      </p>
                    </div>
                  </div>
                </div>

                {/* BANNIÈRE FORMATEUR OU SECTION PAIEMENT ÉTUDIANT */}
                {formData.role === 'INSTRUCTOR' ? (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-1.5"
                  >
                    <div className="font-bold flex items-center gap-2 text-amber-800 dark:text-amber-300">
                      <Shield className="w-4 h-4 text-amber-600" />
                      Privilèges d'instructeur définis & restreints :
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-800/90 dark:text-amber-200/90">
                      <li><strong>Autorisé :</strong> Correction, évaluation et notation des soumissions étudiantes (<code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">/admin/submissions</code>).</li>
                      <li><strong>Autorisé :</strong> Consultation des cours, exercices et utilisation de l'assistant pédagogique Socrate.</li>
                      <li><strong>Strictement Interdit :</strong> Aucune gestion des utilisateurs, aucune suppression de comptes, aucun accès aux paramètres système ou financiers.</li>
                    </ul>
                  </motion.div>
                ) : (
                  <>
                    {/* 1. SÉLECTION DU TYPE D'ÉTUDIANT */}
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                        Type d'étudiant & Tarification
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Étudiant Libre */}
                        <div
                          onClick={() => setFormData((prev) => ({ ...prev, studentType: 'LIBRE', paymentAmount: 500, paymentStatus: 'PENDING' }))}
                          className={`cursor-pointer border-2 rounded-2xl p-4 transition flex flex-col justify-between ${
                            formData.studentType === 'LIBRE'
                              ? 'border-primary bg-primary/5 shadow-sm'
                              : 'border-border hover:border-border/80'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                              <CreditCard className="w-4 h-4" /> Étudiant Libre
                            </span>
                            <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-primary text-white">
                              500 USD
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Paiement individuel par Carte Bancaire, PayPal ou Mobile Money (M-Pesa, Orange, Airtel, Wave...).
                          </p>
                        </div>

                        {/* Étudiant Universitaire */}
                        <div
                          onClick={() => setFormData((prev) => ({ ...prev, studentType: 'UNIVERSITAIRE', paymentAmount: 0, paymentStatus: 'EXEMPTED' }))}
                          className={`cursor-pointer border-2 rounded-2xl p-4 transition flex flex-col justify-between ${
                            formData.studentType === 'UNIVERSITAIRE'
                              ? 'border-emerald-500 bg-emerald-500/5 shadow-sm'
                              : 'border-border hover:border-border/80'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                              <Building2 className="w-4 h-4" /> Universitaire
                            </span>
                            <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                              0 USD (Exempté)
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Pas de frais car entente/convention avec l'université partenaire référencée.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Section Universitaire conditionnelle */}
                    {formData.studentType === 'UNIVERSITAIRE' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-3"
                      >
                        <label className="block text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                          <GraduationCap className="w-4 h-4 text-emerald-700" />
                          Sélectionnez l'Université Partenaire *
                        </label>
                        <select
                          value={formData.university}
                          onChange={(e) => updateFormField('university', e.target.value)}
                          className={`w-full px-3 py-2 text-sm bg-white border rounded-xl focus:outline-none focus:ring-2 ${
                            fieldErrors.university ? 'border-rose-500 focus:ring-rose-200' : 'border-emerald-300 focus:ring-emerald-500'
                          }`}
                        >
                          <option value="">-- Choisir une université conventionnée --</option>
                          {PARTNER_UNIVERSITIES.map((uni) => (
                            <option key={uni} value={uni}>
                              {uni}
                            </option>
                          ))}
                        </select>
                        {fieldErrors.university && (
                          <p className="text-[11px] text-rose-600 font-semibold mt-1">⚠️ {fieldErrors.university}</p>
                        )}

                        {formData.university === 'Autre université (saisie libre)' && (
                          <input
                            type="text"
                            placeholder="Entrez le nom complet de l'université..."
                            value={formData.customUniversity}
                            onChange={(e) => updateFormField('customUniversity', e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-white border border-emerald-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 mt-2"
                          />
                        )}
                      </motion.div>
                    )}

                    {/* Section Mode de Paiement (Étudiant Libre) */}
                    {formData.studentType === 'LIBRE' && (
                      <div className="bg-muted/40 border border-border rounded-2xl p-4 space-y-3">
                        <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          Mode de paiement & Statut (500 USD)
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <span className="text-[11px] font-semibold text-muted-foreground block mb-1">
                              Canal de paiement
                            </span>
                            <select
                              value={formData.paymentMethod}
                              onChange={(e) => setFormData((prev) => ({ ...prev, paymentMethod: e.target.value }))}
                              className="w-full px-3 py-2 text-xs font-medium bg-background border border-border rounded-xl focus:outline-none"
                            >
                              {PAYMENT_METHODS.filter((m) => m.category !== 'EXEMPT').map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.name} ({m.description})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <span className="text-[11px] font-semibold text-muted-foreground block mb-1">
                              Statut du paiement
                            </span>
                            <select
                              value={formData.paymentStatus}
                              onChange={(e: any) => setFormData((prev) => ({ ...prev, paymentStatus: e.target.value }))}
                              className="w-full px-3 py-2 text-xs font-medium bg-background border border-border rounded-xl focus:outline-none"
                            >
                              <option value="PAID">Payé (Validé 500$)</option>
                              <option value="PENDING">En attente de règlement</option>
                              <option value="FAILED">Échoué / Refusé</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* 2. PAYS & NUMÉRO DE DOSSIER */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                      Pays de résidence *
                    </label>
                    <select
                      value={formData.countryCode}
                      onChange={(e) => handleCountryChange(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      {AFRICAN_COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.flag} {c.name} ({c.dialCode} - Code dossier {c.prefixDossier})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        N° de Dossier *
                      </label>
                      <button
                        type="button"
                        onClick={handleRegenerateDossier}
                        className="text-[11px] text-primary hover:underline flex items-center gap-1 font-semibold"
                      >
                        <RefreshCw className="w-3 h-3" /> Régénérer
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.dossierNumber}
                        onChange={(e) => updateFormField('dossierNumber', e.target.value)}
                        placeholder={`ex: ${selectedCountry.prefixDossier}-26-XXXXX`}
                        className={`w-full font-mono font-bold px-3 py-2.5 text-sm bg-background border rounded-xl focus:outline-none focus:ring-2 ${
                          fieldErrors.dossierNumber ? 'border-rose-500 focus:ring-rose-200 bg-rose-50/20' : 'border-border focus:ring-primary/30'
                        }`}
                        required
                      />
                    </div>
                    {fieldErrors.dossierNumber && (
                      <p className="text-[11px] text-rose-600 font-semibold mt-1">⚠️ {fieldErrors.dossierNumber}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Commence obligatoirement par le code pays <strong className="text-foreground">{selectedCountry.prefixDossier}</strong>.
                    </p>
                  </div>
                </div>

                {/* 3. IDENTITÉ (PRÉNOM & NOM & DATE DE NAISSANCE) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground mb-1">Prénom *</label>
                    <input
                      type="text"
                      placeholder="Jean"
                      value={formData.firstName}
                      onChange={(e) => updateFormField('firstName', e.target.value)}
                      className={`w-full px-3 py-2 text-sm bg-background border rounded-xl focus:outline-none focus:ring-2 ${
                        fieldErrors.firstName ? 'border-rose-500 focus:ring-rose-200 bg-rose-50/20' : 'border-border focus:ring-primary/30'
                      }`}
                      required
                    />
                    {fieldErrors.firstName && (
                      <p className="text-[11px] text-rose-600 font-semibold mt-1">⚠️ {fieldErrors.firstName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-muted-foreground mb-1">Nom *</label>
                    <input
                      type="text"
                      placeholder="Mukendi"
                      value={formData.lastName}
                      onChange={(e) => updateFormField('lastName', e.target.value)}
                      className={`w-full px-3 py-2 text-sm bg-background border rounded-xl focus:outline-none focus:ring-2 ${
                        fieldErrors.lastName ? 'border-rose-500 focus:ring-rose-200 bg-rose-50/20' : 'border-border focus:ring-primary/30'
                      }`}
                      required
                    />
                    {fieldErrors.lastName && (
                      <p className="text-[11px] text-rose-600 font-semibold mt-1">⚠️ {fieldErrors.lastName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-muted-foreground mb-1">Date de naissance</label>
                    <input
                      type="date"
                      value={formData.birthDate}
                      onChange={(e) => updateFormField('birthDate', e.target.value)}
                      className={`w-full px-3 py-2 text-sm bg-background border rounded-xl focus:outline-none focus:ring-2 ${
                        fieldErrors.birthDate ? 'border-rose-500 focus:ring-rose-200 bg-rose-50/20' : 'border-border focus:ring-primary/30'
                      }`}
                    />
                    {fieldErrors.birthDate && (
                      <p className="text-[11px] text-rose-600 font-semibold mt-1">⚠️ {fieldErrors.birthDate}</p>
                    )}
                  </div>
                </div>

                {/* 4. TÉLÉPHONE & EMAIL */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground mb-1">
                      Téléphone avec indicatif ({selectedCountry.dialCode}) *
                    </label>
                    <div className={`flex rounded-xl overflow-hidden border ${fieldErrors.phone ? 'border-rose-500 bg-rose-50/10' : 'border-border'}`}>
                      <span className="px-3 py-2 bg-muted text-xs font-bold text-muted-foreground flex items-center border-r border-border">
                        {selectedCountry.dialCode}
                      </span>
                      <input
                        type="tel"
                        placeholder={selectedCountry.phonePlaceholder}
                        value={formData.phone}
                        onChange={(e) => updateFormField('phone', e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-background focus:outline-none"
                      />
                    </div>
                    {fieldErrors.phone && (
                      <p className="text-[11px] text-rose-600 font-semibold mt-1">⚠️ {fieldErrors.phone}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-muted-foreground mb-1">Adresse Email *</label>
                    <input
                      type="email"
                      placeholder="etudiant@domaine.com"
                      value={formData.email}
                      onChange={(e) => updateFormField('email', e.target.value)}
                      className={`w-full px-3 py-2 text-sm bg-background border rounded-xl focus:outline-none focus:ring-2 ${
                        fieldErrors.email ? 'border-rose-500 focus:ring-rose-200 bg-rose-50/20' : 'border-border focus:ring-primary/30'
                      }`}
                      required
                    />
                    {fieldErrors.email && (
                      <p className="text-[11px] text-rose-600 font-semibold mt-1">⚠️ {fieldErrors.email}</p>
                    )}
                  </div>
                </div>

                {/* 5. MOT DE PASSE & CONTRE-VÉRIFICATION */}
                <div className="bg-muted/30 border border-border rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5" /> Sécurité & Contre-Vérification Mot de Passe
                    </label>
                    {isPasswordMatch && (
                      <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Mots de passe identiques
                      </span>
                    )}
                    {isPasswordMismatch && (
                      <span className="text-[11px] text-rose-600 font-bold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> Ne correspondent pas
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-[11px] text-muted-foreground block mb-1">Mot de passe (≥ 6 car.) *</span>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={(e) => updateFormField('password', e.target.value)}
                        className={`w-full px-3 py-2 text-sm bg-background border rounded-xl focus:outline-none focus:ring-2 ${
                          fieldErrors.password ? 'border-rose-500 focus:ring-rose-200 bg-rose-50/20' : 'border-border focus:ring-primary/30'
                        }`}
                        required
                      />
                      {fieldErrors.password && (
                        <p className="text-[11px] text-rose-600 font-semibold mt-1">⚠️ {fieldErrors.password}</p>
                      )}
                    </div>

                    <div>
                      <span className="text-[11px] text-muted-foreground block mb-1">
                        Confirmer le mot de passe (contre-vérification) *
                      </span>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={formData.passwordConfirm}
                        onChange={(e) => updateFormField('passwordConfirm', e.target.value)}
                        className={`w-full px-3 py-2 text-sm bg-background border rounded-xl focus:outline-none ${
                          isPasswordMismatch || fieldErrors.passwordConfirm
                            ? 'border-rose-500 focus:ring-2 focus:ring-rose-200 bg-rose-50/10'
                            : isPasswordMatch
                            ? 'border-emerald-500 focus:ring-2 focus:ring-emerald-200'
                            : 'border-border focus:ring-2 focus:ring-primary/30'
                        }`}
                        required
                      />
                      {fieldErrors.passwordConfirm && (
                        <p className="text-[11px] text-rose-600 font-semibold mt-1">⚠️ {fieldErrors.passwordConfirm}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* 6. PHOTO & RECONNAISSANCE FACIALE */}
                <div className="border border-border rounded-2xl p-4 bg-muted/20">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Camera className="w-4 h-4 text-primary" /> Photo d'identité & Reconnaissance faciale
                      </span>
                      <p className="text-[11px] text-muted-foreground">
                        Capture Webcam en direct ou fichier d'identité
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsPhotoModalOpen(true)}
                      className="px-3 py-1.5 text-xs font-bold bg-primary text-primary-foreground rounded-xl flex items-center gap-1.5 hover:bg-primary/90 transition"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      {formData.photoUrl ? 'Modifier la photo' : 'Prendre la photo'}
                    </button>
                  </div>

                  {formData.photoUrl ? (
                    <div className="flex items-center gap-4 bg-card border border-border p-3 rounded-xl">
                      <img
                        src={formData.photoUrl}
                        alt="Photo étudiant"
                        className="w-16 h-16 rounded-xl object-cover border-2 border-emerald-500"
                      />
                      <div className="flex-1">
                        <p className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Photo enregistrée
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Prête pour la validation faciale de certification
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, photoUrl: '' }))}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => setIsPhotoModalOpen(true)}
                      className="cursor-pointer border border-dashed border-border hover:border-primary rounded-xl p-4 text-center transition bg-card"
                    >
                      <Camera className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                      <p className="text-xs text-muted-foreground font-medium">
                        Cliquez pour capturer par webcam ou uploader une photo
                      </p>
                    </div>
                  )}
                </div>

                {/* Boutons d'action */}
                <div className="pt-2 flex items-center justify-end gap-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-5 py-2.5 text-xs font-semibold rounded-xl text-muted-foreground hover:text-foreground"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={creating || (formData.passwordConfirm !== '' && !isPasswordMatch)}
                    className={`px-6 py-2.5 text-xs font-bold rounded-xl text-white shadow-lg transition flex items-center gap-2 disabled:opacity-50 ${
                      formData.role === 'INSTRUCTOR'
                        ? 'bg-amber-600 hover:bg-amber-700'
                        : 'bg-primary hover:bg-primary/90'
                    }`}
                  >
                    {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                    {formData.role === 'INSTRUCTOR' ? 'Créer le Formateur (Accès restreint)' : "Enregistrer l'Étudiant"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL WEBCAM / CAMÉRA MOBILE / TÉLÉVERSEMENT */}
      <FacialCaptureModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        initialPhoto={formData.photoUrl}
        dossierNumber={formData.dossierNumber}
        userName={formData.firstName && formData.lastName ? `${formData.firstName} ${formData.lastName}` : undefined}
        onCapture={(photoBase64) => {
          setFormData((prev) => ({ ...prev, photoUrl: photoBase64, facialVerificationStatus: 'VERIFIED' }));
          toast.success('Photo capturée et associée !');
        }}
      />

      {/* MODAL RÉINITIALISATION MOT DE PASSE */}
      <AnimatePresence>
        {resetUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-foreground text-sm">Réinitialiser le mot de passe</h3>
                </div>
                <button onClick={() => setResetUser(null)} className="p-1 rounded-lg text-muted-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-muted-foreground mb-4">
                Définissez un nouveau mot de passe pour l'étudiant <strong>{resetUser.name || resetUser.email}</strong>.
              </p>

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Nouveau mot de passe (min. 6 caractères)
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setResetUser(null)}
                    className="px-4 py-2 text-xs font-semibold text-muted-foreground"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isResetting || newPasswordInput.length < 6}
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isResetting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Confirmer la réinitialisation
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL FICHE COMPLÈTE ÉTUDIANT */}
      <AnimatePresence>
        {detailUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-3xl shadow-2xl max-w-lg w-full p-6 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-5 pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-muted border border-border flex items-center justify-center">
                    {detailUser.photoUrl ? (
                      <img src={detailUser.photoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Users className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-foreground">{detailUser.name}</h3>
                    <p className="text-xs text-muted-foreground">{detailUser.email}</p>
                    <span className="font-mono text-[11px] font-bold text-primary mt-1 inline-block">
                      Dossier : {detailUser.dossierNumber || 'N/A'}
                    </span>
                  </div>
                </div>
                <button onClick={() => setDetailUser(null)} className="p-1 rounded-lg text-muted-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-border">
                  <span className="text-muted-foreground">Type d'étudiant :</span>
                  <span className="font-bold text-foreground">
                    {detailUser.studentType === 'UNIVERSITAIRE' ? '🎓 Universitaire' : '💳 Libre'}
                  </span>
                </div>
                {detailUser.university && (
                  <div className="flex justify-between py-1.5 border-b border-border">
                    <span className="text-muted-foreground">Université partenaire :</span>
                    <span className="font-bold text-foreground text-right">{detailUser.university}</span>
                  </div>
                )}
                <div className="flex justify-between py-1.5 border-b border-border">
                  <span className="text-muted-foreground">Téléphone :</span>
                  <span className="font-bold text-foreground">{detailUser.phone || 'Non renseigné'}</span>
                </div>
                {detailUser.birthDate && (
                  <div className="flex justify-between py-1.5 border-b border-border">
                    <span className="text-muted-foreground">Date de naissance :</span>
                    <span className="font-bold text-foreground">
                      {new Date(detailUser.birthDate).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                )}
                <div className="flex justify-between py-1.5 border-b border-border">
                  <span className="text-muted-foreground">Paiement :</span>
                  <span className="font-bold text-foreground">
                    {detailUser.studentType === 'UNIVERSITAIRE'
                      ? '0 USD (Convention)'
                      : `${detailUser.paymentAmount || 500} USD — ${detailUser.paymentStatus}`}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border">
                  <span className="text-muted-foreground">Vérification faciale :</span>
                  <span className={`font-bold ${detailUser.facialVerificationStatus === 'VERIFIED' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {detailUser.facialVerificationStatus || 'PENDING'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-muted-foreground">Date d'admission :</span>
                  <span className="font-medium text-foreground">
                    {new Date(detailUser.createdAt).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setDetailUser(null)}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DE MODIFICATION ÉTUDIANT */}
      <EditUserModal
        isOpen={!!editUser}
        user={editUser}
        onClose={() => setEditUser(null)}
        onUserUpdated={(updatedUser) => {
          setUsers((prev) =>
            prev.map((u) => (u.id === updatedUser.id ? { ...u, ...updatedUser } : u))
          );
        }}
      />

      {/* MODAL DE SUPPRESSION DÉFINITIVE ÉTUDIANT */}
      <DeleteUserModal
        isOpen={!!deleteUser}
        user={deleteUser}
        onClose={() => setDeleteUser(null)}
        onUserDeleted={(deletedId) => {
          setUsers((prev) => prev.filter((u) => u.id !== deletedId));
        }}
      />
    </div>
  );
}
