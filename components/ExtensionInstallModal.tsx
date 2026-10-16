'use client';

import React, { useState } from 'react';
import {
  Download,
  X,
  ExternalLink,
  Puzzle,
  CheckCircle,
  Copy,
  Check,
  Chrome,
  ShieldCheck,
  ArrowRight,
  Layers,
} from 'lucide-react';

interface ExtensionInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ExtensionInstallModal({
  isOpen,
  onClose,
}: ExtensionInstallModalProps) {
  const [copiedUrl, setCopiedUrl] = useState(false);

  if (!isOpen) return null;

  const copyChromeUrl = async () => {
    try {
      await navigator.clipboard.writeText('chrome://extensions');
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch (_) {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
        {/* HEADER */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white dark:from-slate-850 dark:to-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Puzzle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                Extension Navigateur PC
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Google Chrome, Microsoft Edge, Brave & Vivaldi
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENU */}
        <div className="p-5 space-y-4 overflow-y-auto max-h-[75vh]">
          {/* BANDEAU PRÉSENTATION */}
          <div className="p-3.5 bg-gradient-to-r from-indigo-50/80 to-vault-50/80 dark:from-slate-800 dark:to-slate-800 rounded-2xl border border-indigo-100 dark:border-slate-700 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs leading-relaxed text-gray-700 dark:text-gray-300">
              <p className="font-bold text-gray-900 dark:text-white">
                Remplissage automatique & Connexion en 1 clic sur PC
              </p>
              <p className="text-[11px]">
                L'extension KeoPass détecte les champs de connexion sur vos sites web préférés et propose d'insérer vos identifiants sans jamais exposer votre clé maîtresse.
              </p>
            </div>
          </div>

          {/* BOUTON DE TÉLÉCHARGEMENT DIRECT */}
          <a
            href="/keopass-extension.zip"
            download="keopass-extension.zip"
            className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-vault-600 hover:from-indigo-700 hover:to-vault-700 text-white font-bold rounded-2xl text-xs transition shadow-md flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Télécharger l'Extension (.ZIP)</span>
          </a>

          {/* GUIDE D'INSTALLATION EN 3 ÉTAPES */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Installation en 30 secondes (sans store) :
            </h4>

            <div className="space-y-2.5">
              {/* ÉTAPE 1 */}
              <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-slate-700 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  1
                </span>
                <div className="text-xs space-y-1">
                  <p className="font-bold text-gray-900 dark:text-white">
                    Téléchargez et décompressez le fichier ZIP
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Faites un clic droit sur le fichier <code className="text-vault-600 font-mono">keopass-extension.zip</code> téléchargé, puis choisissez <strong>« Extraire tout... »</strong>.
                  </p>
                </div>
              </div>

              {/* ÉTAPE 2 */}
              <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-slate-700 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  2
                </span>
                <div className="text-xs space-y-1.5 flex-1">
                  <p className="font-bold text-gray-900 dark:text-white">
                    Ouvrez la page des extensions de votre navigateur
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Dans Chrome, Edge ou Brave, collez cette adresse dans la barre d'URL :
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="px-2 py-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-xs font-mono text-gray-800 dark:text-gray-200">
                      chrome://extensions
                    </code>
                    <button
                      onClick={copyChromeUrl}
                      className="px-2 py-1 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 text-gray-700 dark:text-gray-200 rounded-lg text-[10px] font-bold transition flex items-center gap-1"
                    >
                      {copiedUrl ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedUrl ? 'Copié' : 'Copier'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* ÉTAPE 3 */}
              <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-slate-700 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  3
                </span>
                <div className="text-xs space-y-1">
                  <p className="font-bold text-gray-900 dark:text-white">
                    Activez le Mode Développeur & Chargez le dossier
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    En haut à droite de la page, activez l'interrupteur <strong>« Mode développeur »</strong>, puis cliquez sur <strong>« Charger le dossier décompressé »</strong> en haut à gauche et sélectionnez le dossier extrait.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-5 py-3 border-t border-gray-100 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-900/80 flex items-center justify-between">
          <span className="text-[11px] text-gray-400">
            Manifest V3 • Chrome / Edge / Brave
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-200 dark:bg-slate-800 hover:bg-gray-300 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-200 font-bold rounded-xl transition text-xs"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
