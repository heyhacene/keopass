'use client';

import React, { useState, useMemo } from 'react';
import { useVault } from '@/lib/vaultContext';
import SetupVaultScreen from '@/components/SetupVaultScreen';
import UnlockScreen from '@/components/UnlockScreen';
import Navbar from '@/components/Navbar';
import VaultItemCard from '@/components/VaultItemCard';
import VaultItemModal from '@/components/VaultItemModal';
import PasswordGenerator from '@/components/PasswordGenerator';
import VaultSettingsModal from '@/components/VaultSettingsModal';
import ImportPasswordsModal from '@/components/ImportPasswordsModal';
import SupportChatbot from '@/components/SupportChatbot';
import SecurityAuditModal from '@/components/SecurityAuditModal';
import SecureShareModal from '@/components/SecureShareModal';
import ExtensionInstallModal from '@/components/ExtensionInstallModal';
import { VaultItem, VaultItemType } from '@/types/vault';
import {
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  CreditCard,
  FileText,
  Star,
  Clock,
  Plus,
  Search,
  Sparkles,
  Lock,
  Layers,
  X,
  AlertCircle,
  Fingerprint,
  Upload,
  Globe,
  ExternalLink,
  Bot,
  Puzzle,
  Keyboard,
} from 'lucide-react';
import { isBiometricAvailable, isBiometricConfigured } from '@/lib/biometrics';
import { getAutofillStatus, openAutofillSettings } from '@/lib/autofillSync';

type FilterCategory = 'all' | 'favorites' | 'login' | 'card' | 'note' | 'totp';

