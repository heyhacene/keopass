'use client';

import React from 'react';
import { useVault } from '@/lib/vaultContext';
import {
  ShieldCheck,
  Lock,
  Plus,
  KeyRound,
  Search,
  Moon,
  Sun,
  Settings,
  Upload,
  Smartphone,
} from 'lucide-react';

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenAddModal: () => void;
  onOpenGeneratorModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenImportModal?: () => void;
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
  darkMode,
  onToggleDarkMode,
}: NavbarProps) {
  const { isUnlocked, lockVault } = useVault();

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-100 dark:border-slate-800">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        {/* LOGO & TITRE */}
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-vault-600 to-emerald-400 text-white flex items-center justify-center shadow-md shadow-vault-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-extrabold text-base tracking-tight text-gray-900 dark:text-white">
                KeoPass
              </h1>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-vault-100 dark:bg-vault-950/80 text-vault-700 dark:text-vault-300">
                AES-256
              </span>
            </div>
            <p className="text-[10px] text-gray-400 dark:text-slate-500 hidden sm:block">
              Coffre-fort chiffré de bout en bout
            </p>
          </div>
        </div>

        {/* BARRE DE RECHERCHE CENTRALE (QUAND DÉVERROUILLÉ) */}
        {isUnlocked && (
          <div className="flex-1 max-w-md relative hidden sm:block">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Rechercher un identifiant, une carte, une note..."
              className="w-full pl-9 pr-4 py-2 bg-gray-100 dark:bg-slate-800 border-none rounded-xl text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-vault-500 outline-none"
            />
          </div>
        )}

        {/* ACTIONS & BOUTONS */}
        <div className="flex items-center gap-2">
          {/* BOUTON GÉNÉRATEUR */}
          <button
            type="button"
            onClick={onOpenGeneratorModal}
            className="p-2 sm:px-3 sm:py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            title="Ouvrir le générateur de mot de passe"
          >
            <KeyRound className="w-4 h-4 text-vault-600 dark:text-vault-400" />
            <span className="hidden sm:inline">Générateur</span>
          </button>

          {/* AJOUTER ÉLÉMENT */}
          {isUnlocked && (
            <button
              type="button"
              onClick={onOpenAddModal}
              className="p-2 sm:px-3 sm:py-2 bg-vault-600 hover:bg-vault-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-vault-600/30"
              title="Ajouter un mot de passe ou une carte"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nouveau</span>
            </button>
          )}

          {/* IMPORTER MOTS DE PASSE */}
          {isUnlocked && onOpenImportModal && (
            <button
              type="button"
              onClick={onOpenImportModal}
              className="p-2 sm:px-3 sm:py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-800/60"
              title="Importer des mots de passe (Chrome, Firefox, Bitwarden, Total Adblock, etc.)"
            >
              <Upload className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden md:inline">Importer</span>
            </button>
          )}

          {/* PARAMÈTRES DU COFFRE */}
          {isUnlocked && (
            <button
              type="button"
              onClick={onOpenSettingsModal}
              className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition"
              title="Paramètres & Sauvegardes"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}

          {/* THÈME CLAIR / SOMBRE */}
          <button
            type="button"
            onClick={onToggleDarkMode}
            className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition"
            title="Changer de thème"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* VERROUILLER */}
          {isUnlocked && (
            <button
              type="button"
              onClick={lockVault}
              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition flex items-center gap-1 text-xs font-bold"
              title="Verrouiller immédiatement le coffre"
            >
              <Lock className="w-4 h-4" />
              <span className="hidden md:inline">Verrouiller</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
