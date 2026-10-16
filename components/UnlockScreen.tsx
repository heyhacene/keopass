'use client';

import React, { useState, useEffect } from 'react';
import { useVault } from '@/lib/vaultContext';
import {
  isBiometricAvailable,
  isBiometricConfigured,
  authenticateBiometric,
  enableBiometric,
} from '@/lib/biometrics';
import { ShieldCheck, Lock, Eye, EyeOff, ArrowRight, AlertCircle, Fingerprint, Globe, ExternalLink, Bot } from 'lucide-react';
import SupportChatbot from '@/components/SupportChatbot';

export default function UnlockScreen() {
  const { userEmail, unlockVault, resetVaultLocal } = useVault();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [hasBiometrics, setHasBiometrics] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [enableBiometricOnUnlock, setEnableBiometricOnUnlock] = useState(true);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);

  useEffect(() => {
    isBiometricAvailable().then((avail) => setBiometricAvailable(avail));
    const configured = isBiometricConfigured();
    setHasBiometrics(configured);
    if (configured) {
      const t = setTimeout(() => {
        handleBiometricUnlock();
      }, 350);
      return () => clearTimeout(t);
    }
  }, []);

  const handleBiometricUnlock = async () => {
    setError('');
    setUnlocking(true);
    try {
      const res = await authenticateBiometric();
      if (res.success && res.masterPassword) {
        const success = await unlockVault(res.masterPassword);
        if (!success) {
          setError('Échec du déchiffrement du coffre.');
          setUnlocking(false);
        }
      } else {
        if (res.error && !res.error.includes('annulée')) {
          setError(res.error);
        }
        setUnlocking(false);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l’authentification biométrique.');
      setUnlocking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setError('');
    setUnlocking(true);

    setTimeout(async () => {
      const success = await unlockVault(password, enableBiometricOnUnlock && !hasBiometrics);
      if (!success) {
        setError('Mot de passe maître incorrect. Veuillez réessayer.');
        setUnlocking(false);
      }
    }, 50);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-gray-200 dark:border-slate-700 shadow-2xl space-y-6 text-center animate-in fade-in zoom-in-95">
        {/* LOGO & STATUT */}
        <div className="mx-auto w-16 h-16 rounded-3xl bg-gradient-to-tr from-vault-600 to-emerald-400 text-white flex items-center justify-center shadow-lg shadow-vault-500/30">
          <Lock className="w-8 h-8" />
        </div>

        <div className="space-y-1">
          <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">
            Coffre-fort verrouillé
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Déverrouillez votre coffre pour déchiffrer vos identifiants
          </p>
          {userEmail && (
            <div className="pt-2">
              <span className="inline-block px-3 py-1 bg-gray-100 dark:bg-slate-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-700 rounded-full text-xs font-semibold">
                {userEmail}
              </span>
            </div>
          )}
        </div>

        {/* MESSAGE D'ERREUR HAUT CONTRASTE */}
        {error && (
          <div className="p-3.5 bg-red-500/10 dark:bg-slate-900 border border-red-500/50 rounded-2xl flex items-center gap-2.5 text-left text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span className="font-semibold text-red-700 dark:text-red-200">{error}</span>
          </div>
        )}

        {/* DÉVERROUILLAGE BIOMÉTRIQUE (SI ACTIVÉ) */}
        {hasBiometrics && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleBiometricUnlock}
              disabled={unlocking}
              className="w-full py-3.5 px-4 bg-vault-600/10 hover:bg-vault-600/20 text-vault-700 dark:text-vault-400 border border-vault-500/40 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2.5 shadow-xs group"
            >
              <Fingerprint className="w-5 h-5 text-vault-600 dark:text-vault-400 group-hover:scale-110 transition-transform" />
              <span>{unlocking ? 'Authentification...' : 'Déverrouiller avec l’empreinte digitale'}</span>
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200 dark:border-slate-700/60" />
              <span className="text-[11px] text-gray-400 font-semibold uppercase">ou mot de passe</span>
              <div className="flex-1 h-px bg-gray-200 dark:border-slate-700/60" />
            </div>
          </div>
        )}

        {/* FORMULAIRE MOT DE PASSE MAÎTRE */}
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-1.5">
              Mot de passe maître
            </label>
            <div className="relative flex items-center">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoFocus={!hasBiometrics}
                placeholder="Votre mot de passe maître"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={unlocking}
                className="w-full py-3 pl-4 pr-12 rounded-2xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-sm font-mono text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-vault-500 focus:border-vault-500 outline-none"
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

          {/* PROPOSITION D'ACTIVATION EMPREINTE */}
          {!hasBiometrics && (
            <label className="flex items-center gap-2.5 cursor-pointer pt-1 text-xs text-gray-600 dark:text-gray-300 text-left">
              <input
                type="checkbox"
                checked={enableBiometricOnUnlock}
                onChange={(e) => setEnableBiometricOnUnlock(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-vault-600 focus:ring-vault-500"
              />
              <span className="flex items-center gap-1.5 font-medium">
                <Fingerprint className="w-4 h-4 text-vault-600 dark:text-vault-400 shrink-0" />
                Activer l'empreinte digitale pour les prochains déverrouillages
              </span>
            </label>
          )}

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

        <div className="text-center pt-1">
          <button
            type="button"
            onClick={() => {
              if (confirm('Voulez-vous changer de compte ? Vos identifiants locaux seront réinitialisés sur cet appareil.')) {
                resetVaultLocal();
              }
            }}
            className="text-xs text-gray-500 hover:text-vault-600 dark:text-gray-400 dark:hover:text-vault-400 font-medium transition"
          >
            Ce n’est pas votre compte ? <span className="underline">Changer de compte</span>
          </button>
        </div>

        <div className="pt-2 border-t border-gray-100 dark:border-slate-700 space-y-2">
          <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-vault-600" />
            <span>Protection Zero-Knowledge chiffrée sur votre appareil</span>
          </div>

          <div className="flex items-center justify-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
            <Globe className="w-3.5 h-3.5 text-blue-500" />
            <a
              href="https://keopass.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-600 dark:hover:text-blue-400 transition underline flex items-center gap-1 font-medium"
            >
              <span>Accéder à la version Web (keopass.vercel.app)</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="pt-1 flex items-center justify-center">
            <button
              type="button"
              onClick={() => setIsChatbotOpen(true)}
              className="py-1 px-3 rounded-full bg-emerald-50 hover:bg-emerald-100 dark:bg-slate-750 dark:hover:bg-slate-700 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold transition flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-800/60 shadow-2xs"
            >
              <Bot className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Besoin d'aide ? Discuter avec l'Assistant Keo</span>
            </button>
          </div>
        </div>
      </div>

      {/* ASSISTANT DE SUPPORT */}
      <SupportChatbot isOpen={isChatbotOpen} onToggle={setIsChatbotOpen} />
    </div>
  );
}
