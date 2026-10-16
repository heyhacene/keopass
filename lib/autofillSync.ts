import { registerPlugin, Capacitor } from '@capacitor/core';
import { VaultItem } from '@/types/vault';

export interface AutofillStatus {
  supported: boolean;
  enabled: boolean;
  isDefaultService: boolean;
  credentialCount: number;
}

interface KeoPassAutofillPlugin {
  getStatus(): Promise<AutofillStatus>;
  openAutofillSettings(): Promise<void>;
  syncCredentials(options: { credentials: any[] }): Promise<{ count: number }>;
  clearCredentials(): Promise<void>;
}

const KeoPassAutofill = registerPlugin<KeoPassAutofillPlugin>('KeoPassAutofill');

/**
 * Récupère le statut du service Android de saisie automatique
 */
export async function getAutofillStatus(): Promise<AutofillStatus> {
  if (!Capacitor.isNativePlatform()) {
    return { supported: false, enabled: false, isDefaultService: false, credentialCount: 0 };
  }
  try {
    return await KeoPassAutofill.getStatus();
  } catch (e) {
    console.warn('KeoPassAutofill.getStatus error:', e);
    return { supported: false, enabled: false, isDefaultService: false, credentialCount: 0 };
  }
}

/**
 * Ouvre directement l'écran des paramètres Android pour choisir KeoPass comme service par défaut
 */
export async function openAutofillSettings(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    await KeoPassAutofill.openAutofillSettings();
    return true;
  } catch (e) {
    console.error('KeoPassAutofill.openAutofillSettings error:', e);
    return false;
  }
}

/**
 * Synchronise les identifiants du coffre déchiffré dans le stockage natif privé Android
 * pour que le clavier (Gboard, Samsung Keyboard) puisse proposer les suggestions instantanément
 */
export async function syncVaultToAutofill(items: VaultItem[]): Promise<number> {
  if (!Capacitor.isNativePlatform()) return 0;
  try {
    const logins = items
      .filter((item) => item.type === 'login' && !item.deletedAt)
      .map((item) => {
        const data: any = item.data || {};
        const domains: string[] = [];
        if (data.url) {
          try {
            let urlStr = data.url.trim();
            if (!urlStr.startsWith('http://') && !urlStr.startsWith('https://')) {
              urlStr = 'https://' + urlStr;
            }
            const host = new URL(urlStr).hostname.replace(/^www\./, '').toLowerCase();
            if (host) domains.push(host);
          } catch (err) {
            // URL non standard ignorée
          }
        }
        return {
          id: item.id,
          title: item.name || 'KeoPass',
          username: data.username || '',
          password: data.password || '',
          url: data.url || '',
          domains,
        };
      })
      .filter((cred) => cred.username || cred.password);

    const res = await KeoPassAutofill.syncCredentials({ credentials: logins });
    return res.count;
  } catch (e) {
    console.warn('KeoPassAutofill.syncCredentials error:', e);
    return 0;
  }
}

/**
 * Purge les identifiants du cache autofill (ex: lors de la déconnexion ou purge du coffre)
 */
export async function clearAutofillCache(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await KeoPassAutofill.clearCredentials();
  } catch (e) {
    // Ignore
  }
}
