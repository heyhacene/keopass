'use client';

import React, { useState, useEffect } from 'react';
import {
  VaultItem,
  VaultItemType,
  LoginData,
  CardData,
  NoteData,
  IdentityData,
} from '@/types/vault';
import { useVault } from '@/lib/vaultContext';
import { generatePassword } from '@/lib/crypto';
import TotpBadge from './TotpBadge';
import PasswordGenerator from './PasswordGenerator';
import {
  X,
  KeyRound,
  CreditCard,
  FileText,
  UserCheck,
  Eye,
  EyeOff,
  Copy,
  Check,
  Trash2,
  Edit2,
  Sparkles,
  ExternalLink,
  Star,
} from 'lucide-react';

interface VaultItemModalProps {
  item: VaultItem | null; // null si on est en train de créer un nouvel élément
  isOpen: boolean;
  onClose: () => void;
  defaultType?: VaultItemType;
}

export default function VaultItemModal({
  item,
  isOpen,
  onClose,
  defaultType = 'login',
}: VaultItemModalProps) {
  const { addItem, updateItem, deleteItem, toggleFavorite } = useVault();

  const isEditingInitial = !item;
  const [isEditing, setIsEditing] = useState(isEditingInitial);
  const [showGenerator, setShowGenerator] = useState(false);

  // Champs génériques
  const [itemType, setItemType] = useState<VaultItemType>(item?.type || defaultType);
  const [name, setName] = useState(item?.name || '');
  const [favorite, setFavorite] = useState(item?.favorite || false);

  // Champs Login
  const [url, setUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [totpSecret, setTotpSecret] = useState('');
  const [notes, setNotes] = useState('');

  // Champs Carte
  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expirationMonth, setExpirationMonth] = useState('');
  const [expirationYear, setExpirationYear] = useState('');
  const [cvv, setCvv] = useState('');
  const [pin, setPin] = useState('');

  // Champs Note
  const [noteContent, setNoteContent] = useState('');

  // Masquage des champs secrets
  const [showPassword, setShowPassword] = useState(false);
  const [showCvv, setShowCvv] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Initialisation à l'ouverture
  useEffect(() => {
    if (item) {
      setIsEditing(false);
      setItemType(item.type);
      setName(item.name);
      setFavorite(item.favorite);

      if (item.type === 'login') {
        const d = item.data as LoginData;
        setUrl(d.url || '');
        setUsername(d.username || '');
        setPassword(d.password || '');
        setTotpSecret(d.totpSecret || '');
        setNotes(d.notes || '');
      } else if (item.type === 'card') {
        const d = item.data as CardData;
        setCardholderName(d.cardholderName || '');
        setCardNumber(d.cardNumber || '');
        setExpirationMonth(d.expirationMonth || '');
        setExpirationYear(d.expirationYear || '');
        setCvv(d.cvv || '');
        setPin(d.pin || '');
        setNotes(d.notes || '');
      } else if (item.type === 'note') {
        const d = item.data as NoteData;
        setNoteContent(d.content || '');
      }
    } else {
      setIsEditing(true);
      setItemType(defaultType);
      setName('');
      setFavorite(false);
      setUrl('');
      setUsername('');
      setPassword('');
      setTotpSecret('');
      setNotes('');
      setCardholderName('');
      setCardNumber('');
      setExpirationMonth('');
      setExpirationYear('');
      setCvv('');
      setPin('');
      setNoteContent('');
    }
  }, [item, isOpen, defaultType]);

  if (!isOpen) return null;

  const handleCopy = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {}
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let data: any = {};
    if (itemType === 'login') {
      data = {
        url: url.trim(),
        username: username.trim(),
        password,
        totpSecret: totpSecret.trim(),
        notes: notes.trim(),
      };
    } else if (itemType === 'card') {
      data = {
        cardholderName: cardholderName.trim(),
        cardNumber: cardNumber.trim(),
        expirationMonth: expirationMonth.trim(),
        expirationYear: expirationYear.trim(),
        cvv: cvv.trim(),
        pin: pin.trim(),
        notes: notes.trim(),
      };
    } else if (itemType === 'note') {
      data = {
        content: noteContent,
      };
    }

    if (item) {
      await updateItem(item.id, {
        name: name.trim(),
        type: itemType,
        favorite,
        data,
      });
      setIsEditing(false);
    } else {
      await addItem({
        name: name.trim(),
        type: itemType,
        favorite,
        data,
      });
      onClose();
    }
  };

  const handleDelete = async () => {
    if (!item) return;
    if (confirm('Voulez-vous vraiment supprimer cet élément ?')) {
      await deleteItem(item.id, true);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-100 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in-95">
        {/* HEADER MODALE */}
        <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between shrink-0 bg-gray-50/70 dark:bg-slate-850">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-vault-100 dark:bg-vault-950/60 text-vault-700 dark:text-vault-400 flex items-center justify-center font-bold">
              {itemType === 'card' && <CreditCard className="w-5 h-5" />}
              {itemType === 'note' && <FileText className="w-5 h-5" />}
              {itemType === 'identity' && <UserCheck className="w-5 h-5" />}
              {itemType === 'login' && <KeyRound className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                {item ? (isEditing ? 'Modifier l’élément' : item.name) : 'Nouvel élément'}
              </h3>
              <p className="text-[11px] text-gray-400 dark:text-slate-500 capitalize">
                {itemType === 'login' ? 'Identifiant & Mot de passe' : itemType === 'card' ? 'Carte bancaire' : 'Note sécurisée'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {item && !isEditing && (
              <>
                <button
                  type="button"
                  onClick={() => toggleFavorite(item.id)}
                  className={`p-2 rounded-xl transition ${
                    favorite ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40' : 'text-gray-400 hover:text-amber-500'
                  }`}
                  title="Favori"
                >
                  <Star className={`w-4 h-4 ${favorite ? 'fill-amber-500' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition"
                  title="Modifier"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CORPS DE LA MODALE */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* SÉLECTEUR DE TYPE EN MODE CRÉATION */}
          {!item && isEditing && (
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-gray-100 dark:bg-slate-750 rounded-2xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setItemType('login')}
                className={`py-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
                  itemType === 'login'
                    ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-xs'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Identifiant</span>
              </button>
              <button
                type="button"
                onClick={() => setItemType('card')}
                className={`py-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
                  itemType === 'card'
                    ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-xs'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Carte</span>
              </button>
              <button
                type="button"
                onClick={() => setItemType('note')}
                className={`py-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
                  itemType === 'note'
                    ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-xs'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Note</span>
              </button>
            </div>
          )}

          {/* FORMULAIRE EN MODE ÉDITION */}
          {isEditing ? (
            <form id="vault-item-form" onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Nom de l'élément *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Google, Compte Bancaire, Netflix..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-xs sm:text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-vault-500 outline-none"
                />
              </div>

              {/* CHAMPS IDENTIFIANT */}
              {itemType === 'login' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Identifiant ou Email
                    </label>
                    <input
                      type="text"
                      placeholder="nom@exemple.com ou pseudo"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-xs sm:text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-vault-500 outline-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                        Mot de passe
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowGenerator(!showGenerator)}
                        className="text-xs font-bold text-vault-600 dark:text-vault-400 hover:underline flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>{showGenerator ? 'Masquer générateur' : 'Générer un mot de passe'}</span>
                      </button>
                    </div>

                    <div className="relative flex items-center">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Mot de passe secret"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full py-2.5 pl-3.5 pr-20 rounded-2xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-xs sm:text-sm font-mono text-gray-900 dark:text-white focus:ring-2 focus:ring-vault-500 outline-none"
                      />
                      <div className="absolute right-2 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* GÉNÉRATEUR EMBARQUÉ */}
                    {showGenerator && (
                      <div className="mt-3">
                        <PasswordGenerator
                          showInsertButton
                          onSelectPassword={(pwd) => {
                            setPassword(pwd);
                            setShowGenerator(false);
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Site Web / URL (optionnel)
                    </label>
                    <input
                      type="url"
                      placeholder="https://www.google.com"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-xs sm:text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-vault-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Clé secrète 2FA / TOTP (optionnel)
                    </label>
                    <input
                      type="text"
                      placeholder="ex: JBSWY3DPEHPK3PXP"
                      value={totpSecret}
                      onChange={(e) => setTotpSecret(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-xs sm:text-sm font-mono uppercase text-gray-900 dark:text-white focus:ring-2 focus:ring-vault-500 outline-none"
                    />
                    {totpSecret && (
                      <div className="mt-2">
                        <TotpBadge secret={totpSecret} />
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* CHAMPS CARTE BANCAIRE */}
              {itemType === 'card' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Titulaire de la carte
                    </label>
                    <input
                      type="text"
                      placeholder="NOM PRENOM"
                      value={cardholderName}
                      onChange={(e) => setCardholderName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-xs sm:text-sm text-gray-900 dark:text-white uppercase focus:ring-2 focus:ring-vault-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Numéro de carte
                    </label>
                    <input
                      type="text"
                      maxLength={19}
                      placeholder="1234 5678 9012 3456"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-xs sm:text-sm font-mono text-gray-900 dark:text-white focus:ring-2 focus:ring-vault-500 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                        Mois
                      </label>
                      <input
                        type="text"
                        maxLength={2}
                        placeholder="MM (ex: 08)"
                        value={expirationMonth}
                        onChange={(e) => setExpirationMonth(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-xs sm:text-sm font-mono text-center text-gray-900 dark:text-white focus:ring-2 focus:ring-vault-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                        Année
                      </label>
                      <input
                        type="text"
                        maxLength={4}
                        placeholder="AA ou AAAA"
                        value={expirationYear}
                        onChange={(e) => setExpirationYear(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-xs sm:text-sm font-mono text-center text-gray-900 dark:text-white focus:ring-2 focus:ring-vault-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                        CVV
                      </label>
                      <input
                        type="password"
                        maxLength={4}
                        placeholder="123"
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-xs sm:text-sm font-mono text-center text-gray-900 dark:text-white focus:ring-2 focus:ring-vault-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Code PIN secret (optionnel)
                    </label>
                    <input
                      type="password"
                      maxLength={8}
                      placeholder="••••"
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-xs sm:text-sm font-mono text-gray-900 dark:text-white focus:ring-2 focus:ring-vault-500 outline-none"
                    />
                  </div>
                </>
              )}

              {/* CHAMPS NOTE SÉCURISÉE */}
              {itemType === 'note' && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Texte secret chiffré
                  </label>
                  <textarea
                    rows={6}
                    placeholder="Saisissez vos notes secrètes, clés de récupération, codes d'urgence..."
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    className="w-full p-3.5 rounded-2xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-xs sm:text-sm font-mono text-gray-900 dark:text-white focus:ring-2 focus:ring-vault-500 outline-none"
                  />
                </div>
              )}

              {/* NOTES GÉNÉRALES */}
              {itemType !== 'note' && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Notes complémentaires (chiffrées)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Remarques, questions secrètes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-3 rounded-2xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-vault-500 outline-none"
                  />
                </div>
              )}
            </form>
          ) : (
            /* MODE VISUALISATION */
            <div className="space-y-4">
              {itemType === 'login' && (
                <>
                  {/* Identifiant */}
                  <div className="p-3 bg-gray-50 dark:bg-slate-750 rounded-2xl border border-gray-100 dark:border-slate-700 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-400">Identifiant</span>
                      <p className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-white select-all">
                        {username || 'Non renseigné'}
                      </p>
                    </div>
                    {username && (
                      <button
                        type="button"
                        onClick={() => handleCopy(username, 'username')}
                        className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-xl"
                      >
                        {copiedField === 'username' ? <Check className="w-4 h-4 text-vault-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    )}
                  </div>

                  {/* Mot de passe */}
                  <div className="p-3 bg-gray-50 dark:bg-slate-750 rounded-2xl border border-gray-100 dark:border-slate-700 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-400">Mot de passe</span>
                      <p className="font-mono font-bold text-xs sm:text-sm text-gray-900 dark:text-white select-all">
                        {showPassword ? password : '••••••••••••••••'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-xl"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopy(password, 'password')}
                        className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-xl"
                      >
                        {copiedField === 'password' ? <Check className="w-4 h-4 text-vault-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* TOTP 2FA */}
                  {totpSecret && (
                    <div className="p-3 bg-shield-50/50 dark:bg-shield-950/20 rounded-2xl border border-shield-200 dark:border-shield-800 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-shield-600 dark:text-shield-400">
                          Code temporaire 2FA (TOTP)
                        </span>
                        <div className="mt-1">
                          <TotpBadge secret={totpSecret} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* URL */}
                  {url && (
                    <div className="p-3 bg-gray-50 dark:bg-slate-750 rounded-2xl border border-gray-100 dark:border-slate-700 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-400">Site Web</span>
                        <p className="text-xs sm:text-sm text-vault-600 dark:text-vault-400 underline truncate max-w-[260px]">
                          <a href={url.startsWith('http') ? url : `https://${url}`} target="_blank" rel="noreferrer">
                            {url}
                          </a>
                        </p>
                      </div>
                      <a
                        href={url.startsWith('http') ? url : `https://${url}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-xl"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  )}
                </>
              )}

              {itemType === 'card' && (
                <>
                  <div className="p-3 bg-gray-50 dark:bg-slate-750 rounded-2xl border border-gray-100 dark:border-slate-700 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-400">Numéro de carte</span>
                      <p className="font-mono font-bold text-sm text-gray-900 dark:text-white select-all">
                        {cardNumber}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(cardNumber.replace(/\s/g, ''), 'card')}
                      className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-xl"
                    >
                      {copiedField === 'card' ? <Check className="w-4 h-4 text-vault-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 bg-gray-50 dark:bg-slate-750 rounded-2xl border border-gray-100 dark:border-slate-700">
                      <span className="text-[10px] uppercase font-bold text-gray-400">Titulaire</span>
                      <p className="font-bold text-xs text-gray-900 dark:text-white uppercase truncate">
                        {cardholderName || 'Non renseigné'}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-slate-750 rounded-2xl border border-gray-100 dark:border-slate-700">
                      <span className="text-[10px] uppercase font-bold text-gray-400">Expiration</span>
                      <p className="font-mono font-bold text-xs text-gray-900 dark:text-white">
                        {expirationMonth}/{expirationYear}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 bg-gray-50 dark:bg-slate-750 rounded-2xl border border-gray-100 dark:border-slate-700 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-400">CVV</span>
                        <p className="font-mono font-bold text-xs text-gray-900 dark:text-white">
                          {showCvv ? cvv : '•••'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setShowCvv(!showCvv)}
                          className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg"
                        >
                          {showCvv ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopy(cvv, 'cvv')}
                          className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg"
                        >
                          {copiedField === 'cvv' ? <Check className="w-3.5 h-3.5 text-vault-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {pin && (
                      <div className="p-3 bg-gray-50 dark:bg-slate-750 rounded-2xl border border-gray-100 dark:border-slate-700 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-gray-400">Code PIN</span>
                          <p className="font-mono font-bold text-xs text-gray-900 dark:text-white">
                            {showPin ? pin : '••••'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowPin(!showPin)}
                          className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg"
                        >
                          {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}

              {itemType === 'note' && (
                <div className="p-3 bg-gray-50 dark:bg-slate-750 rounded-2xl border border-gray-100 dark:border-slate-700">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                    Contenu chiffré
                  </span>
                  <pre className="font-mono text-xs whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                    {noteContent}
                  </pre>
                </div>
              )}

              {notes && itemType !== 'note' && (
                <div className="p-3 bg-gray-50 dark:bg-slate-750 rounded-2xl border border-gray-100 dark:border-slate-700">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                    Notes
                  </span>
                  <p className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                    {notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-3.5 bg-gray-50 dark:bg-slate-850 border-t border-gray-100 dark:border-slate-700 flex items-center gap-2 shrink-0">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={() => {
                  if (item) setIsEditing(false);
                  else onClose();
                }}
                className="flex-1 py-2.5 rounded-2xl border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition"
              >
                Annuler
              </button>
              <button
                type="submit"
                form="vault-item-form"
                className="flex-1 py-2.5 rounded-2xl bg-vault-600 hover:bg-vault-700 text-white text-xs font-bold transition shadow-sm shadow-vault-600/30"
              >
                Enregistrer dans le coffre
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-2xl bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white text-xs font-bold hover:bg-gray-300 dark:hover:bg-slate-600 transition"
            >
              Fermer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
