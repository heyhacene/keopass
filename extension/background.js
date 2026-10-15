// ========================================================
// KEOPASS BROWSER EXTENSION — BACKGROUND SERVICE WORKER
// ========================================================

let volatileEncryptionKey = null;
let volatileItems = [];
let currentUserEmail = '';
let isUnlocked = false;

// Fonctions cryptographiques WebCrypto compatibles avec KeoPass Web
async function deriveKey(masterPassword, email) {
  const enc = new TextEncoder();
  const salt = enc.encode(`keopass_salt_v1:${email.trim().toLowerCase()}`);
  const passKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(masterPassword),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptData(plaintext, key) {
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encryptedBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext)
  );

  const combined = new Uint8Array(iv.length + encryptedBuf.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encryptedBuf), iv.length);

  let binary = '';
  for (let i = 0; i < combined.byteLength; i++) {
    binary += String.fromCharCode(combined[i]);
  }
  return btoa(binary);
}

async function decryptData(cipherBase64, key) {
  const binary = atob(cipherBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  const iv = bytes.slice(0, 12);
  const data = bytes.slice(12);

  const decryptedBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  return new TextDecoder().decode(decryptedBuf);
}

// Extraction du nom de domaine propre
function extractDomain(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

// Écouteur de messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'GET_STATUS') {
    sendResponse({
      isUnlocked,
      userEmail: currentUserEmail,
      itemCount: volatileItems.length,
    });
    return true;
  }

  if (request.action === 'UNLOCK') {
    (async () => {
      try {
        const { email, password } = request;
        const key = await deriveKey(password, email);
        volatileEncryptionKey = key;
        currentUserEmail = email.toLowerCase().trim();

        // Récupérer les données chiffrées stockées dans l'extension
        const stored = await chrome.storage.local.get(['keopass_vault_encrypted']);
        let decryptedItems = [];

        if (stored.keopass_vault_encrypted && Array.isArray(stored.keopass_vault_encrypted)) {
          for (const encItem of stored.keopass_vault_encrypted) {
            try {
              const raw = await decryptData(encItem.encrypted_payload, key);
              const parsed = JSON.parse(raw);
              decryptedItems.push({
                id: encItem.id,
                type: encItem.type,
                name: parsed.name,
                data: parsed.data,
              });
            } catch (err) {
              console.warn('Erreur déchiffrement item:', err);
            }
          }
        }

        volatileItems = decryptedItems;
        isUnlocked = true;
        sendResponse({ success: true, count: volatileItems.length });
      } catch (err) {
        console.error('Erreur déverrouillage extension:', err);
        sendResponse({ success: false, error: 'Mot de passe ou email incorrect' });
      }
    })();
    return true;
  }

  if (request.action === 'LOCK') {
    volatileEncryptionKey = null;
    volatileItems = [];
    isUnlocked = false;
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'GET_MATCHING_LOGINS') {
    const tabUrl = request.url || '';
    const domain = extractDomain(tabUrl);

    if (!isUnlocked || !domain) {
      sendResponse({ matches: [] });
      return true;
    }

    const matches = volatileItems
      .filter((item) => {
        if (item.type !== 'login') return false;
        const itemUrl = item.data?.url || '';
        const itemName = (item.name || '').toLowerCase();
        const itemDomain = extractDomain(itemUrl);

        return (
          (itemDomain && domain.includes(itemDomain)) ||
          (itemDomain && itemDomain.includes(domain)) ||
          itemName.includes(domain.split('.')[0])
        );
      })
      .map((item) => ({
        id: item.id,
        name: item.name,
        username: item.data?.username || '',
        password: item.data?.password || '',
      }));

    sendResponse({ matches });
    return true;
  }

  if (request.action === 'SAVE_LOGIN') {
    (async () => {
      try {
        if (!isUnlocked || !volatileEncryptionKey) {
          sendResponse({ success: false, error: 'Coffre verrouillé' });
          return;
        }

        const { domain, url, username, password } = request;
        const name = domain.charAt(0).toUpperCase() + domain.slice(1);

        const newItem = {
          id: crypto.randomUUID(),
          type: 'login',
          name,
          data: {
            username,
            password,
            url,
          },
        };

        // Ajouter en mémoire
        volatileItems.push(newItem);

        // Chiffrer et enregistrer dans le stockage local
        const payloadString = JSON.stringify({ name, data: newItem.data });
        const encryptedPayload = await encryptData(payloadString, volatileEncryptionKey);

        const stored = await chrome.storage.local.get(['keopass_vault_encrypted']);
        const currentList = stored.keopass_vault_encrypted || [];
        currentList.push({
          id: newItem.id,
          type: 'login',
          encrypted_payload: encryptedPayload,
          updated_at: new Date().toISOString(),
        });

        await chrome.storage.local.set({ keopass_vault_encrypted: currentList });
        sendResponse({ success: true, item: newItem });
      } catch (err) {
        console.error('Erreur sauvegarde identifiant:', err);
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  return true;
});
