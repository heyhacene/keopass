'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useVault } from '@/lib/vaultContext';
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Plus,
  KeyRound,
  Search,
  Moon,
  Sun,
  Settings,
  Upload,
  Globe,
  Bot,
  Puzzle,
  ChevronDown,
  Sparkles,
} from 'lucide-react';

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenAddModal: () => void;
  onOpenGeneratorModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenImportModal?: () => void;
  onOpenAuditModal?: () => void;
  onOpenSupportChatbot?: () => void;
  onOpenExtensionModal?: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export default function Navbar({
  searchQuery,
  onSearchChange,
  onOpenAddModal,
  onOpenGeneratorModal,
  onOpenSettingsModal,
  onOpenImportModal,
  onOpenAuditModal,
  onOpenSupportChatbot,
  onOpenExtensionModal,
  darkMode,
  onToggleDarkMode,
}: NavbarProps) {
  const { isUnlocked, lockVault } = useVault();
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fermer le menu lors d'un clic extérieur
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsToolsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 transition-colors">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        {/* LOGO & TITRE ÉPURÉ */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-vault-600 to-emerald-400 text-white flex items-center justify-center shadow-sm shadow-vault-500/25">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-extrabold text-base tracking-tight text-gray-900 dark:text-white">
                KeoPass
              </h1>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-vault-50 dark:bg-vault-950/80 text-vault-600 dark:text-vault-400 border border-vault-200/50 dark:border-vault-800/40">
                Zero-Knowledge
              </span>
            </div>
          </div>
        </div>

        {/* BARRE DE RECHERCHE CENTRALE (DESKTOP) */}
        {isUnlocked && (
          <div className="flex-1 max-w-md relative hidden md:block">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Rechercher par nom, site, identifiant..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 hover:bg-gray-100/80 dark:bg-slate-800/80 dark:hover:bg-slate-800 border border-gray-200/70 dark:border-slate-700/60 rounded-2xl text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-vault-500 outline-none transition"
            />
          </div>
        )}

        {/* ACTIONS PRINCIPALES & MENU GROUPÉ */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* BOUTON PRINCIPAL + NOUVEAU */}
          {isUnlocked && (
            <button
              type="button"
              onClick={onOpenAddModal}
              className="px-3 py-2 bg-vault-600 hover:bg-vault-700 text-white rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-vault-600/30 active:scale-95"
              title="Ajouter un mot de passe ou une carte"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau</span>
            </button>
          )}

          {/* GÉNÉRATEUR RAPIDE */}
          <button
            type="button"
            onClick={onOpenGeneratorModal}
            className="p-2 sm:px-3 sm:py-2 bg-gray-50 hover:bg-gray-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 border border-gray-200/60 dark:border-slate-700/60"
            title="Générateur de mot de passe"
          >
            <KeyRound className="w-4 h-4 text-vault-600 dark:text-vault-400" />
            <span className="hidden sm:inline">Générateur</span>
          </button>

          {/* MENU DÉROULANT ÉPURÉ "OUTILS & FONCTIONNALITÉS" */}
          {isUnlocked && (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsToolsOpen(!isToolsOpen)}
                className={`p-2 sm:px-3 sm:py-2 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 border ${
                  isToolsOpen
                    ? 'bg-vault-50 dark:bg-slate-800 text-vault-700 dark:text-vault-300 border-vault-200 dark:border-slate-700'
                    : 'bg-gray-50 hover:bg-gray-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 border-gray-200/60 dark:border-slate-700/60'
                }`}
                title="Outils et fonctionnalités avancées"
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span className="hidden sm:inline">Outils</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isToolsOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* POPUP DU MENU OUTILS */}
              {isToolsOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-700 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400">
                    Outils Avancés
                  </div>

                  {onOpenAuditModal && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsToolsOpen(false);
                        onOpenAuditModal();
                      }}
                      className="w-full px-3 py-2.5 rounded-2xl text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700 dark:hover:text-rose-300 transition flex items-center gap-2.5 text-left"
                    >
                      <div className="w-7 h-7 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                        <ShieldAlert className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-bold">Audit de santé &amp; Fuites</div>
                        <div className="text-[10px] text-gray-400 dark:text-gray-400">Vérification HaveIBeenPwned</div>
                      </div>
                    </button>
                  )}

                  {onOpenImportModal && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsToolsOpen(false);
                        onOpenImportModal();
                      }}
                      className="w-full px-3 py-2.5 rounded-2xl text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-300 transition flex items-center gap-2.5 text-left"
                    >
                      <div className="w-7 h-7 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <Upload className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-bold">Importer des mots de passe</div>
                        <div className="text-[10px] text-gray-400 dark:text-gray-400">Chrome, Bitwarden, Firefox...</div>
                      </div>
                    </button>
                  )}

                  {onOpenExtensionModal && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsToolsOpen(false);
                        onOpenExtensionModal();
                      }}
                      className="w-full px-3 py-2.5 rounded-2xl text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-700 dark:hover:text-indigo-300 transition flex items-center gap-2.5 text-left"
                    >
                      <div className="w-7 h-7 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <Puzzle className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-bold">Extension Navigateur PC</div>
                        <div className="text-[10px] text-gray-400 dark:text-gray-400">Chrome, Edge, Brave, Vivaldi</div>
                      </div>
                    </button>
                  )}

                  {onOpenSupportChatbot && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsToolsOpen(false);
                        onOpenSupportChatbot();
                      }}
                      className="w-full px-3 py-2.5 rounded-2xl text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-teal-50 dark:hover:bg-teal-950/40 hover:text-teal-700 dark:hover:text-teal-300 transition flex items-center gap-2.5 text-left"
                    >
                      <div className="w-7 h-7 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                        <Bot className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-bold">Assistant Support Keo</div>
                        <div className="text-[10px] text-gray-400 dark:text-gray-400">Aide interactive &amp; conseils</div>
                      </div>
                    </button>
                  )}

                  <a
                    href="https://keopass.vercel.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsToolsOpen(false)}
                    className="w-full px-3 py-2.5 rounded-2xl text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-700 dark:hover:text-blue-300 transition flex items-center gap-2.5 text-left"
                  >
                    <div className="w-7 h-7 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <Globe className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="font-bold">Version Web</div>
                      <div className="text-[10px] text-gray-400 dark:text-gray-400">keopass.vercel.app</div>
                    </div>
                  </a>
                </div>
              )}
            </div>
          )}

          {/* SÉPARATEUR */}
          <div className="h-5 w-px bg-gray-200 dark:bg-slate-700 mx-0.5" />

          {/* PARAMÈTRES DU COFFRE */}
          {isUnlocked && (
            <button
              type="button"
              onClick={onOpenSettingsModal}
              className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 rounded-2xl transition"
              title="Paramètres &amp; Empreinte"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}

          {/* THÈME CLAIR / SOMBRE */}
          <button
            type="button"
            onClick={onToggleDarkMode}
            className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 rounded-2xl transition"
            title="Changer de thème"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* VERROUILLER */}
          {isUnlocked && (
            <button
              type="button"
              onClick={lockVault}
              className="p-2 text-red-500 hover:text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-2xl transition"
              title="Verrouiller le coffre"
            >
              <Lock className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
