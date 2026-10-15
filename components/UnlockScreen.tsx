'use client';

import React, { useState } from 'react';
import { useVault } from '@/lib/vaultContext';
import { ShieldCheck, Lock, Eye, EyeOff, ArrowRight, AlertCircle, KeyRound } from 'lucide-react';

export default function UnlockScreen() {
  const { userEmail, unlockVault } = useVault();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [unlocking, setUnlocking] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setError('');
    setUnlocking(true);

    // Laisse un tick pour afficher le spinner pendant le calcul PBKDF2
    setTimeout(async () => {
      const success = await unlockVault(password);
      if (!success) {
        setError('Mot de passe maître incorrect. Veuillez réessayer.');
        setUnlocking(false);
      }
    }, 50);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-850 rounded-3xl p-6 sm:p-8 border border-gray-100 dark:border-slate-750 shadow-2xl space-y-6 text-center animate-in fade-in zoom-in-95">
        {/* LOGO & STATUT */}
        <div className="mx-auto w-16 h-16 rounded-3xl bg-gradient-to-tr from-vault-600 to-emerald-400 text-white flex items-center justify-center shadow-lg shadow-vault-500/30">
          <Lock className="w-8 h-8" />
        </div>

        <div className="space-y-1">
          <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">
            Coffre-fort verrouillé
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Saisissez votre mot de passe maître pour déchiffrer vos données
          </p>
          {userEmail && (
            <div className="pt-2">
              <span className="inline-block px-3 py-1 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 rounded-full text-xs font-semibold">
                {userEmail}
              </span>
            </div>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-2xl flex items-center gap-2 text-left text-xs text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
              Mot de passe maître
            </label>
            <div className="relative flex items-center">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoFocus
                placeholder="Votre clé secrète"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={unlocking}
                className="w-full py-3 pl-4 pr-12 rounded-2xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-sm font-mono text-gray-900 dark:text-white focus:ring-2 focus:ring-vault-500 outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={unlocking || !password}
            className="w-full py-3.5 bg-vault-600 hover:bg-vault-700 disabled:opacity-50 text-white font-bold rounded-2xl text-sm transition shadow-md shadow-vault-600/30 flex items-center justify-center gap-2"
          >
            {unlocking ? (
              <span>Déchiffrement AES-256 en cours...</span>
            ) : (
              <>
                <span>Déverrouiller le coffre</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-2 border-t border-gray-100 dark:border-slate-800 text-[11px] text-gray-400 dark:text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-vault-600" />
          <span>Protection Zero-Knowledge chiffrée sur votre appareil</span>
        </div>
      </div>
    </div>
  );
}
