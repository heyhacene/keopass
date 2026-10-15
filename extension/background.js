// ========================================================
// KEOPASS BROWSER EXTENSION — BACKGROUND SERVICE WORKER
// ========================================================

const SUPABASE_URL = 'https://qvfmfstwrkcerzlbemzb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2Zm1mc3R3cmtjZXJ6bGJlbXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwNjE1NDksImV4cCI6MjEwNzYzNzU0OX0.-VCES2YX_FDjWct12sTgTaDtfqnqUfXfPcMS39UmRBs';

let volatileEncryptionKey = null;
let volatileAuthHash = null;
let volatileAccessToken = null;
let volatileUserId = null;
let volatileItems = [];
let currentUserEmail = '';
let isUnlocked = false;

// Convertit un ArrayBuffer/Uint8Array en Base64
function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convertit Base64 en Uint8Array
function base64ToBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Dérive la clé AES-256 et l'authHash de manière 100% identique à l'application Web KeoPass
async function deriveKeys(masterPassword, email) {
  const enc = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(masterPassword),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const salt = enc.encode(email.trim().toLowerCase() + '_keopass_salt_v1');

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

  const encryptionKey = await crypto.subtle.importKey(
    'raw',
    encryptionKeyBits,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );

  const authHashBuffer = await crypto.subtle.digest('SHA-256', authHashBits);
  const authHash = bufferToBase64(authHashBuffer);

  return { authHash, encryptionKey };
}

async function encryptData(plaintext, key) {
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext)
  );

  const combined = new Uint8Array(iv.length + cipherBuffer.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipherBuffer), iv.length);

  return bufferToBase64(combined);
}

async function decryptData(cipherBase64, key) {
  const combined = base64ToBuffer(cipherBase64);
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);

  const decryptedBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  return new TextDecoder().decode(decryptedBuf);
}

function extractDomain(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

// Synchronisation avec Supabase Cloud
async function fetchCloudItems(token, key) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/vault_items?select=*&order=updated_at.desc`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) return [];

    const rows = await res.json();
    const items = [];
    for (const row of rows) {
      if (row.deleted_at) continue;
      try {
        const rawJson = await decryptData(row.encrypted_payload, key);
        const parsed = JSON.parse(rawJson);
        items.push({
          id: row.id,
          type: row.type,
          name: parsed.name,
          data: parsed.data,
          favorite: row.favorite,
          updatedAt: row.updated_at,
        });
      } catch (decErr) {
        console.warn('Erreur déchiffrement item:', decErr);
      }
    }
    return items;
  } catch (err) {
    console.warn('Erreur fetch cloud:', err);
    return [];
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
        const cleanEmail = email.trim().toLowerCase();
        const { authHash, encryptionKey } = await deriveKeys(password, cleanEmail);

        volatileEncryptionKey = encryptionKey;
        volatileAuthHash = authHash;
        currentUserEmail = cleanEmail;

        // Authentification Supabase
        try {
          const authRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({
              email: cleanEmail,
              password: authHash,
            }),
          });

          if (authRes.ok) {
            const authData = await authRes.json();
            volatileAccessToken = authData.access_token;
            volatileUserId = authData.user?.id;
          } else {
            // Tentative d'inscription si premier usage avec ce hash
            try {
              const signUpRes = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  apikey: SUPABASE_ANON_KEY,
                },
                body: JSON.stringify({
                  email: cleanEmail,
                  password: authHash,
                }),
              });
              if (signUpRes.ok) {
                const signUpData = await signUpRes.json();
                volatileAccessToken = signUpData.access_token || signUpData.session?.access_token;
                volatileUserId = signUpData.user?.id;
              }
            } catch (sErr) {
              console.warn('Erreur tentative signup:', sErr);
            }
          }

          if (volatileAccessToken) {
            // Récupérer les éléments depuis Supabase
            const cloudItems = await fetchCloudItems(volatileAccessToken, encryptionKey);
            volatileItems = cloudItems;
          }
        } catch (authErr) {
          console.warn('Mode hors-ligne ou erreur auth Supabase:', authErr);
        }

        // Si le cloud n'a pas répondu ou pas d'items, lire le stockage local
        if (volatileItems.length === 0) {
          const stored = await chrome.storage.local.get(['keopass_vault_encrypted']);
          if (stored.keopass_vault_encrypted && Array.isArray(stored.keopass_vault_encrypted)) {
            for (const encItem of stored.keopass_vault_encrypted) {
              try {
                const raw = await decryptData(encItem.encrypted_payload, encryptionKey);
                const parsed = JSON.parse(raw);
                volatileItems.push({
                  id: encItem.id,
                  type: encItem.type,
                  name: parsed.name,
                  data: parsed.data,
                });
              } catch (err) {
                console.warn('Erreur déchiffrement item local:', err);
              }
            }
          }
        }

        isUnlocked = true;
        sendResponse({ success: true, count: volatileItems.length });
      } catch (err) {
        console.error('Erreur déverrouillage extension:', err);
        sendResponse({ success: false, error: 'Email ou mot de passe maître invalide' });
      }
    })();
    return true;
  }

  if (request.action === 'LOCK') {
    volatileEncryptionKey = null;
    volatileAuthHash = null;
    volatileAccessToken = null;
    volatileUserId = null;
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

        volatileItems.push(newItem);

        // Chiffrer en AES-256
        const payloadString = JSON.stringify({ name, data: newItem.data });
        const encryptedPayload = await encryptData(payloadString, volatileEncryptionKey);

        // Sauvegarder dans Supabase Cloud si connecté
        if (volatileAccessToken && volatileUserId) {
          try {
            await fetch(`${SUPABASE_URL}/rest/v1/vault_items`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${volatileAccessToken}`,
                Prefer: 'resolution=merge-duplicates',
              },
              body: JSON.stringify({
                id: newItem.id,
                user_id: volatileUserId,
                type: 'login',
                encrypted_payload: encryptedPayload,
                favorite: false,
                folder: 'personal',
                updated_at: new Date().toISOString(),
              }),
            });
          } catch (syncErr) {
            console.warn('Erreur push cloud Supabase:', syncErr);
          }
        }

        // Sauvegarder aussi dans le stockage local de l'extension
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