export default function HomePage() {
  const { isConfigured, isUnlocked, loading, items, enableBiometricsWithCurrentSession } = useVault();

  const [activeCategory, setActiveCategory] = useState<FilterCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDefaultType, setModalDefaultType] = useState<VaultItemType>('login');
  const [isGeneratorModalOpen, setIsGeneratorModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [sharedItem, setSharedItem] = useState<VaultItem | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isExtensionModalOpen, setIsExtensionModalOpen] = useState(false);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  // Bannière proposition biométrie
  const [showBioBanner, setShowBioBanner] = useState(false);
  const [enablingBio, setEnablingBio] = useState(false);
  const [bioSuccess, setBioSuccess] = useState(false);

  // Bannière proposition saisie automatique au-dessus du clavier (comme Samsung Pass)
  const [showAutofillBanner, setShowAutofillBanner] = useState(false);

  React.useEffect(() => {
    if (isUnlocked) {
      const configured = isBiometricConfigured();
      if (!configured) {
        isBiometricAvailable().then((avail) => {
          if (avail) setShowBioBanner(true);
        });
      }
      getAutofillStatus().then((status) => {
        if (status.supported && !status.isDefaultService) {
          setShowAutofillBanner(true);
        }
      });
    }
  }, [isUnlocked]);

  const handleQuickEnableBio = async () => {
    setEnablingBio(true);
    try {
      const res = await enableBiometricsWithCurrentSession();
      if (res.success) {
        setBioSuccess(true);
        setTimeout(() => setShowBioBanner(false), 2500);
      } else {
        alert(res.error || 'Impossible d’activer l’empreinte.');
      }
    } catch (err: any) {
      alert(err.message || 'Erreur lors de l’activation biométrique.');
    } finally {
      setEnablingBio(false);
    }
  };

  // Bascule du mode clair / sombre
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    if (!darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Filtrage et recherche
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // 1. Filtrage par corbeille
      if (item.deletedAt) return false;

      // 2. Filtrage par catégorie
      if (activeCategory === 'favorites' && !item.favorite) return false;
      if (activeCategory === 'login' && item.type !== 'login') return false;
      if (activeCategory === 'card' && item.type !== 'card') return false;
      if (activeCategory === 'note' && item.type !== 'note') return false;
      if (activeCategory === 'totp') {
        if (item.type !== 'login') return false;
        if (!(item.data as any).totpSecret) return false;
      }

      // 3. Recherche textuelle
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchName = item.name.toLowerCase().includes(query);
        let matchSub = false;

        if (item.type === 'login') {
          const d = item.data as any;
          matchSub =
            (d.username && d.username.toLowerCase().includes(query)) ||
            (d.url && d.url.toLowerCase().includes(query)) ||
            (d.notes && d.notes.toLowerCase().includes(query));
        } else if (item.type === 'card') {
          const d = item.data as any;
          matchSub =
            (d.cardholderName && d.cardholderName.toLowerCase().includes(query)) ||
            (d.cardNumber && d.cardNumber.includes(query));
        } else if (item.type === 'note') {
          const d = item.data as any;
          matchSub = d.content && d.content.toLowerCase().includes(query);
        }

        return matchName || matchSub;
      }

      return true;
    });
  }, [items, activeCategory, searchQuery]);

  // Compteurs par catégorie
  const counts = useMemo(() => {
    const activeItems = items.filter((i) => !i.deletedAt);
    return {
      all: activeItems.length,
      favorites: activeItems.filter((i) => i.favorite).length,
      login: activeItems.filter((i) => i.type === 'login').length,
      card: activeItems.filter((i) => i.type === 'card').length,
      note: activeItems.filter((i) => i.type === 'note').length,
      totp: activeItems.filter((i) => i.type === 'login' && (i.data as any).totpSecret).length,
    };
  }, [items]);

  // État de chargement initial
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-slate-900 text-gray-500">
        <div className="w-12 h-12 rounded-2xl bg-vault-600/20 text-vault-600 flex items-center justify-center animate-pulse mb-3">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <p className="text-xs font-semibold">Initialisation de l’environnement sécurisé...</p>
      </div>
    );
  }

  // 1. Si aucun coffre n'est configuré : écran d'onboarding
  if (!isConfigured) {
    return <SetupVaultScreen />;
  }

  // 2. Si le coffre est configuré mais verrouillé : écran de déverrouillage
  if (!isUnlocked) {
    return <UnlockScreen />;
  }

  // 3. Coffre déverrouillé : Interface complète
  const handleOpenAdd = (type: VaultItemType = 'login') => {
    setSelectedItem(null);
    setModalDefaultType(type);
    setIsModalOpen(true);
  };

  const handleSelectItem = (item: VaultItem) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-slate-900 transition-colors">
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenAddModal={() => handleOpenAdd('login')}
        onOpenGeneratorModal={() => setIsGeneratorModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onOpenImportModal={() => setIsImportModalOpen(true)}
        onOpenAuditModal={() => setIsAuditModalOpen(true)}
        onOpenSupportChatbot={() => setIsChatbotOpen(true)}
        onOpenExtensionModal={() => setIsExtensionModalOpen(true)}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        {/* BANNIÈRE PROPOSITION D'ACTIVATION EMPREINTE DIGITALE */}
        {showBioBanner && (
          <div className="mb-5 p-4 rounded-3xl bg-gradient-to-r from-vault-50 via-emerald-50 to-white dark:from-slate-800 dark:via-slate-800 dark:to-slate-850 border border-vault-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-vault-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-vault-600/30">
                <Fingerprint className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white">
                  {bioSuccess ? 'Empreinte digitale activée ! 🎉' : 'Déverrouillez votre coffre en 1 touche'}
                </h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  {bioSuccess
                    ? 'Vous pourrez désormais déverrouiller votre coffre avec votre empreinte.'
                    : 'Activez l’empreinte digitale (ou Face ID / Windows Hello) sur cet appareil.'}
                </p>
              </div>
            </div>

            {!bioSuccess && (
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={handleQuickEnableBio}
                  disabled={enablingBio}
                  className="py-2 px-3.5 bg-vault-600 hover:bg-vault-700 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  <Fingerprint className="w-3.5 h-3.5" />
                  <span>{enablingBio ? 'Posez votre doigt...' : 'Activer l’empreinte'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowBioBanner(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl transition"
                  title="Plus tard"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* BANNIÈRE PROPOSITION SAISIE AUTOMATIQUE CLAVIER */}
        {showAutofillBanner && (
          <div className="mb-5 p-4 rounded-3xl bg-gradient-to-r from-blue-50 via-indigo-50 to-white dark:from-slate-800 dark:via-slate-800 dark:to-slate-850 border border-blue-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-600/30">
                <Keyboard className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <span>Remplissage automatique au-dessus du clavier</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                    Comme Samsung Pass
                  </span>
                </h4>
                <p className="text-[11px] text-gray-600 dark:text-gray-300">
                  Affichez vos suggestions de connexion directement au-dessus des touches dans toutes vos applications et navigateurs.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button
                type="button"
                onClick={async () => {
                  await openAutofillSettings();
                  setShowAutofillBanner(false);
                }}
                className="py-2 px-3.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-2xl transition flex items-center gap-1.5 shadow-sm shadow-blue-600/20"
              >
                <Keyboard className="w-3.5 h-3.5" />
                <span>Activer</span>
                <ExternalLink className="w-3 h-3 opacity-80" />
              </button>
              <button
                type="button"
                onClick={() => setShowAutofillBanner(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl transition"
                title="Plus tard"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* BARRE DE RECHERCHE MOBILE */}
        <div className="sm:hidden mb-4 relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher..."
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-vault-500 outline-none"
          />
        </div>

        {/* DISPOSITION 2 COLONNES (SIDEBAR + LISTE) SUR DESKTOP */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* SIDEBAR NAVIGATION (DESKTOP) */}
          <aside className="hidden md:block md:col-span-1 space-y-2">
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-3 border border-gray-100 dark:border-slate-750 shadow-xs space-y-1">
              <button
                type="button"
                onClick={() => setActiveCategory('all')}
                className={`w-full p-2.5 rounded-2xl text-xs font-bold transition flex items-center justify-between ${
                  activeCategory === 'all'
                    ? 'bg-vault-50 dark:bg-vault-950/50 text-vault-700 dark:text-vault-300'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-750'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  <span>Tous les éléments</span>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-700">
                  {counts.all}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveCategory('favorites')}
                className={`w-full p-2.5 rounded-2xl text-xs font-bold transition flex items-center justify-between ${
                  activeCategory === 'favorites'
                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-750'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500" />
                  <span>Favoris</span>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-700">
                  {counts.favorites}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveCategory('login')}
                className={`w-full p-2.5 rounded-2xl text-xs font-bold transition flex items-center justify-between ${
                  activeCategory === 'login'
                    ? 'bg-vault-50 dark:bg-vault-950/50 text-vault-700 dark:text-vault-300'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-750'
                }`}
              >
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-vault-600" />
                  <span>Identifiants</span>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-700">
                  {counts.login}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveCategory('card')}
                className={`w-full p-2.5 rounded-2xl text-xs font-bold transition flex items-center justify-between ${
                  activeCategory === 'card'
                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-750'
                }`}
              >
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-amber-500" />
                  <span>Cartes bancaires</span>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-700">
                  {counts.card}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveCategory('note')}
                className={`w-full p-2.5 rounded-2xl text-xs font-bold transition flex items-center justify-between ${
                  activeCategory === 'note'
                    ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-750'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-500" />
                  <span>Notes sécurisées</span>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-700">
                  {counts.note}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveCategory('totp')}
                className={`w-full p-2.5 rounded-2xl text-xs font-bold transition flex items-center justify-between ${
                  activeCategory === 'totp'
                    ? 'bg-shield-50 dark:bg-shield-950/40 text-shield-700 dark:text-shield-300'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-750'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-shield-500" />
                  <span>Codes 2FA</span>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-700">
                  {counts.totp}
                </span>
              </button>
            </div>

            {/* BOUTON D'AJOUT RAPIDE ET D'IMPORT EN SIDEBAR */}
            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={() => handleOpenAdd('login')}
                className="w-full py-3 bg-vault-600 hover:bg-vault-700 text-white font-bold rounded-2xl text-xs transition flex items-center justify-center gap-2 shadow-sm shadow-vault-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter un élément</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAuditModalOpen(true)}
                className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 font-bold rounded-2xl text-xs transition flex items-center justify-center gap-2 border border-rose-200 dark:border-rose-800/60 shadow-xs"
              >
                <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span>Audit de santé & Fuites</span>
              </button>

              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="w-full py-2.5 bg-gray-50 hover:bg-emerald-50 dark:bg-slate-750 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 hover:text-emerald-700 dark:hover:text-emerald-400 font-bold rounded-2xl text-xs transition flex items-center justify-center gap-2 border border-gray-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700/60"
              >
                <Upload className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Importer des mots de passe</span>
              </button>

              <a
                href="https://keopass.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 bg-blue-50/70 hover:bg-blue-100/80 dark:bg-slate-750 dark:hover:bg-slate-700 text-blue-700 dark:text-blue-300 font-bold rounded-2xl text-xs transition flex items-center justify-center gap-2 border border-blue-200/80 dark:border-blue-800/60"
              >
                <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Version Web (Vercel)</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </a>

              <button
                type="button"
                onClick={() => setIsExtensionModalOpen(true)}
                className="w-full py-2.5 bg-indigo-50/70 hover:bg-indigo-100/80 dark:bg-slate-750 dark:hover:bg-slate-700 text-indigo-700 dark:text-indigo-300 font-bold rounded-2xl text-xs transition flex items-center justify-center gap-2 border border-indigo-200/80 dark:border-indigo-800/60"
              >
                <Puzzle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Extension PC (Chrome/Edge)</span>
              </button>

              <button
                type="button"
                onClick={() => setIsChatbotOpen(true)}
                className="w-full py-2.5 bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 dark:from-slate-750 dark:to-slate-700 dark:hover:bg-slate-700 text-emerald-800 dark:text-emerald-300 font-bold rounded-2xl text-xs transition flex items-center justify-center gap-2 border border-emerald-300 dark:border-emerald-700/60 shadow-xs"
              >
                <Bot className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Assistant Support Keo</span>
              </button>
            </div>
          </aside>

          {/* CONTENU PRINCIPAL */}
          <div className="col-span-1 md:col-span-3 space-y-4">
            {/* PILLS CATÉGORIES SUR MOBILE */}
            <div className="md:hidden flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <button
                type="button"
                onClick={() => setActiveCategory('all')}
                className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition ${
                  activeCategory === 'all'
                    ? 'bg-vault-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-slate-750'
                }`}
              >
                Tous ({counts.all})
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory('favorites')}
                className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition ${
                  activeCategory === 'favorites'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-slate-750'
                }`}
              >
                Favoris ({counts.favorites})
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory('login')}
                className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition ${
                  activeCategory === 'login'
                    ? 'bg-vault-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-slate-750'
                }`}
              >
                Mots de passe ({counts.login})
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory('card')}
                className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition ${
                  activeCategory === 'card'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-slate-750'
                }`}
              >
                Cartes ({counts.card})
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory('note')}
                className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition ${
                  activeCategory === 'note'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-slate-750'
                }`}
              >
                Notes ({counts.note})
              </button>
            </div>

            {/* EN-TÊTE DE LA LISTE */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold text-gray-900 dark:text-white capitalize">
                  {activeCategory === 'all'
                    ? 'Tous les éléments'
                    : activeCategory === 'favorites'
                    ? 'Éléments favoris'
                    : activeCategory === 'login'
                    ? 'Identifiants & Mots de passe'
                    : activeCategory === 'card'
                    ? 'Cartes bancaires'
                    : activeCategory === 'note'
                    ? 'Notes sécurisées'
                    : 'Codes 2FA (TOTP)'}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {filteredItems.length} élément{filteredItems.length > 1 ? 's' : ''} trouvé{filteredItems.length > 1 ? 's' : ''}
                </p>
              </div>

              {/* Raccourci d'ajout sur mobile */}
              <button
                type="button"
                onClick={() => handleOpenAdd('login')}
                className="md:hidden py-2 px-3 bg-vault-600 hover:bg-vault-700 text-white font-bold rounded-xl text-xs transition flex items-center gap-1 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter</span>
              </button>
            </div>

            {/* LISTE DES CARTES OU ÉTAT VIDE */}
            {filteredItems.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-gray-100 dark:border-slate-750 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-500 mx-auto flex items-center justify-center">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                    {searchQuery ? 'Aucun résultat trouvé' : 'Votre coffre est vide'}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                    {searchQuery
                      ? 'Essayez avec un autre mot-clé ou vérifiez la catégorie sélectionnée.'
                      : 'Commencez à protéger vos comptes en ajoutant votre premier identifiant ou carte bancaire.'}
                  </p>
                </div>
                {!searchQuery && (
                  <button
                    type="button"
                    onClick={() => handleOpenAdd('login')}
                    className="py-2.5 px-5 bg-vault-600 hover:bg-vault-700 text-white font-bold rounded-2xl text-xs transition inline-flex items-center gap-1.5 shadow-sm shadow-vault-600/30"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Ajouter mon premier mot de passe</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredItems.map((item) => (
                  <VaultItemCard
                    key={item.id}
                    item={item}
                    onSelect={handleSelectItem}
                    onShare={(it) => {
                      setSharedItem(it);
                      setIsShareModalOpen(true);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* MODALE DE CRÉATION / ÉDITION D'ÉLÉMENT */}
      <VaultItemModal
        item={selectedItem}
        isOpen={isModalOpen}
        defaultType={modalDefaultType}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedItem(null);
        }}
        onShare={(it) => {
          setIsModalOpen(false);
          setSharedItem(it);
          setIsShareModalOpen(true);
        }}
      />

      {/* MODALE DU GÉNÉRATEUR FLOTTANT */}
      {isGeneratorModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full relative">
            <button
              type="button"
              onClick={() => setIsGeneratorModalOpen(false)}
              className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white rounded-full bg-black/40 transition"
            >
              <X className="w-5 h-5" />
            </button>
            <PasswordGenerator />
          </div>
        </div>
      )}

      {/* MODALE DES PARAMÈTRES & SAUVEGARDES */}
      <VaultSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onOpenImport={() => {
          setIsSettingsModalOpen(false);
          setIsImportModalOpen(true);
        }}
        onOpenAudit={() => {
          setIsSettingsModalOpen(false);
          setIsAuditModalOpen(true);
        }}
        onOpenSupportChatbot={() => {
          setIsSettingsModalOpen(false);
          setIsChatbotOpen(true);
        }}
        onOpenExtension={() => {
          setIsSettingsModalOpen(false);
          setIsExtensionModalOpen(true);
        }}
      />

      {/* MODALE D'INSTALLATION EXTENSION PC */}
      <ExtensionInstallModal
        isOpen={isExtensionModalOpen}
        onClose={() => setIsExtensionModalOpen(false)}
      />

      {/* MODALE D'AUDIT DE SÉCURITÉ & DE SANTÉ */}
      <SecurityAuditModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        items={items}
        onEditItem={(item) => {
          setSelectedItem(item);
          setIsModalOpen(true);
        }}
      />

      {/* MODALE DE PARTAGE SÉCURISÉ ÉPHÉMÈRE */}
      <SecureShareModal
        item={sharedItem}
        isOpen={isShareModalOpen}
        onClose={() => {
          setIsShareModalOpen(false);
          setSharedItem(null);
        }}
      />

      {/* MODALE D'IMPORTATION DE MOTS DE PASSE */}
      <ImportPasswordsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />

      {/* ASSISTANT CHATBOT DE SUPPORT */}
      <SupportChatbot
        isOpen={isChatbotOpen}
        onToggle={setIsChatbotOpen}
        onOpenImport={() => setIsImportModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenGenerator={() => setIsGeneratorModalOpen(true)}
        onOpenAudit={() => setIsAuditModalOpen(true)}
      />
    </div>
  );
}
