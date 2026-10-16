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
  Fingerprint,
  ChevronRight,
  Share2,
} from 'lucide-react';

interface VaultItemCardProps {
  item: VaultItem;
  onSelect: (item: VaultItem) => void;
  onShare?: (item: VaultItem) => void;
}

const POPULAR_SERVICES = [
  'google', 'apple', 'microsoft', 'amazon', 'facebook', 'instagram', 'twitter', 'x',
  'netflix', 'spotify', 'zalando', 'github', 'gitlab', 'discord', 'linkedin', 'paypal',
  'uber', 'airbnb', 'reddit', 'tiktok', 'steam', 'playstation', 'xbox', 'dropbox',
  'notion', 'figma', 'slack', 'ebay', 'aliexpress', 'leboncoin', 'doctolib', 'impots',
  'ameli', 'caf', 'orange', 'sfr', 'free', 'bouygues', 'enedis'
];

function getDomainFromItem(item: VaultItem): string | null {
  if (item.type !== 'login') return null;
  const data = item.data as LoginData;
  if (data?.url) {
    try {
      const u = data.url.startsWith('http://') || data.url.startsWith('https://') 
        ? data.url 
        : `https://${data.url}`;
      const parsed = new URL(u);
      if (parsed.hostname) {
        return parsed.hostname.replace(/^www\./, '');
      }
    } catch {
      // ignore
    }
  }
  if (item.name) {
    const trimmed = item.name.trim().toLowerCase();
    if (trimmed.includes('.')) {
      return trimmed.replace(/^www\./, '');
    }
    const clean = trimmed.replace(/[^a-z0-9]/g, '');
    if (POPULAR_SERVICES.some((s) => clean === s || clean.startsWith(s))) {
      return `${clean}.com`;
    }
  }
  return null;
}

export default function VaultItemCard({ item, onSelect, onShare }: VaultItemCardProps) {
  const { toggleFavorite } = useVault();
  const [copiedField, setCopiedField] = useState<'password' | 'card' | null>(null);
  const [faviconError, setFaviconError] = useState(false);

  const domain = getDomainFromItem(item);

  const copyToClipboard = async (text: string, field: 'password' | 'card', e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1800);
    } catch {}
  };

  const renderIcon = () => {
    if (item.type === 'login') {
      if (domain && !faviconError) {
        return (
          <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-750 p-2 flex items-center justify-center shrink-0 border border-gray-100 dark:border-slate-700 shadow-2xs">
            <img
              src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`}
              alt=""
              className="w-5 h-5 rounded-xs object-contain"
              onError={() => setFaviconError(true)}
              loading="lazy"
            />
          </div>
        );
      }
      return (
        <div className="w-10 h-10 rounded-2xl bg-vault-50 dark:bg-vault-950/60 text-vault-600 dark:text-vault-400 flex items-center justify-center shrink-0 border border-vault-100 dark:border-vault-900/40">
          <KeyRound className="w-5 h-5" />
        </div>
      );
    }

    if (item.type === 'card') {
      return (
        <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-100 dark:border-amber-900/40">
          <CreditCard className="w-5 h-5" />
        </div>
      );
    }

    if (item.type === 'note') {
      return (
        <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-100 dark:border-purple-900/40">
          <FileText className="w-5 h-5" />
        </div>
      );
    }

    return (
      <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/40">
        <UserCheck className="w-5 h-5" />
      </div>
    );
  };

  const renderDetails = () => {
    if (item.type === 'login') {
      const data = item.data as LoginData;
      return (
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h4 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
              {item.name}
            </h4>
            {data.totpSecret && <TotpBadge secret={data.totpSecret} />}
            {data.passkey && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40 flex items-center gap-1 shrink-0">
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
          <h4 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
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
          <h4 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
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
        <h4 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
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
      className="p-3 sm:p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700/60 hover:border-vault-300 dark:hover:border-vault-700/70 shadow-xs hover:shadow-sm transition-all cursor-pointer flex items-center justify-between gap-3 group active:scale-[0.995]"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {renderIcon()}
        {renderDetails()}
      </div>

      {/* ACTIONS RAPIDES PROPRES & ÉPURÉES */}
      <div className="flex items-center gap-1 shrink-0">
        {/* BOUTON COPIER RAPIDE */}
        {item.type === 'login' && (item.data as LoginData).password && (
          <button
            type="button"
            onClick={(e) => copyToClipboard((item.data as LoginData).password, 'password', e)}
            className={`p-2 rounded-xl transition ${
              copiedField === 'password'
                ? 'bg-vault-100 dark:bg-vault-950 text-vault-700 dark:text-vault-300'
                : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700/60'
            }`}
            title="Copier le mot de passe"
          >
            {copiedField === 'password' ? (
              <Check className="w-4 h-4 text-vault-600 dark:text-vault-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        )}

        {item.type === 'card' && (item.data as CardData).cardNumber && (
          <button
            type="button"
            onClick={(e) => copyToClipboard((item.data as CardData).cardNumber.replace(/\s/g, ''), 'card', e)}
            className={`p-2 rounded-xl transition ${
              copiedField === 'card'
                ? 'bg-vault-100 dark:bg-vault-950 text-vault-700 dark:text-vault-300'
                : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700/60'
            }`}
            title="Copier le numéro de carte"
          >
            {copiedField === 'card' ? (
              <Check className="w-4 h-4 text-vault-600 dark:text-vault-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        )}

        {/* BOUTON PARTAGE RAPIDE SUR GRAND ÉCRAN (AU SURVOL) */}
        {onShare && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onShare(item);
            }}
            className="hidden sm:inline-flex p-2 text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-slate-700/60 rounded-xl transition opacity-0 group-hover:opacity-100"
            title="Partager de manière sécurisée"
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
              ? 'text-amber-500 hover:text-amber-600'
              : 'text-gray-300 dark:text-slate-600 hover:text-amber-500'
          }`}
          title={item.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          <Star className={`w-4 h-4 ${item.favorite ? 'fill-amber-500' : ''}`} />
        </button>

        {/* CHEVRON DISCRET */}
        <ChevronRight className="w-4 h-4 text-gray-300 dark:text-slate-600 group-hover:text-gray-500 dark:group-hover:text-slate-400 transition-colors" />
      </div>
    </div>
  );
}
