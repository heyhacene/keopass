'use client';

import React from 'react';
import { useVault } from '@/lib/vaultContext';
import { isSupabaseConfigured } from '@/lib/supabase';
import {
  X,
  Shield,
  Download,
  Clock,
  Cloud,
  CloudOff,
  LogOut,
  AlertTriangle,
  Info,
  RefreshCw,
  Coffee,
  Heart,
  LifeBuoy,
  ExternalLink,
  Fingerprint,
  Smartphone,
  Upload,
  ArrowRight,
  Globe,
  Bot,
} from 'lucide-react';
import {
  isBiometricAvailable,
  isBiometricConfigured,
  enableBiometric,
  disableBiometric,
} from '@/lib/biometrics';

interface VaultSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenImport?: () => void;
  onOpenSupportChatbot?: () => void;
}

export default function VaultSettingsModal({ isOpen, onClose, onOpenImport, onOpenSupportChatbot }: VaultSettingsModalProps) {
  const {
    userEmail,
    autoLockMinutes,
    setAutoLockMinutes,
    exportVaultData,
    isSyncing,
    resetVaultLocal,
    syncNow,
    masterPasswordAvailable,
    enableBiometricsWithCurrentSession,
  } = useVault();

  const [biometricSupported, setBiometricSupported] = React.useState(false);
  const [biometricEnabled, setBiometricEnabled] = React.useState(false);
  const [biometricLoading, setBiometricLoading] = React.useState(false);
  const [biometricMsg, setBiometricMsg] = React.useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [showPasswordPrompt, setShowPasswordPrompt] = React.useState(false);
  const [confirmPassword, setConfirmPassword] = React.useState('');

  React.useEffect(() => {
    if (!isOpen) return;
    isBiometricAvailable().then((avail) => setBiometricSupported(avail));
    setBiometricEnabled(isBiometricConfigured());
    setBiometricMsg(null);
    setShowPasswordPrompt(false);
    setConfirmPassword('');
  }, [isOpen]);

  const handleToggleBiometric = async () => {
    setBiometricMsg(null);

    if (biometricEnabled) {
      disableBiometric();
      setBiometricEnabled(false);
      setBiometricMsg({ text: 'Déverrouillage par empreinte désactivé.', type: 'success' });
      return;
    }

    if (masterPasswordAvailable) {
      setBiometricLoading(true);
      try {
        const res = await enableBiometricsWithCurrentSession();
        if (res.success) {
          setBiometricEnabled(true);
          setBiometricMsg({ text: 'Empreinte digitale activée avec succès !', type: 'success' });
        } else {
          setBiometricMsg({ text: res.error || 'Échec de l’activation biométrique.', type: 'error' });
        }
      } catch (err: any) {
        setBiometricMsg({ text: err.message || 'Erreur inconnue.', type: 'error' });
      } finally {
        setBiometricLoading(false);
      }
    } else {
      setShowPasswordPrompt(true);
    }
  };

  const handleConfirmPasswordBiometric = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmPassword) return;

    setBiometricLoading(true);
    setBiometricMsg(null);
    try {
      const res = await enableBiometric(confirmPassword, userEmail);
      if (res.success) {
        setBiometricEnabled(true);
        setShowPasswordPrompt(false);
        setConfirmPassword('');
        setBiometricMsg({ text: 'Empreinte digitale activée avec succès !', type: 'success' });
      } else {
        setBiometricMsg({ text: res.error || 'Mot de passe incorrect ou enregistrement refusé.', type: 'error' });
      }
    } catch (err: any) {
      setBiometricMsg({ text: err.message || 'Erreur inconnue.', type: 'error' });
    } finally {
      setBiometricLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-100 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in-95">
        {/* HEADER */}
        <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between bg-gray-50/70 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-vault-100 dark:bg-vault-950/60 text-vault-700 dark:text-vault-400 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                Paramètres du coffre
              </h3>
              <p className="text-[11px] text-gray-400 dark:text-slate-400">
                Sécurité, Synchronisation & Sauvegardes
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENU */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* UTILISATEUR & SYNCHRO */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider">
              Compte & Synchronisation
            </h4>
            <div className="p-3.5 bg-gray-50 dark:bg-slate-900 rounded-2xl border border-gray-150 dark:border-slate-700 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-gray-900 dark:text-white">{userEmail}</p>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-[11px]">
                    {isSupabaseConfigured() ? (
                      <>
                        <Cloud className="w-3.5 h-3.5 text-vault-600 dark:text-vault-400" />
                        <span className="text-vault-600 dark:text-vault-400 font-semibold">
                          {isSyncing ? 'Synchronisation...' : 'Synchronisé (Supabase)'}
                        </span>
                      </>
                    ) : (
                      <>
                        <CloudOff className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-amber-600 dark:text-amber-400 font-semibold">
                          Mode local (hors-ligne)
                        </span>
                      </>
                    )}
                  </div>
                  {isSupabaseConfigured() && (
                    <button
                      type="button"
                      onClick={() => syncNow()}
                      disabled={isSyncing}
                      className="px-2.5 py-1 bg-vault-600/15 hover:bg-vault-600/25 border border-vault-500/30 text-vault-600 dark:text-vault-400 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                      title="Forcer la synchronisation avec le Cloud"
                    >
                      <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>{isSyncing ? 'En cours...' : 'Synchroniser'}</span>
                    </button>
                  )}
                </div>
              </div>

              {!isSupabaseConfigured() && (
                <div className="pt-2 border-t border-gray-200 dark:border-slate-800 flex items-start gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                  <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                  <p>
                    Pour synchroniser instantanément vos mots de passe avec votre téléphone et vos autres PC, connectez un projet gratuit <strong>Supabase</strong> dans Vercel.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* SÉCURITÉ BIOMÉTRIQUE / EMPREINTE */}
          <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-vault-100 dark:bg-vault-950/60 text-vault-700 dark:text-vault-400 flex items-center justify-center">
                    <Fingerprint className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                      Déverrouillage par empreinte
                    </h4>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      {biometricEnabled
                        ? 'Actif sur cet appareil (Empreinte / Windows Hello / Face ID)'
                        : 'Déverrouillez en 1 touche sans retaper votre mot de passe'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={biometricEnabled}
                  disabled={biometricLoading}
                  onClick={handleToggleBiometric}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    biometricEnabled ? 'bg-vault-600' : 'bg-gray-200 dark:bg-slate-700'
                  } ${biometricLoading ? 'opacity-50 cursor-wait' : ''}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      biometricEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {biometricMsg && (
                <div
                  className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                    biometricMsg.type === 'error'
                      ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50'
                      : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50'
                  }`}
                >
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  <span>{biometricMsg.text}</span>
                </div>
              )}

              {showPasswordPrompt && (
                <form onSubmit={handleConfirmPasswordBiometric} className="p-3 bg-gray-50 dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 space-y-2">
                  <p className="text-[11px] text-gray-600 dark:text-gray-300 font-medium">
                    Entrez votre mot de passe maître pour activer l'empreinte :
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      required
                      placeholder="Mot de passe maître"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="flex-1 py-1.5 px-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-vault-500 font-mono"
                    />
                    <button
                      type="submit"
                      disabled={!confirmPassword || biometricLoading}
                      className="py-1.5 px-3 bg-vault-600 text-white font-bold rounded-xl text-xs hover:bg-vault-700 disabled:opacity-50 transition"
                    >
                      {biometricLoading ? '...' : 'Activer'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPasswordPrompt(false)}
                      className="py-1.5 px-2 text-gray-400 hover:text-gray-600 text-xs"
                    >
                      Annuler
                    </button>
                  </div>
                </form>
              )}
            </div>

          {/* VERROUILLAGE AUTOMATIQUE */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-vault-600 dark:text-vault-400" />
              <h4 className="text-xs font-bold text-gray-700 dark:text-gray-200">
                Délai de verrouillage d'inactivité
              </h4>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Le coffre se verrouille et purge la mémoire si vous ne touchez pas l’application.
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {[5, 15, 30, 60].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setAutoLockMinutes(mins)}
                  className={`py-2 rounded-xl text-xs font-bold transition border ${
                    autoLockMinutes === mins
                      ? 'bg-vault-600 text-white border-vault-600 shadow-xs'
                      : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                  }`}
                >
                  {mins} min
                </button>
              ))}
            </div>
          </div>

          {/* SAUVEGARDE & RESTAURATION */}
          <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-slate-700">
            <h4 className="text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider">
              Sauvegardes & Restauration
            </h4>

            {/* IMPORTER DES MOTS DE PASSE */}
            <button
              type="button"
              onClick={() => {
                if (onOpenImport) {
                  onClose();
                  onOpenImport();
                }
              }}
              className="w-full p-3.5 bg-vault-50/50 dark:bg-slate-900 hover:bg-vault-50 dark:hover:bg-slate-700/60 rounded-2xl border border-vault-200/80 dark:border-slate-700 transition flex items-center justify-between text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-vault-600 text-white flex items-center justify-center">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="font-bold text-xs text-gray-900 dark:text-white">
                    Importer des mots de passe
                  </h5>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    Depuis Chrome, Firefox, Bitwarden, Adblock (.csv, .json)
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-vault-600 transition-colors" />
            </button>

            <button
              type="button"
              onClick={() => exportVaultData(false)}
              className="w-full p-3.5 bg-gray-50 dark:bg-slate-900 hover:bg-gray-100 dark:hover:bg-slate-700/60 rounded-2xl border border-gray-100 dark:border-slate-700 transition flex items-center justify-between text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-vault-100 dark:bg-vault-950/60 text-vault-700 dark:text-vault-400 flex items-center justify-center">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="font-bold text-xs text-gray-900 dark:text-white">
                    Exporter la sauvegarde chiffrée
                  </h5>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    Fichier .json protégé par votre mot de passe maître
                  </p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                if (confirm('Attention : Ce fichier contiendra vos mots de passe en clair sans chiffrement. Conservez-le en lieu sûr. Continuer ?')) {
                  exportVaultData(true);
                }
              }}
              className="w-full p-3 bg-red-50/50 dark:bg-red-950/20 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-2xl border border-red-200/50 dark:border-red-900/30 transition flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <div>
                  <h5 className="font-bold text-xs text-red-600 dark:text-red-400">
                    Exporter en texte clair (Non chiffré)
                  </h5>
                  <p className="text-[10px] text-red-500/80">
                    À utiliser uniquement pour imprimer ou archiver
                  </p>
                </div>
              </div>
            </button>
          </div>

          {/* ASSISTANT SUPPORT & CHATBOT */}
          {onOpenSupportChatbot && (
            <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 dark:from-slate-800 dark:to-slate-800 p-4 rounded-3xl border border-emerald-300 dark:border-emerald-700/60 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-vault-600 text-white rounded-xl shadow-xs">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white">
                      Assistant Support Keo (Chatbot)
                    </h4>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      Aide à l'import, empreinte digitale, sécurité et guide
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={onOpenSupportChatbot}
                  className="w-full py-2.5 px-3 rounded-2xl bg-vault-600 hover:bg-vault-700 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
                >
                  <Bot className="w-4 h-4" />
                  <span>Discuter avec l'Assistant Keo</span>
                </button>
              </div>
            </div>
          )}

          {/* VERSION WEB & ACCÈS CLOUD */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800 p-4 rounded-3xl border border-blue-200/80 dark:border-slate-700 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-600 text-white rounded-xl">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white">
                    Version Web & Accès Cloud
                  </h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Accessible depuis n'importe quel ordinateur, Mac ou navigateur
                  </p>
                </div>
              </div>
            </div>

            <div>
              <a
                href="https://keopass.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
              >
                <Globe className="w-4 h-4" />
                <span>Ouvrir https://keopass.vercel.app</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </a>
            </div>
          </div>

          {/* APPLICATION ANDROID (APK) & MISES À JOUR */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-slate-800 dark:to-slate-800 p-4 rounded-3xl border border-emerald-200/80 dark:border-slate-700 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-vault-600 text-white rounded-xl">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white">
                    Application Android (APK) & Mises à jour
                  </h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Version native avec déverrouillage par empreinte
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <a
                href="https://github.com/heyhacene/keopass/releases/latest/download/KeoPass.apk"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-3 rounded-2xl bg-vault-600 hover:bg-vault-700 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>Télécharger le dernier APK KeoPass</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </a>

              <a
                href="https://github.com/heyhacene/keopass/releases"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 px-3 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-650 text-gray-700 dark:text-gray-300 font-semibold rounded-2xl text-xs flex items-center justify-center gap-2 border border-gray-200 dark:border-slate-600 transition"
              >
                <RefreshCw className="w-3.5 h-3.5 text-vault-600 dark:text-vault-400" />
                <span>Toutes les versions & notes de publication</span>
                <ExternalLink className="w-3 h-3 opacity-60" />
              </a>
            </div>
          </div>

          {/* SOUTIEN DU PROJET & ASSISTANCE */}
          <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-slate-700">
            <h4 className="text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider">
              Soutien & Assistance
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <a
                href="https://ko-fi.com/keo_app"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-3 rounded-2xl bg-[#FF5E5B] hover:bg-[#e04f4c] text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
              >
                <Coffee className="w-4 h-4" />
                <span>Offrir un café (Ko-fi)</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </a>

              <a
                href="mailto:heyhacene@gmail.com?subject=%5BKeoPass%5D%20Assistance%20%26%20Feedback"
                className="w-full py-2.5 px-3 rounded-2xl bg-gray-50 dark:bg-slate-900 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-800 dark:text-white border border-gray-200 dark:border-slate-700 text-xs font-bold transition flex items-center justify-center gap-2"
              >
                <LifeBuoy className="w-4 h-4 text-vault-600 dark:text-vault-400" />
                <span>Aide & Retours</span>
              </a>
            </div>
          </div>

          {/* DISSOCIER CET APPAREIL */}
          <div className="pt-2 border-t border-gray-100 dark:border-slate-700">
            <button
              type="button"
              onClick={() => {
                if (confirm('Êtes-vous sûr de vouloir dissocier cet appareil ? Vos données locales seront purgées (vos données synchronisées dans le Cloud restent intactes).')) {
                  resetVaultLocal();
                  onClose();
                }
              }}
              className="w-full p-2.5 rounded-2xl border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-900/50 transition flex items-center justify-center gap-2 text-xs font-semibold"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Dissocier cet appareil / Changer de compte</span>
            </button>
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-3 bg-gray-50 dark:bg-slate-900 border-t border-gray-100 dark:border-slate-700 text-center">
          <p className="text-[11px] text-gray-400 dark:text-slate-400">
            KeoPass v1.0.0 • Chiffrement Zero-Knowledge AES-256-GCM
          </p>
        </div>
      </div>
    </div>
  );
}
