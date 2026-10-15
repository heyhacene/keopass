/**
 * Décodeur Base32 standard (RFC 4648) pour clés secrètes 2FA (Google Authenticator, etc.)
 */
function base32ToBuffer(base32: string): Uint8Array {
  const clean = base32.toUpperCase().replace(/[\s=-]/g, '');
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (let i = 0; i < clean.length; i++) {
    const idx = alphabet.indexOf(clean[i]);
    if (idx === -1) continue; // ignorer les caractères invalides

    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return new Uint8Array(output);
}

/**
 * Génère le code TOTP 2FA à 6 chiffres selon la spécification RFC 6238
 * @param secret Clé secrète 2FA fournie par le site (ex: "JBSWY3DPEHPK3PXP")
 * @returns { code: string; secondsRemaining: number }
 */
export async function generateTOTP(
  secret: string
): Promise<{ code: string; secondsRemaining: number } | null> {
  if (!secret || secret.trim().length === 0) return null;

  try {
    const keyBytes = base32ToBuffer(secret);
    if (keyBytes.length === 0) return null;

    const epochSeconds = Math.floor(Date.now() / 1000);
    const step = 30; // Standard 30 secondes
    const counter = Math.floor(epochSeconds / step);
    const secondsRemaining = step - (epochSeconds % step);

    // Convertit le compteur 64 bits Big-Endian
    const counterBuffer = new ArrayBuffer(8);
    const counterView = new DataView(counterBuffer);
    counterView.setUint32(0, 0, false);
    counterView.setUint32(4, counter, false);

    // Importation de la clé secrète pour HMAC-SHA1
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBytes as unknown as BufferSource,
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );

    // Signature HMAC
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, counterBuffer);
    const sigBytes = new Uint8Array(signature);

    // Dynamic Truncation (RFC 4226)
    const offset = sigBytes[sigBytes.length - 1] & 0x0f;
    const binary =
      ((sigBytes[offset] & 0x7f) << 24) |
      ((sigBytes[offset + 1] & 0xff) << 16) |
      ((sigBytes[offset + 2] & 0xff) << 8) |
      (sigBytes[offset + 3] & 0xff);

    const otp = binary % 1000000;
    const formattedCode = otp.toString().padStart(6, '0');

    return {
      code: `${formattedCode.slice(0, 3)} ${formattedCode.slice(3)}`,
      secondsRemaining,
    };
  } catch (err) {
    console.warn('Erreur calcul TOTP:', err);
    return null;
  }
}
