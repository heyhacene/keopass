import { PasswordGeneratorOptions, PasswordStrength } from '@/types/vault';

// Liste de mots simples et mémorisables pour le mode Passphrase
const PASSPHRASE_WORDLIST = [
  'cascade', 'nuage', 'soleil', 'etoile', 'horizon', 'comete', 'riviere', 'bambou',
  'cristal', 'diamant', 'aurore', 'sommet', 'vallee', 'faucon', 'renard', 'tigre',
  'panthere', 'orque', 'delfin', 'volcan', 'foret', 'galaxie', 'oasis', 'safari',
  'palmier', 'orchidee', 'quartz', 'azur', 'ambre', 'zenith', 'tempete', 'eclair',
  'boussole', 'voyage', 'mirage', 'refuge', 'plume', 'flamme', 'lumiere', 'archipel',
  'navire', 'harmonie', 'secret', 'forteresse', 'bouclier', 'mystere', 'enigme', 'legende',
  'boreal', 'abysse', 'corail', 'fregate', 'quasar', 'nebuleuse', 'astral', 'vortex',
  'dragon', 'phoenix', 'seraphin', 'bastion', 'citadelle', 'armure', 'rubis', 'emeraude',
  'saphir', 'platine', 'dynamo', 'magma', 'glacier', 'lagune', 'canyon', 'savane'
];

/**
 * Convertit un Uint8Array en chaîne Base64
 */
function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convertit une chaîne Base64 en Uint8Array
 */
function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Dérive la clé maître de chiffrement (AES-256) et le jeton d'authentification
 * à partir du mot de passe maître et de l'identifiant (sel).
 * Utilise PBKDF2 avec SHA-256 (100 000 itérations).
 */
export async function deriveKeys(
  masterPassword: string,
  saltStr: string
): Promise<{ authHash: string; encryptionKey: CryptoKey }> {
  const enc = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(masterPassword),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const salt = enc.encode(saltStr.trim().toLowerCase() + '_passvault_salt_v1');

  // 1. Dérive 512 bits : 256 bits pour la clé de chiffrement + 256 bits pour le hash d'authentification
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    512
  );

  const encryptionKeyBits = derivedBits.slice(0, 32);
  const authHashBits = derivedBits.slice(32, 64);

  // Clé AES-256-GCM locale pour chiffrer/déchiffrer les données
  const encryptionKey = await crypto.subtle.importKey(
    'raw',
    encryptionKeyBits,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );

  // Hachage SHA-256 envoyé au serveur (ne permet JAMAIS de retrouver le mot de passe maître)
  const authHashBuffer = await crypto.subtle.digest('SHA-256', authHashBits);
  const authHash = bufferToBase64(authHashBuffer);

  return { authHash, encryptionKey };
}

/**
 * Chiffre une chaîne en clair avec AES-256-GCM.
 * Génère un IV aléatoire de 12 octets à chaque opération.
 * Retourne une chaîne Base64 compacte : [12 octets IV] + [Ciphertext + Tag 16 octets].
 */
export async function encryptData(plaintext: string, key: CryptoKey): Promise<string> {
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const cipherBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    enc.encode(plaintext)
  );

  // Concaténation de l'IV et du ciphertext
  const cipherBytes = new Uint8Array(cipherBuffer);
  const combined = new Uint8Array(iv.length + cipherBytes.length);
  combined.set(iv, 0);
  combined.set(cipherBytes, iv.length);

  return bufferToBase64(combined);
}

/**
 * Déchiffre une chaîne chiffrée avec AES-256-GCM.
 */
export async function decryptData(encryptedBase64: string, key: CryptoKey): Promise<string> {
  const combined = base64ToBuffer(encryptedBase64);
  if (combined.length < 28) {
    throw new Error('Données chiffrées invalides ou corrompues');
  }

  const iv = combined.slice(0, 12);
  const cipherBytes = combined.slice(12);

  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    cipherBytes
  );

  const dec = new TextDecoder();
  return dec.decode(decryptedBuffer);
}

/**
 * Générateur de mot de passe cryptographiquement sûr (Web Crypto API)
 */
