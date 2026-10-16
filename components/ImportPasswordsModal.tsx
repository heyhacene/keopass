'use client';

import React, { useState, useRef } from 'react';
import { useVault } from '@/lib/vaultContext';
import { VaultItem, VaultItemType } from '@/types/vault';
import {
  X,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Search,
  ArrowRight,
  ShieldCheck,
  Check,
  RefreshCw,
} from 'lucide-react';

interface ImportPasswordsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ParsedImportItem {
  id: string;
  name: string;
  type: VaultItemType;
  username: string;
  password: string;
  url: string;
  notes: string;
  totpSecret?: string;
  selected: boolean;
  isDuplicate: boolean;
}

// Tokeniseur CSV conforme RFC 4180 gérant guillemets, virgules, points-virgules et retours à la ligne
function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let current = '';
  let inQuotes = false;

  // Détection du délimiteur (virgule, point-virgule ou tabulation)
  const firstLine = text.split(/\r?\n/)[0] || '';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;
  let delimiter = ',';
  if (semiCount > commaCount && semiCount > tabCount) delimiter = ';';
  if (tabCount > commaCount && tabCount > semiCount) delimiter = '\t';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          current += '"';
          i++; // ignore l'échappement ""
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        row.push(current.trim());
        current = '';
      } else if (char === '\r') {
        // Ignorer carriage return
      } else if (char === '\n') {
        row.push(current.trim());
        if (row.some((cell) => cell.length > 0)) {
          lines.push(row);
        }
        row = [];
        current = '';
      } else {
        current += char;
      }
    }
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current.trim());
    if (row.some((cell) => cell.length > 0)) {
      lines.push(row);
    }
  }

  return lines;
}

function cleanDomain(urlStr: string): string {
  try {
    let clean = urlStr.trim();
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'https://' + clean;
    }
    const u = new URL(clean);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return urlStr.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  }
}

