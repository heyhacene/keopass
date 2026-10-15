'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  generatePassword,
  calculatePasswordStrength,
} from '@/lib/crypto';
import { PasswordGeneratorOptions, PasswordStrength } from '@/types/vault';
import {
  Copy,
  Check,
  RefreshCw,
  Shield,
  Sliders,
  Sparkles,
  KeyRound,
  FileText,
  AlertCircle,
} from 'lucide-react';

interface PasswordGeneratorProps {
  onSelectPassword?: (password: string) => void;
  showInsertButton?: boolean;
}

export default function PasswordGenerator({
  onSelectPassword,
  showInsertButton = false,
}: PasswordGeneratorProps) {
  const [options, setOptions] = useState<PasswordGeneratorOptions>({
    length: 18,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
    avoidAmbiguous: true,
    mode: 'random',
    wordCount: 4,
    wordSeparator: '-',
    includeNumberInPassphrase: true,
    capitalizePassphrase: true,
  });

  const [password, setPassword] = useState('');
  const [strength, setStrength] = useState<PasswordStrength>({
    score: 0,
    label: '',
    color: '',
    bgBar: '',
    entropyBits: 0,
    feedback: '',
  });
  const [copied, setCopied] = useState(false);

  const regenerate = useCallback(() => {
    const pwd = generatePassword(options);
    setPassword(pwd);
    setStrength(calculatePasswordStrength(pwd));
    setCopied(false);
  }, [options]);

  useEffect(() => {
    regenerate();
  }, [regenerate]);

  const handleCopy = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Erreur copie:', err);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-gray-100 dark:border-slate-700 shadow-sm space-y-5">
      {/* HEADER AVEC TITRE ET SÉLECTEUR DE MODE */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-vault-100 dark:bg-vault-950/60 text-vault-700 dark:text-vault-400 flex items-center justify-center">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-gray-900 dark:text-white">
              Générateur de mots de passe
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Génération cryptographique aléatoire sécurisée
            </p>
          </div>
        </div>

        {/* ONGLETS MODE : ALÉATOIRE / PHRASE DE PASSE */}
        <div className="flex items-center p-1 bg-gray-100 dark:bg-slate-700 rounded-xl text-xs font-bold">
          <button
            type="button"
            onClick={() => setOptions((prev) => ({ ...prev, mode: 'random' }))}
            className={`px-2.5 py-1 rounded-lg transition ${
              options.mode === 'random'
                ? 'bg-white dark:bg-slate-800 text-gray-900 dark:text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            Aléatoire
          </button>
          <button
            type="button"
            onClick={() => setOptions((prev) => ({ ...prev, mode: 'passphrase' }))}
            className={`px-2.5 py-1 rounded-lg transition ${
              options.mode === 'passphrase'
                ? 'bg-white dark:bg-slate-800 text-gray-900 dark:text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            Phrase
          </button>
        </div>
      </div>

      {/* AFFICHAGE DU MOT DE PASSE GÉNÉRÉ */}
      <div className="space-y-2">
        <div className="relative flex items-center">
          <input
            type="text"
            readOnly
            value={password}
            className="w-full py-3.5 pl-4 pr-24 font-mono text-sm sm:text-base font-bold bg-gray-50 dark:bg-slate-900/80 border border-gray-200 dark:border-slate-700 rounded-2xl text-gray-900 dark:text-white focus:outline-none select-all"
          />
          <div className="absolute right-2 flex items-center gap-1">
            <button
              type="button"
              onClick={regenerate}
              className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl transition"
              title="Générer un nouveau mot de passe"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className={`p-2 rounded-xl transition flex items-center gap-1 text-xs font-bold ${
                copied
                  ? 'bg-vault-600 text-white'
                  : 'bg-vault-100 dark:bg-vault-950/60 text-vault-700 dark:text-vault-300 hover:bg-vault-200'
              }`}
              title="Copier dans le presse-papier"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* BARRE DE ROBUSTESSE & ENTROPIE */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-gray-600 dark:text-gray-300">Robustesse :</span>
              <span className={`font-bold ${strength.color}`}>{strength.label}</span>
            </div>
            <span className="text-[11px] text-gray-400 font-mono">
              {strength.entropyBits} bits d'entropie
            </span>
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

          <p className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-vault-600 shrink-0" />
            <span>{strength.feedback}</span>
          </p>
        </div>
      </div>

      {/* PARAMÈTRES DU GÉNÉRATEUR */}
      {options.mode === 'random' ? (
        <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-slate-700">
          {/* CURSEUR DE LONGUEUR */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-gray-700 dark:text-gray-200">Longueur</span>
              <span className="font-mono font-bold text-vault-700 dark:text-vault-400 text-sm">
                {options.length} caractères
              </span>
            </div>
            <input
              type="range"
              min={8}
              max={64}
              value={options.length}
              onChange={(e) =>
                setOptions((prev) => ({ ...prev, length: parseInt(e.target.value) }))
              }
              className="w-full accent-vault-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-gray-400 font-mono">
              <span>8</span>
              <span>16</span>
              <span>24</span>
              <span>32</span>
              <span>64</span>
            </div>
          </div>

          {/* OPTIONS DE CARACTÈRES */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <label className="flex items-center gap-2 p-2.5 rounded-xl border border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-750 cursor-pointer">
              <input
                type="checkbox"
                checked={options.uppercase}
                onChange={(e) =>
                  setOptions((prev) => ({ ...prev, uppercase: e.target.checked }))
                }
                className="rounded text-vault-600 focus:ring-vault-500"
              />
              <span className="font-medium text-gray-700 dark:text-gray-200">Majuscules (A-Z)</span>
            </label>

            <label className="flex items-center gap-2 p-2.5 rounded-xl border border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-750 cursor-pointer">
              <input
                type="checkbox"
                checked={options.lowercase}
                onChange={(e) =>
                  setOptions((prev) => ({ ...prev, lowercase: e.target.checked }))
                }
                className="rounded text-vault-600 focus:ring-vault-500"
              />
              <span className="font-medium text-gray-700 dark:text-gray-200">Minuscules (a-z)</span>
            </label>

            <label className="flex items-center gap-2 p-2.5 rounded-xl border border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-750 cursor-pointer">
              <input
                type="checkbox"
                checked={options.numbers}
                onChange={(e) =>
                  setOptions((prev) => ({ ...prev, numbers: e.target.checked }))
                }
                className="rounded text-vault-600 focus:ring-vault-500"
              />
              <span className="font-medium text-gray-700 dark:text-gray-200">Chiffres (0-9)</span>
            </label>

            <label className="flex items-center gap-2 p-2.5 rounded-xl border border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-750 cursor-pointer">
              <input
                type="checkbox"
                checked={options.symbols}
                onChange={(e) =>
                  setOptions((prev) => ({ ...prev, symbols: e.target.checked }))
                }
                className="rounded text-vault-600 focus:ring-vault-500"
              />
              <span className="font-medium text-gray-700 dark:text-gray-200">Symboles (!@#$)</span>
            </label>
          </div>

          <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={options.avoidAmbiguous}
              onChange={(e) =>
                setOptions((prev) => ({ ...prev, avoidAmbiguous: e.target.checked }))
              }
              className="rounded text-vault-600 focus:ring-vault-500"
            />
            <span>Éviter les caractères ambigus (0, O, l, 1, I)</span>
          </label>
        </div>
      ) : (
        /* MODE PHRASE DE PASSE */
        <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-slate-700">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-gray-700 dark:text-gray-200">Nombre de mots</span>
              <span className="font-mono font-bold text-vault-700 dark:text-vault-400 text-sm">
                {options.wordCount} mots
              </span>
            </div>
            <input
              type="range"
              min={3}
              max={7}
              value={options.wordCount}
              onChange={(e) =>
                setOptions((prev) => ({ ...prev, wordCount: parseInt(e.target.value) }))
              }
              className="w-full accent-vault-600 cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <label className="flex items-center gap-2 p-2.5 rounded-xl border border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-750 cursor-pointer">
              <input
                type="checkbox"
                checked={options.capitalizePassphrase}
                onChange={(e) =>
                  setOptions((prev) => ({ ...prev, capitalizePassphrase: e.target.checked }))
                }
                className="rounded text-vault-600 focus:ring-vault-500"
              />
              <span className="font-medium text-gray-700 dark:text-gray-200">Majuscule aux mots</span>
            </label>

            <label className="flex items-center gap-2 p-2.5 rounded-xl border border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-750 cursor-pointer">
              <input
                type="checkbox"
                checked={options.includeNumberInPassphrase}
                onChange={(e) =>
                  setOptions((prev) => ({ ...prev, includeNumberInPassphrase: e.target.checked }))
                }
                className="rounded text-vault-600 focus:ring-vault-500"
              />
              <span className="font-medium text-gray-700 dark:text-gray-200">Ajouter un chiffre</span>
            </label>
          </div>
        </div>
      )}

      {/* BOUTON D'INSERTION DIRECTE (DANS UNE MODALE D'AJOUT) */}
      {showInsertButton && onSelectPassword && (
        <button
          type="button"
          onClick={() => onSelectPassword(password)}
          className="w-full py-2.5 bg-vault-600 hover:bg-vault-700 text-white font-bold rounded-2xl text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
        >
          <Check className="w-4 h-4" />
          <span>Utiliser ce mot de passe</span>
        </button>
      )}
    </div>
  );
}
