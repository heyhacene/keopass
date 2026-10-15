'use client';

import React, { useState } from 'react';
import { useVault } from '@/lib/vaultContext';
import { calculatePasswordStrength } from '@/lib/crypto';
import {
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertTriangle,
  KeyRound,
  ShieldAlert,
} from 'lucide-react';

export default function SetupVaultScreen() {
  const { setupVault } = useVault();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const strength = calculatePasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    if (password !== confirmPassword) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    if (password.length < 10) {
      setError('Votre mot de passe maître doit comporter au moins 10 caractères pour assurer une sécurité optimale.');
      return;
    }

    setError('');
    setLoading(true);

    setTimeout(async () => {
      const success = await setupVault(password, email);
      if (!success) {
        setError('Une erreur est survenue lors de l’initialisation de votre coffre.');
        setLoading(false);
      }
    }, 50);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white dark:bg-slate-850 rounded-3xl p-6 sm:p-8 border border-gray-100 dark:border-slate-750 shadow-2xl space-y-6 animate-in fade-in zoom-in-95">
        {/* LOGO */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 rounded-3xl bg-gradient-to-tr from-vault-600 to-emerald-400 text-white flex items-center justify-center shadow-lg shadow-vault-500/30">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white">
            Bienvenue sur PassVault
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Créez votre mot de passe maître pour initialiser votre coffre-fort chiffré de bout en bout
          </p>
        </div>

        {/* AVERTISSEMENT CRITIQUE ZERO-KNOWLEDGE */}
        <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-2xl flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Avertissement de sécurité important :</p>
            <p className="leading-relaxed opacity-90 text-[11px]">
              Grâce au chiffrement <strong>Zero-Knowledge</strong>, personne (ni même les développeurs ou les serveurs) ne connaît votre mot de passe maître. Il n’existe aucun moyen de le réinitialiser en cas d’oubli. Conservez-le soigneusement.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-2xl text-xs text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
              Votre adresse email (sert de sel de chiffrement)
            </label>
            <input
              type="email"
              required
              placeholder="votre.email@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-xs sm:text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-vault-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
              Mot de passe maître
            </label>
            <div className="relative flex items-center">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Choisissez un mot de passe très solide"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full py-2.5 pl-3.5 pr-12 rounded-2xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-xs sm:text-sm font-mono text-gray-900 dark:text-white focus:ring-2 focus:ring-vault-500 outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Jauge de force */}
            {password && (
              <div className="space-y-1 mt-2">
                <div className="flex justify-between text-[11px]">
                  <span className="font-bold text-gray-500">Robustesse :</span>
                  <span className={`font-bold ${strength.color}`}>{strength.label}</span>
                </div>
                <div className="grid grid-cols-4 gap-1 h-1.5 w-full">
                  {[1, 2, 3, 4].map((step) => (
                    <div
                      key={step}
                      className={`h-full rounded-full ${
                        step <= strength.score ? strength.bgBar : 'bg-gray-200 dark:bg-slate-700'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
              Confirmez le mot de passe maître
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              placeholder="Répétez exactement votre mot de passe maître"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-xs sm:text-sm font-mono text-gray-900 dark:text-white focus:ring-2 focus:ring-vault-500 outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !password || !email}
            className="w-full py-3.5 bg-vault-600 hover:bg-vault-700 disabled:opacity-50 text-white font-bold rounded-2xl text-xs sm:text-sm transition shadow-md shadow-vault-600/30 flex items-center justify-center gap-2 mt-4"
          >
            {loading ? (
              <span>Génération des clés AES-256 en cours...</span>
            ) : (
              <>
                <span>Créer mon coffre-fort sécurisé</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
