'use client';

import React, { useState, useEffect } from 'react';
import { generateTOTP } from '@/lib/totp';
import { Copy, Check, Clock } from 'lucide-react';

interface TotpBadgeProps {
  secret: string;
}

export default function TotpBadge({ secret }: TotpBadgeProps) {
  const [totpData, setTotpData] = useState<{ code: string; secondsRemaining: number } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function updateCode() {
      const res = await generateTOTP(secret);
      if (isMounted && res) {
        setTotpData(res);
      }
    }

    updateCode();
    const interval = setInterval(updateCode, 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [secret]);

  if (!totpData) return null;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const rawCode = totpData.code.replace(/\s/g, '');
      await navigator.clipboard.writeText(rawCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const progressPercent = (totpData.secondsRemaining / 30) * 100;

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-2 px-2.5 py-1 rounded-xl bg-shield-50 dark:bg-shield-950/40 border border-shield-200 dark:border-shield-800 text-shield-700 dark:text-shield-300 hover:bg-shield-100 transition text-xs font-mono font-bold shadow-2xs"
      title="Cliquer pour copier le code 2FA"
    >
      <span className="tracking-wider">{totpData.code}</span>
      <div className="flex items-center gap-1 text-[10px] opacity-75 font-sans">
        <Clock className="w-3 h-3 text-shield-500" />
        <span>{totpData.secondsRemaining}s</span>
      </div>
      {copied ? (
        <Check className="w-3 h-3 text-vault-600" />
      ) : (
        <Copy className="w-3 h-3 opacity-60" />
      )}
    </button>
  );
}