export function generatePassword(options: PasswordGeneratorOptions): string {
  if (options.mode === 'passphrase') {
    const wordCount = Math.max(3, Math.min(8, options.wordCount || 4));
    const separator = options.wordSeparator || '-';
    const selectedWords: string[] = [];

    const randomIndices = new Uint32Array(wordCount);
    crypto.getRandomValues(randomIndices);

    for (let i = 0; i < wordCount; i++) {
      let word = PASSPHRASE_WORDLIST[randomIndices[i] % PASSPHRASE_WORDLIST.length];
      if (options.capitalizePassphrase) {
        word = word.charAt(0).toUpperCase() + word.slice(1);
      }
      selectedWords.push(word);
    }

    let result = selectedWords.join(separator);
    if (options.includeNumberInPassphrase) {
      const randomNum = crypto.getRandomValues(new Uint8Array(1))[0] % 90 + 10;
      result += separator + randomNum;
    }
    return result;
  }

  // Mode Aléatoire complexe
  let charset = '';
  const lowercaseChars = options.avoidAmbiguous ? 'abcdefghijkmnopqrstuvwxyz' : 'abcdefghijklmnopqrstuvwxyz';
  const uppercaseChars = options.avoidAmbiguous ? 'ABCDEFGHJKLMNPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numberChars = options.avoidAmbiguous ? '23456789' : '0123456789';
  const symbolChars = '!@#$%^&*()_+~|}{[]:;?><,.-=';

  const guaranteed: string[] = [];

  if (options.lowercase) {
    charset += lowercaseChars;
    guaranteed.push(getRandomChar(lowercaseChars));
  }
  if (options.uppercase) {
    charset += uppercaseChars;
    guaranteed.push(getRandomChar(uppercaseChars));
  }
  if (options.numbers) {
    charset += numberChars;
    guaranteed.push(getRandomChar(numberChars));
  }
  if (options.symbols) {
    charset += symbolChars;
    guaranteed.push(getRandomChar(symbolChars));
  }

  if (charset.length === 0) {
    charset = lowercaseChars + numberChars;
    guaranteed.push(getRandomChar(lowercaseChars));
  }

  const length = Math.max(4, Math.min(128, options.length));
  const remainingLength = Math.max(0, length - guaranteed.length);
  const randomBytes = new Uint32Array(remainingLength);
  crypto.getRandomValues(randomBytes);

  const passwordChars = [...guaranteed];
  for (let i = 0; i < remainingLength; i++) {
    passwordChars.push(charset[randomBytes[i] % charset.length]);
  }

  // Mélange de Fisher-Yates cryptographique
  for (let i = passwordChars.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [passwordChars[i], passwordChars[j]] = [passwordChars[j], passwordChars[i]];
  }

  return passwordChars.join('');
}

function getRandomChar(str: string): string {
  const index = crypto.getRandomValues(new Uint32Array(1))[0] % str.length;
  return str[index];
}

/**
 * Calculateur d'entropie et de robustesse en temps réel
 */
export function calculatePasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return {
      score: 0,
      label: 'Vide',
      color: 'text-gray-400',
      bgBar: 'bg-gray-300 dark:bg-slate-700',
      entropyBits: 0,
      feedback: 'Entrez un mot de passe pour analyser sa force',
    };
  }

  let poolSize = 0;
  if (/[a-z]/.test(password)) poolSize += 26;
  if (/[A-Z]/.test(password)) poolSize += 26;
  if (/[0-9]/.test(password)) poolSize += 10;
  if (/[^a-zA-Z0-9]/.test(password)) poolSize += 33;

  if (poolSize === 0) poolSize = 10;

  // Entropie théorique en bits = L * log2(Pool)
  const entropyBits = Math.round(password.length * Math.log2(poolSize));

  if (password.length < 8 || entropyBits < 28) {
    return {
      score: 1,
      label: 'Très faible',
      color: 'text-red-500',
      bgBar: 'bg-red-500',
      entropyBits,
      feedback: 'Trop court et facile à deviner. Visez au moins 12 caractères.',
    };
  }

  if (password.length < 11 || entropyBits < 45) {
    return {
      score: 2,
      label: 'Moyen',
      color: 'text-amber-500',
      bgBar: 'bg-amber-500',
      entropyBits,
      feedback: 'Acceptable pour un site secondaire, mais perfectible.',
    };
  }

  if (password.length < 15 || entropyBits < 70) {
    return {
      score: 3,
      label: 'Robuste',
      color: 'text-vault-500',
      bgBar: 'bg-vault-500',
      entropyBits,
      feedback: 'Très bonne protection contre les attaques par force brute.',
    };
  }

  return {
    score: 4,
    label: 'Imprenable',
    color: 'text-emerald-500',
    bgBar: 'bg-emerald-500',
    entropyBits,
    feedback: 'Sécurité maximale (niveau militaire). Impossible à pirater.',
  };
}
