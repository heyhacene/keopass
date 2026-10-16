'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Check,
  Flame,
  Clock,
  ExternalLink,
  Lock,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { decryptSharedSecret, SharedSecretPayload } from '@/lib/secureShare';

export default function SharePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [secret, setSecret] = useState<SharedSecretPayload | null>(null);

  const [revealPassword, setRevealPassword] = useState(false);
  const [copiedUser, setCopiedUser] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  useEffect(() => {
    async function loadSecretFromHash() {
      try {
        const hash = window.location.hash.substring(1);
        if (!hash) {
          setError('Aucun paramètre de secret trouvé dans le lien.');
          setLoading(false);
          return;
        }

        const params = new URLSearchParams(hash);
        const keyBase64 = params.get('k');
        const dataBase64 = params.get('d');

        if (!keyBase64 || !dataBase64) {
          setError('Le lien de partage est incomplet ou invalide.');
          setLoading(false);
          return;
        }

        // Déchiffrement direct côté client
        const decrypted = await decryptSharedSecret(keyBase64, dataBase64);
        setSecret(decrypted);

        // Si usage unique : suppression de la copie locale si c'est le créateur qui le consulte
        const shareId = params.get('id');
        if (shareId && decrypted.oneTime) {
          try {
            const localSharesStr = localStorage.getItem('keopass_shared_secrets_v1') || '{}';
            const localShares = JSON.parse(localSharesStr);
            delete localShares[shareId];
            localStorage.setItem('keopass_shared_secrets_v1', JSON.stringify(localShares));
          } catch (_) {}
        }
      } catch (err: any) {
        setError(err.message || 'Impossible de déchiffrer ce secret partagé.');
      } finally {
        setLoading(false);
      }
    }

    loadSecretFromHash();
  }, []);

  const handleCopy = async (text: string, type: 'user' | 'pass') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'user') {
        setCopiedUser(true);
        setTimeout(() => setCopiedUser(false), 2000);
      } else {
        setCopiedPassword(true);
        setTimeout(() => setCopiedPassword(false), 2000);
      }
    } catch (_) {}
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-slate-950 dark:to-slate-900 text-gray-900 dark:text-white flex flex-col items-center justify-center p-4">
      {/* LOGO KEO PASS */}
      <div className="mb-6 flex items-center gap-2.5">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-vault-600 to-emerald-400 text-white flex items-center justify-center shadow-md shadow-vault-500/20">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div className="text-left">
          <h1 className="font-extrabold text-lg tracking-tight leading-none">KeoPass</h1>
          <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mt-0.5">
            Partage Sécurisé Éphémère
          </p>
        </div>
      </div>

      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-2xl p-6 relative overflow-hidden">
        {loading && (
          <div className="py-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-vault-50 dark:bg-vault-950/50 text-vault-600 mx-auto flex items-center justify-center animate-pulse">
              <Lock className="w-6 h-6" />
            </div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              Déchiffrement AES-GCM en cours dans votre navigateur...
            </p>
          </div>
        )}

        {error && !loading && (
          <div className="py-8 text-center space-y-3 animate-in fade-in">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 mx-auto flex items-center justify-center shadow-inner">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-gray-900 dark:text-white">
              Secret introuvable ou expiré
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto leading-relaxed">
              {error}
            </p>
            <div className="pt-3">
              <Link
                href="/"
                className="px-4 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 text-gray-800 dark:text-gray-200 font-bold rounded-xl text-xs transition inline-block"
              >
                Retour à l'accueil
              </Link>
            </div>
          </div>
        )}

        {secret && !loading && (
          <div className="space-y-5 animate-in fade-in zoom-in-95">
            {/* EN-TÊTE DU SECRET */}
            <div className="space-y-1 text-center">
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 inline-block">
                Secret Déchiffré avec succès
              </span>
              <h2 className="text-xl font-black text-gray-900 dark:text-white pt-1">
                {secret.title}
              </h2>
              {secret.url && (
                <p className="text-xs text-gray-400 font-mono">
                  {secret.url.replace(/^https?:\/\//, '')}
                </p>
              )}
            </div>

            {/* ALERTE AUTODESTRUCTION OU EXPIRATION */}
            {secret.oneTime ? (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-200 dark:border-rose-900/50 flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-200">
                <Flame className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  <strong>Attention :</strong> Ce secret est à usage unique. Copiez-le dès maintenant car ce lien ne pourra plus être réouvert.
                </p>
              </div>
            ) : (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-900/50 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-200">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="text-[11px]">
                  Expire le {new Date(secret.expiresAt).toLocaleString()}
                </span>
              </div>
            )}

            {/* CHAMPS DÉCHIFFRÉS */}
            <div className="space-y-3 bg-gray-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-gray-100 dark:border-slate-800">
              {secret.username && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                    Identifiant / Email
                  </span>
                  <div className="flex items-center justify-between bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 font-mono text-xs">
                    <span className="truncate mr-2 font-semibold text-gray-900 dark:text-white">
                      {secret.username}
                    </span>
                    <button
                      onClick={() => handleCopy(secret.username!, 'user')}
                      className="p-1 text-gray-400 hover:text-vault-600 transition"
                      title="Copier"
                    >
                      {copiedUser ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {secret.password && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                    Mot de passe
                  </span>
                  <div className="flex items-center justify-between bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 font-mono text-xs">
                    <span className="truncate mr-2 font-bold text-gray-900 dark:text-white">
                      {revealPassword ? secret.password : '••••••••••••••••'}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setRevealPassword(!revealPassword)}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
                        title={revealPassword ? 'Masquer' : 'Afficher'}
                      >
                        {revealPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleCopy(secret.password!, 'pass')}
                        className="p-1 text-gray-400 hover:text-vault-600 transition"
                        title="Copier"
                      >
                        {copiedPassword ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {secret.notes && (
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                    Notes complémentaires
                  </span>
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-gray-200 dark:border-slate-700 text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                    {secret.notes}
                  </div>
                </div>
              )}
            </div>

            {/* BOUTON COPIER LE MOT DE PASSE PRINCIPAL */}
            {secret.password && (
              <button
                onClick={() => handleCopy(secret.password!, 'pass')}
                className={`w-full py-3 rounded-2xl font-bold text-xs transition shadow-md flex items-center justify-center gap-2 ${
                  copiedPassword
                    ? 'bg-emerald-600 text-white'
                    : 'bg-vault-600 hover:bg-vault-700 text-white shadow-vault-600/30'
                }`}
              >
                {copiedPassword ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedPassword ? 'Mot de passe copié !' : 'Copier le mot de passe'}</span>
              </button>
            )}

            {/* MENTION ZERO-KNOWLEDGE & DÉCOUVERTE KEO PASS */}
            <div className="pt-2 text-center space-y-2 border-t border-gray-100 dark:border-slate-800">
              <p className="text-[11px] text-gray-400 leading-tight">
                Chiffré avec <strong>KeoPass</strong> • Zéro-Knowledge militaire AES-256
              </p>
              <Link
                href="/"
                className="text-xs text-vault-600 dark:text-vault-400 font-bold hover:underline inline-flex items-center gap-1"
              >
                <span>Découvrir le coffre-fort KeoPass</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
