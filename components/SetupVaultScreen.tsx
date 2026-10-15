'use client';

import React, { useState } from 'react';
import { useVault } from '@/lib/vaultContext';
import { calculatePasswordStrength } from '@/lib/crypto';
import {
  ShieldCheck,
  Eye,
  EyeOff,
  ArrowRight,
  AlertTriangle,
  AlertCircle,
  Check,
  RefreshCw,
  Smartphone,
  Laptop,
} from 'lucide-react';

export default function SetupVaultScreen() {
  const { setupVault, loginVault } = useVault();
  const [mode, setMode] = useState<'create' | 'login'>('create');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Critères stricts demandés : 8 caractères, 1 majuscule, 1 chiffre, 1 symbole
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const isPasswordValid = hasMinLength && hasUppercase && hasNumber && hasSymbol;

  const strength = calculatePasswordStrength(password);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    if (!hasMinLength) {
      setError('Le mot de passe maître doit comporter au moins 8 caractères.');
      return;
    }
    if (!hasUppercase) {
      setError('Le mot de passe maître doit contenir au moins une lettre majuscule (A-Z).');
      return;
    }
    if (!hasNumber) {
      setError('Le mot de passe maître doit contenir au moins un chiffre (0-9).');
      return;
    }
    if (!hasSymbol) {
      setError('Le mot de passe maître doit contenir au moins un symbole ou caractère spécial (!, @, #, $, etc.).');
      return;
    }
    if (password !== confirmPassword) {
      setError('Les deux mots de passe ne correspondent pas.');
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

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setError('');
    setLoading(true);

    setTimeout(async () => {
      const res = await loginVault(password, email);
      if (!res.success) {
        setError(res.error || 'Identifiants invalides ou coffre introuvable.');
        setLoading(false);
      }
    }, 50);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-gray-200 dark:border-slate-700 shadow-2xl space-y-6 animate-in fade-in zoom-in-95">
        {/* LOGO */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 rounded-3xl bg-gradient-to-tr from-vault-600 to-emerald-400 text-white flex items-center justify-center shadow-lg shadow-vault-500/30">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white">
            Bienvenue sur KeoPass
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Coffre-fort Zero-Knowledge chiffré AES-256 multiplateforme
          </p>
        </div>

        {/* ONGLETS : CRÉER OU LIER UN APPAREIL */}
        <div className="grid grid-cols-2 p-1 bg-gray-100 dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setMode('create');
              setError('');
            }}
            className={`py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 ${
              mode === 'create'
                ? 'bg-white dark:bg-slate-800 text-vault-600 dark:text-vault-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Créer un coffre</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
            }}
            className={`py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 ${
              mode === 'login'
                ? 'bg-white dark:bg-slate-800 text-vault-600 dark:text-vault-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Lier cet appareil</span>
          </button>
        </div>

        {/* AVERTISSEMENT CRITIQUE ZERO-KNOWLEDGE (HAUT CONTRASTE) */}
        {mode === 'create' ? (
          <div className="p-4 bg-amber-500/10 dark:bg-slate-900 border border-amber-500/40 rounded-2xl flex items-start gap-3 text-xs">
            <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <p className="font-bold text-gray-900 dark:text-white text-xs">
                Avertissement de sécurité important :
              </p>
              <p className="leading-relaxed text-gray-600 dark:text-gray-300 text-[11px]">
                Grâce au chiffrement <strong>Zero-Knowledge</strong>, personne ne connaît votre mot de passe maître. Il n’existe aucun moyen de le réinitialiser en cas d’oubli.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-vault-500/10 dark:bg-slate-900 border border-vault-500/40 rounded-2xl flex items-start gap-3 text-xs">
            <div className="p-1.5 rounded-xl bg-vault-500/20 text-vault-600 dark:text-vault-400 shrink-0 mt-0.5">
              <Smartphone className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <p className="font-bold text-gray-900 dark:text-white text-xs">
                Synchronisation multi-appareils :
              </p>
              <p className="leading-relaxed text-gray-600 dark:text-gray-300 text-[11px]">
                Saisissez l’email et le mot de passe maître configurés sur votre autre appareil (PC, téléphone) pour synchroniser et déchiffrer votre coffre ici.
              </p>
            </div>
          </div>
        )}

        {/* MESSAGE D'ERREUR (HAUT CONTRASTE) */}
        {error && (
          <div className="p-3.5 bg-red-500/10 dark:bg-slate-900 border border-red-500/50 rounded-2xl flex items-center gap-2.5 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span className="font-semibold text-red-700 dark:text-red-200">{error}</span>
          </div>
        )}

        {/* FORMULAIRE DE CRÉATION */}
        {mode === 'create' ? (
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-1.5">
                Votre adresse email (sert de sel de chiffrement)
              </label>
              <input
                type="email"
                required
                placeholder="votre.email@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-xs sm:text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-vault-500 focus:border-vault-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-1.5">
                Mot de passe maître
              </label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Ex: Secur1te!2026"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full py-2.5 pl-3.5 pr-12 rounded-2xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-xs sm:text-sm font-mono text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-vault-500 focus:border-vault-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* CRITÈRES DE VALIDATION EN TEMPS RÉEL */}
              <div className="grid grid-cols-2 gap-2 pt-2.5 px-1 text-xs">
                <div
                  className={`flex items-center gap-1.5 transition-colors ${
                    hasMinLength
                      ? 'text-vault-600 dark:text-vault-400 font-bold'
                      : 'text-gray-400 dark:text-slate-500'
                  }`}
                >
                  {hasMinLength ? (
                    <Check className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <span className="w-3.5 h-3.5 flex items-center justify-center font-mono">•</span>
                  )}
                  <span>Au moins 8 caractères</span>
                </div>

                <div
                  className={`flex items-center gap-1.5 transition-colors ${
                    hasUppercase
                      ? 'text-vault-600 dark:text-vault-400 font-bold'
                      : 'text-gray-400 dark:text-slate-500'
                  }`}
                >
                  {hasUppercase ? (
                    <Check className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <span className="w-3.5 h-3.5 flex items-center justify-center font-mono">•</span>
                  )}
                  <span>1 majuscule (A-Z)</span>
                </div>

                <div
                  className={`flex items-center gap-1.5 transition-colors ${
                    hasNumber
                      ? 'text-vault-600 dark:text-vault-400 font-bold'
                      : 'text-gray-400 dark:text-slate-500'
                  }`}
                >
                  {hasNumber ? (
                    <Check className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <span className="w-3.5 h-3.5 flex items-center justify-center font-mono">•</span>
                  )}
                  <span>1 chiffre (0-9)</span>
                </div>

                <div
                  className={`flex items-center gap-1.5 transition-colors ${
                    hasSymbol
                      ? 'text-vault-600 dark:text-vault-400 font-bold'
                      : 'text-gray-400 dark:text-slate-500'
                  }`}
                >
                  {hasSymbol ? (
                    <Check className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <span className="w-3.5 h-3.5 flex items-center justify-center font-mono">•</span>
                  )}
                  <span>1 symbole (!@#$...)</span>
                </div>
              </div>

              {/* JAUGE DE FORCE */}
              {password && (
                <div className="space-y-1.5 mt-3 pt-2 border-t border-gray-100 dark:border-slate-700/60">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-semibold text-gray-500 dark:text-gray-400">Robustesse :</span>
                    <span className={`font-bold ${strength.color}`}>{strength.label}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={`h-full rounded-full transition-all ${
                          step <= strength.score ? strength.bgBar : 'bg-gray-200 dark:bg-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-1.5">
                Confirmez le mot de passe maître
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Répétez exactement votre mot de passe maître"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-xs sm:text-sm font-mono text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-vault-500 focus:border-vault-500 outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !password || !email || !isPasswordValid}
              className="w-full py-3.5 bg-vault-600 hover:bg-vault-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-2xl text-xs sm:text-sm transition shadow-md shadow-vault-600/30 flex items-center justify-center gap-2 mt-4"
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
        ) : (
          /* FORMULAIRE DE CONNEXION / LIAISON D'APPAREIL EXISTANT */
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-1.5">
                Votre adresse email
              </label>
              <input
                type="email"
                required
                placeholder="votre.email@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-xs sm:text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-vault-500 focus:border-vault-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-1.5">
                Votre mot de passe maître
              </label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Entrez votre mot de passe maître"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full py-2.5 pl-3.5 pr-12 rounded-2xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-xs sm:text-sm font-mono text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-vault-500 focus:border-vault-500 outline-none"
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
              disabled={loading || !password || !email}
              className="w-full py-3.5 bg-vault-600 hover:bg-vault-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-2xl text-xs sm:text-sm transition shadow-md shadow-vault-600/30 flex items-center justify-center gap-2 mt-4"
            >
              {loading ? (
                <span>Déchiffrement et synchronisation...</span>
              ) : (
                <>
                  <span>Synchroniser et déverrouiller ce coffre</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
