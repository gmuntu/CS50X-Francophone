'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Trash2, AlertTriangle, X, Loader2, ShieldCheck, Users } from 'lucide-react';
import toast from 'react-hot-toast';

interface UserItem {
  id: string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  dossierNumber?: string | null;
  photoUrl?: string | null;
}

interface DeleteUserModalProps {
  user: UserItem | null;
  isOpen: boolean;
  onClose: () => void;
  onUserDeleted: (userId: string) => void;
}

const SUPER_ADMIN_EMAIL = 'gmuntusip@gmail.com';
const SUPER_ADMIN_EMAILS = ['gmuntusip@gmail.com', 'admin@cs50x-francophone.com'];

export default function DeleteUserModal({
  user,
  isOpen,
  onClose,
  onUserDeleted,
}: DeleteUserModalProps) {
  const [deleting, setDeleting] = useState(false);

  if (!isOpen || !user) return null;

  const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(user.email || '');

  const handleConfirmDelete = async () => {
    if (deleting || isSuperAdmin) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/admin/users?userId=${user.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || 'Erreur lors de la suppression.');
        return;
      }

      toast.success(data?.message || 'Étudiant supprimé avec succès !');
      onUserDeleted(user.id);
      onClose();
    } catch {
      toast.error('Erreur de communication avec le serveur.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full p-6 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isSuperAdmin
                  ? 'bg-primary/10 text-primary'
                  : 'bg-red-500/10 text-red-600 dark:text-red-400'
              }`}
            >
              {isSuperAdmin ? <ShieldCheck className="w-5 h-5" /> : <Trash2 className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                {isSuperAdmin ? 'Compte Super Admin Protégé' : 'Supprimer l\'étudiant'}
              </h3>
              <p className="text-xs text-muted-foreground">Action irréversible</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isSuperAdmin ? (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-primary/10 border border-primary/20 rounded-xl text-foreground flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p>
                Le compte <strong>Ghislain Muntu ({SUPER_ADMIN_EMAIL})</strong> est le{' '}
                <strong>Super Administrateur principal</strong> du système. Il ne peut pas être supprimé afin de garantir la continuité d'administration.
              </p>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground"
              >
                Compris
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-xs">
            {/* Warning Box */}
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-300">Attention, cette suppression est définitive :</p>
                <p className="text-red-400/90 text-[11px] mt-0.5">
                  Toutes les données associées (progression dans les modules, quiz passés, soumissions et conversations avec le tuteur) seront définitivement purgées.
                </p>
              </div>
            </div>

            {/* User Card */}
            <div className="p-3 bg-muted/50 border border-border rounded-xl flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl overflow-hidden bg-background border border-border flex items-center justify-center shrink-0">
                {user.photoUrl ? (
                  <img src={user.photoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Users className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-foreground truncate">{user.name || user.email}</p>
                <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                {user.dossierNumber && (
                  <p className="font-mono text-[10px] text-primary font-semibold mt-0.5">
                    Dossier : {user.dossierNumber}
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white transition flex items-center gap-1.5 disabled:opacity-50 shadow-md"
              >
                {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Confirmer la suppression
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
