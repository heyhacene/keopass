import { PasskeyInfo } from '@/types/vault';

// Helpers Base64URL
function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlToBuffer(base64url: string): ArrayBuffer {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Vérifie si le navigateur et l'appareil supportent WebAuthn / Passkeys
 */
export async function isPasskeySupported(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!window.PublicKeyCredential) return false;
  try {
    if (typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
      return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Enregistre une nouvelle Passkey (WebAuthn / FIDO2) sur l'appareil
 */
export async function createPasskeyCredential(
  rpName: string,
  userName: string,
  targetUrl?: string
): Promise<{ success: boolean; passkey?: PasskeyInfo; error?: string }> {
  try {
    if (!window.PublicKeyCredential) {
      return { success: false, error: 'WebAuthn non supporté sur ce navigateur.' };
    }

    // Déterminer le Relying Party ID
    let currentHost = 'keopass.vercel.app';
    if (typeof window !== 'undefined' && window.location && window.location.hostname) {
      currentHost = window.location.hostname;
    }

    let rpId = currentHost;
    if (targetUrl) {
      try {
        const parsed = new URL(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`);
        // Note: Selon les specs WebAuthn, rpId doit correspondre au domaine courant.
        // On stocke le domaine cible pour l'affichage, mais pour la signature on utilise le domaine actuel.
      } catch {}
    }

    // Générer un challenge aléatoire sécurisé de 32 octets
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    // ID utilisateur unique
    const userId = new TextEncoder().encode(userName || 'keopass-user-' + Date.now());

    const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
      challenge,
      rp: {
        name: rpName || 'KeoPass Coffre-fort',
        id: rpId === 'localhost' ? undefined : rpId,
      },
      user: {
        id: userId,
        name: userName || 'Utilisateur KeoPass',
        displayName: userName || 'Utilisateur KeoPass',
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },   // ES256 (ECDSA P-256)
        { alg: -257, type: 'public-key' }, // RS256 (RSA)
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'preferred',
        residentKey: 'preferred',
      },
      timeout: 60000,
      attestation: 'none',
    };

    const credential = (await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions,
    })) as PublicKeyCredential | null;

    if (!credential) {
      return { success: false, error: 'Enregistrement annulé par l’utilisateur.' };
    }

    const credentialId = bufferToBase64Url(credential.rawId);

    const passkey: PasskeyInfo = {
      credentialId,
      rpId: rpName || rpId,
      userName: userName || 'Inconnu',
      createdAt: new Date().toISOString(),
      transports: ['internal'],
    };

    return { success: true, passkey };
  } catch (err: any) {
    if (err.name === 'NotAllowedError') {
      return { success: false, error: 'Demande refusée ou délai d’authentification expiré.' };
    }
    return { success: false, error: err.message || 'Échec de la création de la Passkey.' };
  }
}

/**
 * Valide / Authentifie avec une Passkey enregistrée (test ou connexion)
 */
export async function authenticateWithPasskey(
  passkey: PasskeyInfo
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!window.PublicKeyCredential) {
      return { success: false, error: 'WebAuthn non supporté.' };
    }

    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    let currentHost = 'keopass.vercel.app';
    if (typeof window !== 'undefined' && window.location && window.location.hostname) {
      currentHost = window.location.hostname;
    }

    const rawIdBuffer = base64UrlToBuffer(passkey.credentialId);

    const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
      challenge,
      rpId: currentHost === 'localhost' ? undefined : currentHost,
      allowCredentials: [
        {
          id: rawIdBuffer,
          type: 'public-key',
          transports: ['internal'],
        },
      ],
      userVerification: 'preferred',
      timeout: 60000,
    };

    const assertion = await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions,
    });

    if (!assertion) {
      return { success: false, error: 'Authentification refusée.' };
    }

    return { success: true };
  } catch (err: any) {
    if (err.name === 'NotAllowedError') {
      return { success: false, error: 'Vérification biométrique refusée ou annulée.' };
    }
    return { success: false, error: err.message || 'Échec de la vérification.' };
  }
}
