'use client';

import React, { useState } from 'react';
import { VaultItem, LoginData, CardData, NoteData, IdentityData } from '@/types/vault';
import { useVault } from '@/lib/vaultContext';
import TotpBadge from './TotpBadge';
import {
  KeyRound,
  CreditCard,
  FileText,
  UserCheck,
  Star,
  Copy,
  Check,
  ExternalLink,
  Eye,
  EyeOff,
  Share2,
  Fingerprint,
} from 'lucide-react';

interface VaultItemCardProps {
  item: VaultItem;
  onSelect: (item: VaultItem) => void;
  onShare?: (item: VaultItem) => void;
}

export default function VaultItemCard({ item, onSelect, onShare }: VaultItemCardProps) {
  const { toggleFavorite } = useVault();
  const [copiedField, setCopiedField] = useState<'username' | 'password' | 'card' | null>(null);

  const copyToClipboard = async (text: string, field: 'username' | 'password' | 'card', e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {}
  };

  const renderIcon = () => {
    switch (item.type) {
      case 'card':
        return (
          <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
        );
      case 'note':
        return (
          <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
        );
      case 'identity':
        return (
          <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
        );
      case 'login':
      default:
        return (
          <div className="w-10 h-10 rounded-2xl bg-vault-100 dark:bg-vault-950/50 text-vault-600 dark:text-vault-400 flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5" />
          </div>
        );
    }
  };

  const renderDetails = () => {
    if (item.type === 'login') {
      const data = item.data as LoginData;
      return (
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate">
              {item.name}
            </h4>
            {data.totpSecret && <TotpBadge secret={data.totpSecret} />}
            {data.passkey && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center gap-1 shrink-0">
                <Fingerprint className="w-3 h-3" />
                <span>Passkey</span>
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
            {data.username || (data.url ? new URL(data.url.startsWith('http') ? data.url : `https://${data.url}`).hostname : 'Sans identifiant')}
          </p>
        </div>
      );
    }

    if (item.type === 'card') {
      const data = item.data as CardData;
      const last4 = data.cardNumber ? data.cardNumber.replace(/\s/g, '').slice(-4) : '••••';
      return (
        <div className="min-w-0 flex-1">
          <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate">
            {item.name}
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
            •••• •••• •••• {last4} {data.expirationMonth && data.expirationYear ? `(${data.expirationMonth}/${data.expirationYear})` : ''}
          </p>
        </div>
      );
    }

    if (item.type === 'note') {
      const data = item.data as NoteData;
      return (
        <div className="min-w-0 flex-1">
          <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate">
            {item.name}
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
            {data.content || 'Note vide'}
          </p>
        </div>
      );
    }

    const data = item.data as IdentityData;
    return (
      <div className="min-w-0 flex-1">
        <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate">
          {item.name}
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
          {data.fullName || data.email || 'Identité'}
        </p>
      </div>
    );
  };

  return (
    <div
      onClick={() => onSelect(item)}
      className="p-3.5 bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700/80 hover:border-vault-300 dark:hover:border-vault-700 shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-3 group"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {renderIcon()}
        {renderDetails()}
      </div>

      {/* ACTIONS RAPIDES AU SURVOL / SUR MOBILE */}
      <div className="flex items-center gap-1 shrink-0">
        {item.type === 'login' && (
          <>
            {(item.data as LoginData).username && (
              <button
                type="button"
                onClick={(e) => copyToClipboard((item.data as LoginData).username, 'username', e)}
                className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition"
                title="Copier l'identifiant / email"
              >
                {copiedField === 'username' ? (
                  <Check className="w-4 h-4 text-vault-600" />
                ) : (
                  <UserCheck className="w-4 h-4" />
                )}
              </button>
            )}

            {(item.data as LoginData).password && (
              <button
                type="button"
                onClick={(e) => copyToClipboard((item.data as LoginData).password, 'password', e)}
                className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition"
                title="Copier le mot de passe"
              >
                {copiedField === 'password' ? (
                  <Check className="w-4 h-4 text-vault-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            )}
          </>
        )}

        {item.type === 'card' && (item.data as CardData).cardNumber && (
          <button
            type="button"
            onClick={(e) => copyToClipboard((item.data as CardData).cardNumber.replace(/\s/g, ''), 'card', e)}
            className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition"
            title="Copier le numéro de carte"
          >
            {copiedField === 'card' ? (
              <Check className="w-4 h-4 text-vault-600" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        )}

        {/* BOUTON PARTAGE SÉCURISÉ */}
        {onShare && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onShare(item);
            }}
            className="p-2 text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-slate-700 rounded-xl transition"
            title="Partager de manière sécurisée (lien éphémère)"
          >
            <Share2 className="w-4 h-4" />
          </button>
        )}

        {/* ÉTOILE FAVORIS */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(item.id);
          }}
          className={`p-2 rounded-xl transition ${
            item.favorite
              ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40'
              : 'text-gray-300 dark:text-slate-600 hover:text-amber-500'
          }`}
          title={item.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          <Star className={`w-4 h-4 ${item.favorite ? 'fill-amber-500' : ''}`} />
        </button>
      </div>
    </div>
  );
}
