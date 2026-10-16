'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Shield,
  AlertTriangle,
  RefreshCw,
  X,
  Copy,
  ExternalLink,
  KeyRound,
  Check,
  Search,
  Filter,
  Sparkles,
  Info,
  ChevronRight,
  Eye,
  EyeOff,
} from 'lucide-react';
import { VaultItem } from '@/types/vault';
import {
  runVaultSecurityAudit,
  VaultAuditReport,
  AuditResultItem,
} from '@/lib/passwordAudit';

interface SecurityAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: VaultItem[];
  onEditItem: (item: VaultItem) => void;
}

export default function SecurityAuditModal({
  isOpen,
  onClose,
  items,
  onEditItem,
}: SecurityAuditModalProps) {
  const [report, setReport] = useState<VaultAuditReport | null>(null);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState({ processed: 0, total: 0 });
  const [selectedFilter, setSelectedFilter] = useState<
    'all' | 'breached' | 'reused' | 'weak' | 'strong'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});

  // Lancer l'analyse lors de la première ouverture si aucun rapport n'existe
  useEffect(() => {
    if (isOpen && !report && !scanning) {
      handleStartScan();
    }
  }, [isOpen]);

  const handleStartScan = async () => {
    setScanning(true);
    setProgress({ processed: 0, total: items.length });

    try {
      const result = await runVaultSecurityAudit(items, (processed, total) => {
        setProgress({ processed, total });
      });
      setReport(result);
    } catch (err) {
      console.error('Erreur audit de sécurité:', err);
    } finally {
      setScanning(false);
    }
  };

  const toggleRevealPassword = (id: string) => {
    setRevealedPasswords((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  if (!isOpen) return null;

  // Filtrage des éléments affichés
  const filteredItems = (report?.items || []).filter((itemResult) => {
    const matchesSearch =
      itemResult.item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ((itemResult.item.data as any)?.username || '')
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedFilter === 'breached') return itemResult.isBreached;
    if (selectedFilter === 'reused') return itemResult.isReused;
    if (selectedFilter === 'weak') return itemResult.strength === 'weak';
    if (selectedFilter === 'strong') return itemResult.strength === 'strong';
    return true;
  });

  const score = report?.overallScore ?? 100;
  const isHealthy = score >= 80;
  const isMedium = score >= 60 && score < 80;
  const isCritical = score < 60;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* HEADER */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white dark:from-slate-850 dark:to-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-primary-100 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-tight">
                Audit de Santé & Fuites de Données
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Analyse Zero-Knowledge via le protocole sécurisé k-Anonymat
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleStartScan}
              disabled={scanning}
              className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-slate-800 transition disabled:opacity-50"
              title="Relancer l'analyse complète"
            >
              <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin text-primary-600' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PROGRESSION DE SCAN SI EN COURS */}
        {scanning && (
          <div className="bg-primary-50 dark:bg-primary-950/40 px-5 py-3 border-b border-primary-100 dark:border-primary-900/50 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-primary-700 dark:text-primary-300">
              <span className="flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Vérification k-anonymat des fuites et de la robustesse...
              </span>
              <span>
                {progress.processed} / {progress.total}
              </span>
            </div>
            <div className="w-full bg-primary-200 dark:bg-primary-900 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-primary-600 h-1.5 rounded-full transition-all duration-200"
                style={{
                  width: `${progress.total ? (progress.processed / progress.total) * 100 : 0}%`,
                }}
              ></div>
            </div>
          </div>
        )}

        {/* CONTENU PRINCIPAL DÉFILANT */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* BANDEAU SCORE GLOBAL & MÉTRIQUES */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* CARTE SCORE */}
            <div
              className={`p-4 rounded-3xl border flex items-center gap-4 ${
                isHealthy
                  ? 'bg-emerald-50/70 border-emerald-200/80 dark:bg-emerald-950/20 dark:border-emerald-900/50'
                  : isMedium
                  ? 'bg-amber-50/70 border-amber-200/80 dark:bg-amber-950/20 dark:border-amber-900/50'
                  : 'bg-rose-50/70 border-rose-200/80 dark:bg-rose-950/20 dark:border-rose-900/50'
              }`}
            >
              <div className="relative w-16 h-16 flex items-center justify-center flex-shrink-0">
                <svg className="w-16 h-16 transform -rotate-90">
                  <circle
                    cx="32"
                    cy="32"
                    r="26"
                    className="stroke-gray-200 dark:stroke-slate-800"
                    strokeWidth="5"
                    fill="none"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="26"
                    className={
                      isHealthy
                        ? 'stroke-emerald-500'
                        : isMedium
                        ? 'stroke-amber-500'
                        : 'stroke-rose-500'
                    }
                    strokeWidth="5"
                    strokeDasharray="163.3"
                    strokeDashoffset={163.3 - (163.3 * score) / 100}
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
                <span className="absolute text-sm font-extrabold text-gray-900 dark:text-white">
                  {score}%
                </span>
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Score de Santé
                </span>
                <h3 className="text-base font-extrabold text-gray-900 dark:text-white">
                  {isHealthy
                    ? 'Excellente sécurité'
                    : isMedium
                    ? 'Sécurité moyenne'
                    : 'Risques détectés'}
                </h3>
                <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-tight">
                  {report?.breachedCount
                    ? `${report.breachedCount} mot(s) de passe trouvé(s) dans des fuites`
                    : 'Aucun mot de passe dans les fuites publiques'}
                </p>
              </div>
            </div>

            {/* STATISTIQUES RÉSUMÉES */}
            <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* COMPROMIS */}
              <button
                onClick={() => setSelectedFilter('breached')}
                className={`p-3 rounded-2xl border text-left transition ${
                  selectedFilter === 'breached'
                    ? 'ring-2 ring-rose-500 bg-rose-50 dark:bg-rose-950/40 border-rose-300'
                    : 'bg-white dark:bg-slate-800/80 border-gray-100 dark:border-slate-800 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 mb-1">
                  <ShieldAlert className="w-4 h-4" />
                  <span className="text-lg font-extrabold">
                    {report?.breachedCount ?? 0}
                  </span>
                </div>
                <div className="text-[11px] font-bold text-gray-900 dark:text-white">
                  Fuites publiques
                </div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400">
                  À changer d'urgence
                </div>
              </button>

              {/* RÉUTILISÉS */}
              <button
                onClick={() => setSelectedFilter('reused')}
                className={`p-3 rounded-2xl border text-left transition ${
                  selectedFilter === 'reused'
                    ? 'ring-2 ring-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-300'
                    : 'bg-white dark:bg-slate-800/80 border-gray-100 dark:border-slate-800 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-1">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-lg font-extrabold">
                    {report?.reusedCount ?? 0}
                  </span>
                </div>
                <div className="text-[11px] font-bold text-gray-900 dark:text-white">
                  Réutilisés
                </div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400">
                  Doublons détectés
                </div>
              </button>

              {/* FAIBLES */}
              <button
                onClick={() => setSelectedFilter('weak')}
                className={`p-3 rounded-2xl border text-left transition ${
                  selectedFilter === 'weak'
                    ? 'ring-2 ring-orange-500 bg-orange-50 dark:bg-orange-950/40 border-orange-300'
                    : 'bg-white dark:bg-slate-800/80 border-gray-100 dark:border-slate-800 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between text-orange-600 dark:text-orange-400 mb-1">
                  <KeyRound className="w-4 h-4" />
                  <span className="text-lg font-extrabold">
                    {report?.weakCount ?? 0}
                  </span>
                </div>
                <div className="text-[11px] font-bold text-gray-900 dark:text-white">
                  Faibles
                </div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400">
                  Moins de 10 car.
                </div>
              </button>

              {/* ROBUSTES */}
              <button
                onClick={() => setSelectedFilter('strong')}
                className={`p-3 rounded-2xl border text-left transition ${
                  selectedFilter === 'strong'
                    ? 'ring-2 ring-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300'
                    : 'bg-white dark:bg-slate-800/80 border-gray-100 dark:border-slate-800 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-1">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="text-lg font-extrabold">
                    {report?.strongCount ?? 0}
                  </span>
                </div>
                <div className="text-[11px] font-bold text-gray-900 dark:text-white">
                  Sécurisés
                </div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400">
                  Excellente robustesse
                </div>
              </button>
            </div>
          </div>

          {/* EXPLICATION DU K-ANONYMAT ZERO-KNOWLEDGE */}
          <div className="bg-gray-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-gray-100 dark:border-slate-700/60 flex items-start gap-2.5 text-xs text-gray-600 dark:text-gray-300">
            <Info className="w-4 h-4 text-primary-600 dark:text-primary-400 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed text-[11px]">
              <strong className="text-gray-900 dark:text-white">Garantie Zero-Knowledge :</strong> Vos mots de passe ne quittent jamais votre appareil. Nous hachons vos mots de passe avec l'algorithme SHA-1 et n'envoyons que les 5 premiers caractères à HaveIBeenPwned. L'analyse finale s'opère en mémoire RAM locale.
            </p>
          </div>

          {/* BARRE DE RECHERCHE ET ONGLETS DE FILTRE */}
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher parmi les identifiants analysés..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
              <button
                onClick={() => setSelectedFilter('all')}
                className={`text-[11px] px-2.5 py-1 rounded-xl font-semibold transition ${
                  selectedFilter === 'all'
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                }`}
              >
                Tous ({report?.totalLogins ?? 0})
              </button>
              <button
                onClick={() => setSelectedFilter('breached')}
                className={`text-[11px] px-2.5 py-1 rounded-xl font-semibold transition ${
                  selectedFilter === 'breached'
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100'
                }`}
              >
                Fuites ({report?.breachedCount ?? 0})
              </button>
              <button
                onClick={() => setSelectedFilter('reused')}
                className={`text-[11px] px-2.5 py-1 rounded-xl font-semibold transition ${
                  selectedFilter === 'reused'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100'
                }`}
              >
                Doublons ({report?.reusedCount ?? 0})
              </button>
              <button
                onClick={() => setSelectedFilter('weak')}
                className={`text-[11px] px-2.5 py-1 rounded-xl font-semibold transition ${
                  selectedFilter === 'weak'
                    ? 'bg-orange-600 text-white'
                    : 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 hover:bg-orange-100'
                }`}
              >
                Faibles ({report?.weakCount ?? 0})
              </button>
            </div>
          </div>

          {/* LISTE DES IDENTIFIANTS ANALYSÉS */}
          <div className="space-y-2.5">
            {filteredItems.length === 0 ? (
              <div className="text-center py-10 bg-gray-50/50 dark:bg-slate-800/30 rounded-3xl border border-dashed border-gray-200 dark:border-slate-800 p-6">
                <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
                <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                  Aucun élément dans cette catégorie !
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
                  {selectedFilter === 'breached'
                    ? 'Félicitations ! Aucun de vos identifiants ne figure dans les bases de fuites de données connues.'
                    : 'Tous vos mots de passe respectent les critères de sécurité pour ce filtre.'}
                </p>
              </div>
            ) : (
              filteredItems.map((itemResult) => {
                const item = itemResult.item;
                const data = item.data as any;
                const isRevealed = revealedPasswords[item.id] || false;

                return (
                  <div
                    key={item.id}
                    className="p-3.5 bg-white dark:bg-slate-800/80 rounded-2xl border border-gray-100 dark:border-slate-700/80 hover:border-gray-300 dark:hover:border-slate-600 transition shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate">
                          {item.name}
                        </h4>
                        {data?.url && (
                          <span className="text-[10px] text-gray-400 truncate max-w-[150px]">
                            {data.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-gray-600 dark:text-gray-300 flex items-center gap-2 font-mono">
                        <span className="text-gray-400 text-[11px] font-sans">Identifiant :</span>
                        <span className="font-semibold truncate max-w-[200px]">
                          {data?.username || '—'}
                        </span>
                      </div>

                      {/* MOT DE PASSE FLOU AVEC BOUTON DE VISIBILITÉ */}
                      <div className="text-xs flex items-center gap-2 font-mono">
                        <span className="text-gray-400 text-[11px] font-sans">Mot de passe :</span>
                        <span className="text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-slate-700/80 px-2 py-0.5 rounded text-[11px]">
                          {isRevealed ? itemResult.password : '••••••••••••'}
                        </span>
                        <button
                          onClick={() => toggleRevealPassword(item.id)}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition p-0.5"
                          title={isRevealed ? 'Masquer' : 'Afficher'}
                        >
                          {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {/* BADGES DE RISQUE / SÉCURITÉ */}
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {itemResult.isBreached && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3 text-rose-600" />
                            Compromis ({itemResult.breachCount.toLocaleString()} fuites)
                          </span>
                        )}

                        {itemResult.isReused && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            Réutilisé ({itemResult.reuseCount} comptes)
                          </span>
                        )}

                        {itemResult.strength === 'weak' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300">
                            Faible ({itemResult.strengthScore}/100)
                          </span>
                        )}

                        {itemResult.strength === 'strong' && !itemResult.isBreached && !itemResult.isReused && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            Robuste ({itemResult.strengthScore}/100)
                          </span>
                        )}

                        {itemResult.hasTotp && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
                            2FA Actif
                          </span>
                        )}
                      </div>
                    </div>

                    {/* ACTION MODIFIER / REMPLACER */}
                    <button
                      onClick={() => {
                        onClose();
                        onEditItem(item);
                      }}
                      className="w-full sm:w-auto px-3 py-2 bg-gradient-to-r from-primary-600 to-amber-500 hover:from-primary-700 hover:to-amber-600 text-white font-bold rounded-xl text-xs shadow-xs transition flex items-center justify-center gap-1.5 flex-shrink-0"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Remplacer</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-5 py-3 border-t border-gray-100 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-900/80 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>
            Dernière vérification : {report?.scannedAt ? new Date(report.scannedAt).toLocaleTimeString() : '—'}
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
