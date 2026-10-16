'use client';

import React, { useState } from 'react';
import {
  Share2,
  X,
  Copy,
  Check,
  ShieldCheck,
  Clock,
  Flame,
  ExternalLink,
  Eye,
  EyeOff,
  Sparkles,
  Send,
} from 'lucide-react';
import { VaultItem, LoginData } from '@/types/vault';
import { createEncryptedShareLink } from '@/lib/secureShare';

interface SecureShareModalProps {
  item: VaultItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function SecureShareModal({
  item,
  isOpen,
  onClose,
}: SecureShareModalProps) {
  const [includeUsername, setIncludeUsername] = useState(true);
  const [includePassword, setIncludePassword] = useState(true);
  const [includeNotes, setIncludeNotes] = useState(false);
  const [includeUrl, setIncludeUrl] = useState(false);
  const [expirationHours, setExpirationHours] = useState(24);
  const [oneTime, setOneTime] = useState(true);

  const [loading, setLoading] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !item) return null;

  const data = item.data as LoginData;

  const handleGenerateShare = async () => {
    setLoading(true);
    try {
      const expiresAt = new Date(
        Date.now() + expirationHours * 60 * 60 * 1000
      ).toISOString();

      const result = await createEncryptedShareLink({
        title: item.name,
        username: includeUsername ? data?.username : undefined,
        password: includePassword ? data?.password : undefined,
        notes: includeNotes ? data?.notes : undefined,
        url: includeUrl ? data?.url : undefined,
        expiresAt,
        oneTime,
      });

      setGeneratedUrl(result.shareUrl);
    } catch (err) {
      console.error('Erreur génération lien de partage:', err);
      alert('Impossible de générer le lien de partage.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!generatedUrl) return;
    try {
      await navigator.clipboard.writeText(generatedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (_) {}
  };

  const handleNativeShare = async () => {
    if (!generatedUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Secret chiffré : ${item.name}`,
          text: `Je vous ai partagé un secret chiffré à usage unique pour ${item.name} via KeoPass :`,
          url: generatedUrl,
        });
      } catch (_) {}
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* HEADER */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white dark:from-slate-850 dark:to-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                Partage Sécurisé & Éphémère
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[280px]">
                {item.name}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setGeneratedUrl(null);
              onClose();
            }}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENU */}
        <div className="p-5 space-y-4">
          {!generatedUrl ? (
            <>
              {/* ÉLÉMENTS À INCLURE */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
                  Données à inclure dans le secret chiffré :
                </label>
                <div className="space-y-1.5 bg-gray-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-gray-100 dark:border-slate-700">
                  {data?.password && (
                    <label className="flex items-center justify-between text-xs text-gray-800 dark:text-gray-200 cursor-pointer py-1">
                      <span className="font-semibold">Mot de passe</span>
                      <input
                        type="checkbox"
                        checked={includePassword}
                        onChange={(e) => setIncludePassword(e.target.checked)}
                        className="w-4 h-4 text-vault-600 rounded-md focus:ring-vault-500 cursor-pointer"
                      />
                    </label>
                  )}

                  {data?.username && (
                    <label className="flex items-center justify-between text-xs text-gray-800 dark:text-gray-200 cursor-pointer py-1">
                      <span>Identifiant / Email ({data.username})</span>
                      <input
                        type="checkbox"
                        checked={includeUsername}
                        onChange={(e) => setIncludeUsername(e.target.checked)}
                        className="w-4 h-4 text-vault-600 rounded-md focus:ring-vault-500 cursor-pointer"
                      />
                    </label>
                  )}

                  {data?.url && (
                    <label className="flex items-center justify-between text-xs text-gray-800 dark:text-gray-200 cursor-pointer py-1">
                      <span>Adresse URL du site</span>
                      <input
                        type="checkbox"
                        checked={includeUrl}
                        onChange={(e) => setIncludeUrl(e.target.checked)}
                        className="w-4 h-4 text-vault-600 rounded-md focus:ring-vault-500 cursor-pointer"
                      />
                    </label>
                  )}

                  {data?.notes && (
                    <label className="flex items-center justify-between text-xs text-gray-800 dark:text-gray-200 cursor-pointer py-1">
                      <span>Notes secrètes associées</span>
                      <input
                        type="checkbox"
                        checked={includeNotes}
                        onChange={(e) => setIncludeNotes(e.target.checked)}
                        className="w-4 h-4 text-vault-600 rounded-md focus:ring-vault-500 cursor-pointer"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* OPTIONS DE VALIDITÉ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* DURÉE D'EXPIRATION */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-vault-600" />
                    <span>Délai d'expiration</span>
                  </label>
                  <select
                    value={expirationHours}
                    onChange={(e) => setExpirationHours(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-vault-500 font-semibold"
                  >
                    <option value={1}>1 heure</option>
                    <option value={24}>24 heures (1 jour)</option>
                    <option value={72}>3 jours</option>
                    <option value={168}>7 jours</option>
                  </select>
                </div>

                {/* AUTODESTRUCTION USAGE UNIQUE */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-rose-500" />
                    <span>Autodestruction</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setOneTime(!oneTime)}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-between border ${
                      oneTime
                        ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                        : 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-slate-800 dark:text-gray-300 dark:border-slate-700'
                    }`}
                  >
                    <span>{oneTime ? 'Usage unique (1 vue)' : 'Vues multiples'}</span>
                    <span className="text-[10px] uppercase font-bold">
                      {oneTime ? 'Actif' : 'Désactivé'}
                    </span>
                  </button>
                </div>
              </div>

              {/* MENTION ZERO-KNOWLEDGE */}
              <div className="p-3 bg-amber-50/70 dark:bg-slate-800/40 rounded-2xl border border-amber-200/70 dark:border-slate-700 text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Chiffrement militaire de bout en bout :</strong> La clé de déchiffrement réside dans le fragment du lien (<code className="text-vault-600 font-mono">#k=...</code>) et n'est jamais transmise ni stockée en clair sur aucun serveur.
                </span>
              </div>

              {/* BOUTON GÉNÉRER */}
              <button
                onClick={handleGenerateShare}
                disabled={loading || (!includePassword && !includeUsername && !includeNotes)}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 text-white font-bold rounded-2xl text-xs transition shadow-md flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>{loading ? 'Chiffrement en cours...' : 'Générer le lien sécurisé'}</span>
              </button>
            </>
          ) : (
            /* ÉCRAN LIEN GÉNÉRÉ AVEC SUCCÈS */
            <div className="space-y-4 py-2 animate-in zoom-in-95">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-inner">
                  <Check className="w-6 h-6 stroke-[3]" />
                </div>
                <h4 className="font-extrabold text-base text-gray-900 dark:text-white pt-1">
                  Lien chiffré prêt à être partagé !
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                  Toute personne ayant ce lien pourra déchiffrer le secret depuis son navigateur sans créer de compte.
                </p>
              </div>

              {/* CHAMP URL */}
              <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-2xl border border-gray-200 dark:border-slate-700 space-y-2">
                <input
                  type="text"
                  readOnly
                  value={generatedUrl}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 px-3 py-2 rounded-xl text-xs font-mono text-gray-800 dark:text-gray-200 outline-none"
                />

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleCopyLink}
                    className={`py-2 px-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-2xs ${
                      copied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-vault-600 hover:bg-vault-700 text-white'
                    }`}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Lien copié !' : 'Copier le lien'}</span>
                  </button>

                  <button
                    onClick={handleNativeShare}
                    className="py-2 px-3 rounded-xl font-bold text-xs bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-650 text-gray-800 dark:text-gray-200 transition flex items-center justify-center gap-1.5"
                  >
                    <Send className="w-4 h-4" />
                    <span>Envoyer...</span>
                  </button>
                </div>
              </div>

              {/* RAPPEL EXPIRATION */}
              <div className="text-center text-[11px] text-gray-500 dark:text-gray-400">
                {oneTime
                  ? '🔥 Le secret s’autodétruira dès sa première ouverture ou après le délai.'
                  : `⏳ Valide pendant ${expirationHours}h.`}
              </div>

              <button
                onClick={() => setGeneratedUrl(null)}
                className="w-full py-2 text-center text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 font-semibold transition"
              >
                Générer un autre lien de partage
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
