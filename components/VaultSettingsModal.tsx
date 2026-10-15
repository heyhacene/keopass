'use client';

import React from 'react';
import { useVault } from '@/lib/vaultContext';
import { isSupabaseConfigured } from '@/lib/supabase';
import {
  X,
  Shield,
  Download,
  Clock,
  Cloud,
  CloudOff,
  Lock,
  FileCheck,
  AlertTriangle,
} from 'lucide-react';

interface VaultSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function VaultSettingsModal({ isOpen, onClose }: VaultSettingsModalProps) {
  const {
    userEmail,
    autoLockMinutes,
    setAutoLockMinutes,
    exportVaultData,
    isSyncing,
  } = useVault();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-100 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in-95">
        {/* HEADER */}
        <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between bg-gray-50/70 dark:bg-slate-850">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-vault-100 dark:bg-vault-950/60 text-vault-700 dark:text-vault-400 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                Paramètres du coffre
              </h3>
              <p className="text-[11px] text-gray-400 dark:text-slate-500">
                Sécurité & Sauvegardes
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENU */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* UTILISATEUR & SYNCHRO */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Compte & Synchronisation
            </h4>
            <div className="p-3.5 bg-gray-50 dark:bg-slate-750 rounded-2xl border border-gray-100 dark:border-slate-700 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-900 dark:text-white">{userEmail}</p>
                <div className="flex items-center gap-1.5 mt-1 text-[11px]">
                  {isSupabaseConfigured() ? (
                    <>
                      <Cloud className="w-3.5 h-3.5 text-vault-600" />
                      <span className="text-vault-600 font-semibold">
                        {isSyncing ? 'Synchronisation en cours...' : 'Synchronisation Cloud active'}
                      </span>
                    </>
                  ) : (
                    <>
                      <CloudOff className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-gray-500 dark:text-gray-400">
                        Mode local sécurisé (hors-ligne)
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* VERROUILLAGE AUTOMATIQUE */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-vault-600" />
              <h4 className="text-xs font-bold text-gray-700 dark:text-gray-200">
                Délai de verrouillage d'inactivité
              </h4>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Le coffre se verrouille et purge la mémoire si vous ne touchez pas l’application.
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {[5, 15, 30, 60].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setAutoLockMinutes(mins)}
                  className={`py-2 rounded-xl text-xs font-bold transition border ${
                    autoLockMinutes === mins
                      ? 'bg-vault-600 text-white border-vault-600 shadow-xs'
                      : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                  }`}
                >
                  {mins} min
                </button>
              ))}
            </div>
          </div>

          {/* SAUVEGARDE & EXPORTATION */}
          <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-slate-700">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Sauvegardes & Restauration
            </h4>

            <button
              type="button"
              onClick={() => exportVaultData(false)}
              className="w-full p-3.5 bg-gray-50 dark:bg-slate-750 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-2xl border border-gray-100 dark:border-slate-700 transition flex items-center justify-between text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-vault-100 dark:bg-vault-950/60 text-vault-700 dark:text-vault-400 flex items-center justify-center">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="font-bold text-xs text-gray-900 dark:text-white">
                    Exporter la sauvegarde chiffrée
                  </h5>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    Fichier .json protégé par votre mot de passe maître
                  </p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                if (confirm('Attention : Ce fichier contiendra vos mots de passe en clair sans chiffrement. Conservez-le en lieu sûr. Continuer ?')) {
                  exportVaultData(true);
                }
              }}
              className="w-full p-3 bg-red-50/50 dark:bg-red-950/20 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-2xl border border-red-200/50 dark:border-red-900/30 transition flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <div>
                  <h5 className="font-bold text-xs text-red-600 dark:text-red-400">
                    Exporter en texte clair (Non chiffré)
                  </h5>
                  <p className="text-[10px] text-red-500/80">
                    À utiliser uniquement pour imprimer ou archiver
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-3 bg-gray-50 dark:bg-slate-850 border-t border-gray-100 dark:border-slate-700 text-center">
          <p className="text-[11px] text-gray-400 dark:text-slate-500">
            PassVault v1.0.0 • Chiffrement Zero-Knowledge AES-256-GCM
          </p>
        </div>
      </div>
    </div>
  );
}
