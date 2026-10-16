/**
 * KEO PASS — MOTEUR DE PARTAGE SÉCURISÉ ÉPHÉMÈRE & ZERO-KNOWLEDGE
 * Chiffrement de bout en bout AES-GCM 256 bits côté client.
 * La clé secrète est placée dans le fragment d'URL (#) et n'est JAMAIS transmise au serveur.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export interface SharedSecretPayload {
  title: string;
  username?: string;
  password?: string;
  url?: string;
  notes?: string;
  expiresAt: string; // ISO date
  oneTime: boolean;
  createdAt: string;
}

// Convertit Buffer <-> Base64URL
function bufferToBase64Url(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBuffer(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4 === 0 ? '' : '='.repeat(4 - (base64.length % 4));
  const binary = atob(base64 + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Génère une clé AES-GCM 256 bits et chiffre le secret
 */
export async function createEncryptedShareLink(
  payload: Omit<SharedSecretPayload, 'createdAt'>,
  baseUrl: string = typeof window !== 'undefined' ? window.location.origin : 'https://keopass.vercel.app'
): Promise<{ shareUrl: string; shareId: string; expiresAt: string }> {
  // 1. Générer une clé aléatoire forte
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  const rawKey = await crypto.subtle.exportKey('raw', key);
  const keyBase64 = bufferToBase64Url(rawKey);

  // 2. Chiffrer le payload
  const fullPayload: SharedSecretPayload = {
    ...payload,
    createdAt: new Date().toISOString(),
  };

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const encodedData = enc.encode(JSON.stringify(fullPayload));

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encodedData
  );

  // Concatène IV + Ciphertext
  const combined = new Uint8Array(iv.length + cipherBuffer.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipherBuffer), iv.length);

  const dataBase64 = bufferToBase64Url(combined);

  // 3. ID de partage unique
  const shareId = Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // 4. Stockage en base de données Supabase si configuré (avec gestion gracieuse en cas d'absence de table)
  if (isSupabaseConfigured()) {
    try {
      await supabase.from('shared_secrets').insert({
        id: shareId,
        encrypted_payload: dataBase64,
        expires_at: payload.expiresAt,
        one_time: payload.oneTime,
        created_at: fullPayload.createdAt,
      });
    } catch (dbErr) {
      console.warn('Sauvegarde cloud Supabase ignorée (fallback fragment actif):', dbErr);
    }
  }

  // 5. Stockage local de sauvegarde
  try {
    const localSharesStr = localStorage.getItem('keopass_shared_secrets_v1') || '{}';
    const localShares = JSON.parse(localSharesStr);
    localShares[shareId] = {
      payload: dataBase64,
      expiresAt: payload.expiresAt,
      oneTime: payload.oneTime,
    };
    localStorage.setItem('keopass_shared_secrets_v1', JSON.stringify(localShares));
  } catch (_) {}

  // 6. Construction de l'URL avec les secrets dans le fragment (#)
  // Les fragments # ne sont jamais envoyés au serveur Web
  const shareUrl = `${baseUrl}/share#id=${shareId}&k=${keyBase64}&d=${dataBase64}`;

  return {
    shareUrl,
    shareId,
    expiresAt: payload.expiresAt,
  };
}

/**
 * Déchiffre un secret partagé à partir des paramètres du fragment d'URL
 */
export async function decryptSharedSecret(
  keyBase64: string,
  dataBase64: string
): Promise<SharedSecretPayload> {
  const rawKey = base64UrlToBuffer(keyBase64);
  const combined = base64UrlToBuffer(dataBase64);

  if (combined.length < 13) {
    throw new Error('Données chiffrées invalides ou corrompues.');
  }

  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  const key = await crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  const dec = new TextDecoder();
  const jsonStr = dec.decode(decryptedBuffer);
  const payload = JSON.parse(jsonStr) as SharedSecretPayload;

  // Vérifier la date d'expiration
  if (new Date(payload.expiresAt) < new Date()) {
    throw new Error('Ce lien sécurisé a expiré et a été détruit.');
  }

  return payload;
}