export default function ImportPasswordsModal({ isOpen, onClose }: ImportPasswordsModalProps) {
  const { items: existingItems, bulkAddItems } = useVault();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [step, setStep] = useState<'upload' | 'preview' | 'success'>('upload');
  const [sourceName, setSourceName] = useState<string>('CSV / JSON');
  const [parsedItems, setParsedItems] = useState<ParsedImportItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setStep('upload');
    setParsedItems([]);
    setErrorMsg(null);
    setSearchQuery('');
    setImportedCount(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = async (file: File) => {
    setErrorMsg(null);
    try {
      const text = await file.text();
      const fileName = file.name.toLowerCase();

      // 1. TENTATIVE PARSE JSON (ex: Bitwarden, Adblock JSON)
      if (fileName.endsWith('.json') || text.trim().startsWith('{')) {
        try {
          const json = JSON.parse(text);
          let itemsArray: any[] = [];
          if (Array.isArray(json.items)) {
            itemsArray = json.items;
            setSourceName('Bitwarden (JSON)');
          } else if (Array.isArray(json.passwords)) {
            itemsArray = json.passwords;
            setSourceName('Gestionnaire (JSON)');
          } else if (Array.isArray(json)) {
            itemsArray = json;
            setSourceName('JSON générique');
          }

          if (itemsArray.length > 0) {
            const results: ParsedImportItem[] = [];
            for (const it of itemsArray) {
              const name = it.name || it.title || (it.login?.uris?.[0]?.uri ? cleanDomain(it.login.uris[0].uri) : 'Sans nom');
              const username = it.login?.username || it.username || it.login || '';
              const password = it.login?.password || it.password || '';
              const url = it.login?.uris?.[0]?.uri || it.url || it.website || '';
              const notes = it.notes || it.comment || '';
              const totpSecret = it.login?.totp || it.totp || undefined;

              if (!username && !password) continue;

              const isDuplicate = existingItems.some(
                (ei) =>
                  ei.type === 'login' &&
                  (ei.data as any).username?.toLowerCase() === username.toLowerCase() &&
                  cleanDomain((ei.data as any).url || '') === cleanDomain(url)
              );

              results.push({
                id: crypto.randomUUID(),
                name,
                type: 'login',
                username,
                password,
                url,
                notes,
                totpSecret,
                selected: !isDuplicate,
                isDuplicate,
              });
            }

            if (results.length === 0) {
              setErrorMsg('Aucun identifiant valide trouvé dans ce fichier JSON.');
              return;
            }

            setParsedItems(results);
            setStep('preview');
            return;
          }
        } catch {
          // Si le JSON échoue, on tente en CSV
        }
      }

      // 2. PARSE CSV (Chrome, Firefox, Bitwarden CSV, Adblock, etc.)
      const rows = parseCSV(text);
      if (rows.length < 2) {
        setErrorMsg('Le fichier sélectionné semble vide ou ne contient aucune ligne de données.');
        return;
      }

      const headers = rows[0].map((h) => h.toLowerCase().trim());

      // Détecter l'application source
      let detectedSource = 'Gestionnaire CSV';
      if (headers.includes('httprealm') || headers.includes('formactionorigin')) {
        detectedSource = 'Mozilla Firefox';
      } else if (headers.includes('login_uri') || headers.includes('login_username')) {
        detectedSource = 'Bitwarden';
      } else if (headers.includes('url') && headers.includes('username') && headers.includes('password')) {
        detectedSource = 'Google Chrome / Brave / Edge';
      }
      setSourceName(detectedSource);

      // Localisation intelligente des colonnes
      const findCol = (keys: string[]): number => {
        for (const k of keys) {
          const idx = headers.findIndex((h) => h === k || h.includes(k));
          if (idx !== -1) return idx;
        }
        return -1;
      };

      const nameIdx = findCol(['name', 'title', 'nom', 'site', 'label']);
      const urlIdx = findCol(['url', 'login_uri', 'website', 'web-page', 'site web', 'adresse', 'formactionorigin']);
      const userIdx = findCol(['username', 'login_username', 'login', 'user', 'identifiant', 'email', 'e-mail']);
      const passIdx = findCol(['password', 'login_password', 'pass', 'mot de passe', 'mdp', 'secret']);
      const noteIdx = findCol(['note', 'notes', 'comments', 'commentaire', 'description']);
      const totpIdx = findCol(['totp', 'login_totp', '2fa', 'otp']);

      if (passIdx === -1 && userIdx === -1) {
        setErrorMsg("Impossible de reconnaître les colonnes d'identifiant et de mot de passe dans ce fichier CSV.");
        return;
      }

      const results: ParsedImportItem[] = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        const username = userIdx !== -1 && row[userIdx] ? row[userIdx] : '';
        const password = passIdx !== -1 && row[passIdx] ? row[passIdx] : '';
        const url = urlIdx !== -1 && row[urlIdx] ? row[urlIdx] : '';
        const rawName = nameIdx !== -1 && row[nameIdx] ? row[nameIdx] : '';
        const notes = noteIdx !== -1 && row[noteIdx] ? row[noteIdx] : '';
        const totpSecret = totpIdx !== -1 && row[totpIdx] ? row[totpIdx] : undefined;

        // Ignorer les lignes vides
        if (!username && !password && !url) continue;

        // Générer un nom clair si absent
        let name = rawName;
        if (!name && url) {
          name = cleanDomain(url);
          if (name) name = name.charAt(0).toUpperCase() + name.slice(1);
        }
        if (!name) name = username || 'Identifiant sans nom';

        // Vérification de doublon par rapport au coffre actuel
        const isDuplicate = existingItems.some(
          (ei) =>
            ei.type === 'login' &&
            (ei.data as any).username?.toLowerCase() === username.toLowerCase() &&
            cleanDomain((ei.data as any).url || '') === cleanDomain(url)
        );

        results.push({
          id: crypto.randomUUID(),
          name,
          type: 'login',
          username,
          password,
          url,
          notes,
          totpSecret,
          selected: !isDuplicate,
          isDuplicate,
        });
      }

      if (results.length === 0) {
        setErrorMsg('Aucun compte valide trouvé dans ce fichier.');
        return;
      }

      setParsedItems(results);
      setStep('preview');
    } catch (err: any) {
      console.error('Erreur lecture fichier import:', err);
      setErrorMsg('Erreur lors de la lecture du fichier : ' + (err.message || 'Format invalide'));
    }
  };

  const handleToggleSelectAll = () => {
    const allSelected = parsedItems.every((it) => it.selected);
    setParsedItems(parsedItems.map((it) => ({ ...it, selected: !allSelected })));
  };

  const handleToggleItem = (id: string) => {
    setParsedItems(
      parsedItems.map((it) => (it.id === id ? { ...it, selected: !it.selected } : it))
    );
  };

  const handleConfirmImport = async () => {
    const itemsToImport = parsedItems.filter((it) => it.selected);
    if (itemsToImport.length === 0) {
      alert('Veuillez sélectionner au moins un identifiant à importer.');
      return;
    }

    setImporting(true);
    try {
      const formattedItems = itemsToImport.map((it) => ({
        type: 'login' as VaultItemType,
        name: it.name,
        favorite: false,
        folder: 'personal' as const,
        data: {
          username: it.username,
          password: it.password,
          url: it.url,
          notes: it.notes,
          totpSecret: it.totpSecret,
        },
      }));

      const count = await bulkAddItems(formattedItems);
      setImportedCount(count);
      setStep('success');
    } catch (err: any) {
      alert('Erreur lors de l’importation : ' + (err.message || 'Erreur inconnue'));
    } finally {
      setImporting(false);
    }
  };

  const filteredPreview = parsedItems.filter((it) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      it.name.toLowerCase().includes(q) ||
      it.username.toLowerCase().includes(q) ||
      it.url.toLowerCase().includes(q)
    );
  });

  const selectedCount = parsedItems.filter((it) => it.selected).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full border border-gray-100 dark:border-slate-700 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* HEADER */}
        <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-vault-100 dark:bg-vault-950/60 text-vault-700 dark:text-vault-400 flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-gray-900 dark:text-white">
                Importer des mots de passe
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Google Chrome, Firefox, Bitwarden, Adblock, etc.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENU SELON ÉTAPE */}
        <div className="p-5 overflow-y-auto flex-1">
          {/* ÉTAPE 1 : CHOIX DU FICHIER */}
          {step === 'upload' && (
            <div className="space-y-6">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 dark:border-slate-600 hover:border-vault-500 dark:hover:border-vault-500 rounded-3xl p-8 text-center cursor-pointer transition bg-gray-50/50 dark:bg-slate-900/50 group"
              >
                <div className="w-16 h-16 rounded-3xl bg-vault-50 dark:bg-slate-800 text-vault-600 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-xs">
                  <FileText className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-1">
                  Cliquez pour sélectionner votre fichier d'export (.csv ou .json)
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                  Prend en charge les exports de Google Chrome, Mozilla Firefox, Total Adblock, Bitwarden, Edge, 1Password, etc.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.json,text/csv,application/json"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-2xl flex items-center gap-2.5 text-xs text-red-600 dark:text-red-400">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* GUIDE RAPIDE D'EXPORTATION */}
              <div className="p-4 bg-gray-50 dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-700 text-xs space-y-2">
                <span className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-vault-600" />
                  Comment exporter depuis vos gestionnaires actuels :
                </span>
                <ul className="list-disc list-inside space-y-1 text-gray-500 dark:text-gray-400 text-[11px]">
                  <li><strong>Google Chrome / Edge :</strong> Paramètres &gt; Mots de passe &gt; ⋮ (à côté de "Mots de passe enregistrés") &gt; Exporter les mots de passe.</li>
                  <li><strong>Mozilla Firefox :</strong> Paramètres &gt; Identifiants et mots de passe &gt; ⋮ &gt; Exporter les identifiants.</li>
                  <li><strong>Total Adblock / Adblock :</strong> Menu Gestionnaire &gt; Paramètres &gt; Exporter (.csv ou .json).</li>
                  <li><strong>Bitwarden :</strong> Outils &gt; Exporter le coffre &gt; Format CSV.</li>
                </ul>
              </div>
            </div>
          )}

          {/* ÉTAPE 2 : APERÇU ET SÉLECTION */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 bg-vault-50 dark:bg-slate-900 rounded-2xl border border-vault-200/60 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-vault-600 shrink-0" />
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white">
                      Source : <span className="text-vault-700 dark:text-vault-400">{sourceName}</span>
                    </h4>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      {parsedItems.length} mot(s) de passe détecté(s) • {selectedCount} sélectionné(s)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="py-1 px-2.5 rounded-xl border border-gray-300 dark:border-slate-600 text-xs font-semibold hover:bg-white dark:hover:bg-slate-800 transition"
                  >
                    {parsedItems.every((it) => it.selected) ? 'Tout décocher' : 'Tout cocher'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPasswords(!showPasswords)}
                    className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white rounded-xl transition"
                    title={showPasswords ? 'Masquer les mots de passe' : 'Afficher les mots de passe'}
                  >
                    {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* RECHERCHE */}
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filtrer dans les identifiants trouvés..."
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:ring-1 focus:ring-vault-500"
                />
              </div>

              {/* LISTE D'APERÇU */}
              <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-slate-700 rounded-2xl divide-y divide-gray-100 dark:divide-slate-700">
                {filteredPreview.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleToggleItem(item.id)}
                    className={`p-3 flex items-center justify-between gap-3 text-xs cursor-pointer transition hover:bg-gray-50 dark:hover:bg-slate-700/50 ${
                      item.selected ? 'bg-vault-50/30 dark:bg-vault-950/20' : 'opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => {}} // géré par le parent
                        className="w-4 h-4 rounded border-gray-300 text-vault-600 focus:ring-vault-500 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 dark:text-white truncate">
                            {item.name}
                          </span>
                          {item.isDuplicate && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 font-semibold">
                              Doublon
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate flex items-center gap-2">
                          <span>{item.username || 'Sans identifiant'}</span>
                          {item.url && <span className="opacity-60">• {cleanDomain(item.url)}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono text-[11px] text-gray-700 dark:text-gray-300">
                        {showPasswords ? item.password : '••••••••'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ÉTAPE 3 : SUCCÈS */}
          {step === 'success' && (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-md">
                <Check className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-extrabold text-base text-gray-900 dark:text-white">
                  Importation réussie ! 🎉
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <strong>{importedCount}</strong> identifiant(s) ont été chiffrés avec votre clé AES-256 et enregistrés dans votre coffre.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-4 border-t border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/50 flex items-center justify-between">
          {step === 'upload' && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900"
            >
              Fermer
            </button>
          )}

          {step === 'preview' && (
            <>
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900"
              >
                Choisir un autre fichier
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={importing || selectedCount === 0}
                className="py-2.5 px-5 bg-vault-600 hover:bg-vault-700 text-white font-bold rounded-2xl text-xs transition flex items-center gap-2 shadow-xs disabled:opacity-50"
              >
                {importing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Chiffrement et import en cours...</span>
                  </>
                ) : (
                  <>
                    <span>Importer {selectedCount} mot(s) de passe</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </>
          )}

          {step === 'success' && (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-4 bg-vault-600 hover:bg-vault-700 text-white font-bold rounded-2xl text-xs transition"
            >
              Terminer et voir mon coffre
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
