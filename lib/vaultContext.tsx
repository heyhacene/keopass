'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { VaultItem, VaultItemType, EncryptedVaultItem } from '@/types/vault';
import { deriveKeys, encryptData, decryptData } from '@/lib/crypto';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { enableBiometric, disableBiometric } from '@/lib/biometrics';

interface VaultContextType {
  isUnlocked: boolean;
  isConfigured: boolean;
  loading: boolean;
  isSyncing: boolean;
  items: VaultItem[];
  userEmail: string;
  autoLockMinutes: number;
  masterPasswordAvailable: boolean;
  setupVault: (masterPassword: string, email: string) => Promise<boolean>;
  loginVault: (masterPassword: string, email: string) => Promise<{ success: boolean; error?: string }>;
  resetVaultLocal: () => void;
  unlockVault: (masterPassword: string) => Promise<boolean>;
  lockVault: () => void;
  addItem: (item: Omit<VaultItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateItem: (id: string, updates: Partial<Omit<VaultItem, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
  deleteItem: (id: string, permanent?: boolean) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  setAutoLockMinutes: (minutes: number) => void;
  exportVaultData: (includePlaintext?: boolean) => void;
  syncNow: () => Promise<void>;
  enableBiometricsWithCurrentSession: () => Promise<{ success: boolean; error?: string }>;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

const LOCAL_STORAGE_VAULT_KEY = 'keopass_encrypted_items_v1';
const LOCAL_STORAGE_CONFIG_KEY = 'keopass_config_v1';

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [items, setItems] = useState<VaultItem[]>([]);
  const [userEmail, setUserEmail] = useState('');
  const [autoLockMinutes, setAutoLockMinutesState] = useState(15);

  // Clé cryptographique et mot de passe stockés STRICTEMENT en mémoire RAM volatile
  const encryptionKeyRef = useRef<CryptoKey | null>(null);
  const authHashRef = useRef<string | null>(null);
  const masterPasswordRef = useRef<string | null>(null);
  const [masterPasswordAvailable, setMasterPasswordAvailable] = useState(false);
  const autoLockTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Vérifier si un coffre-fort est déjà configuré en local
  useEffect(() => {
    try {
      const configStr = localStorage.getItem(LOCAL_STORAGE_CONFIG_KEY);
      if (configStr) {
        const config = JSON.parse(configStr);
        if (config.configured && config.email) {
          setIsConfigured(true);
          setUserEmail(config.email);
          if (config.autoLockMinutes) {
            setAutoLockMinutesState(config.autoLockMinutes);
          }
        }
      }
    } catch (err) {
      console.warn('Erreur lecture configuration locale:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Réinitialisation du minuteur de verrouillage automatique à chaque interaction
  const resetAutoLockTimer = useCallback(() => {
    if (autoLockTimerRef.current) {
      clearTimeout(autoLockTimerRef.current);
    }
    if (isUnlocked && autoLockMinutes > 0) {
      autoLockTimerRef.current = setTimeout(() => {
        lockVault();
      }, autoLockMinutes * 60 * 1000);
    }
  }, [isUnlocked, autoLockMinutes]);

  useEffect(() => {
    if (!isUnlocked) return;

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    const handleActivity = () => resetAutoLockTimer();

    events.forEach((evt) => window.addEventListener(evt, handleActivity));
    resetAutoLockTimer();

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handleActivity));
      if (autoLockTimerRef.current) clearTimeout(autoLockTimerRef.current);
    };
  }, [isUnlocked, resetAutoLockTimer]);

  /**
   * Assure la session d'authentification Supabase (Connexion ou Inscription automatique)
   */
  const ensureSupabaseAuth = async (email: string, authHash: string) => {
    if (!isSupabaseConfigured()) return null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) return user;

      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password: authHash,
      });

      if (!signInErr && signInData.user) {
        return signInData.user;
      }

      // Si le compte a été créé initialement hors-ligne avant la connexion Supabase
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email,
        password: authHash,
      });

      if (!signUpErr && signUpData.user) {
        return signUpData.user;
      }
    } catch (err) {
      console.warn('Erreur ensureSupabaseAuth:', err);
    }
    return null;
  };

  /**
   * Synchronise les éléments de manière bidirectionnelle avec Supabase
   * (Pousse les éléments locaux manquants et télécharge les éléments du cloud)
   */
  const syncWithCloud = useCallback(async (key?: CryptoKey | null, email?: string, hash?: string) => {
    if (!isSupabaseConfigured()) return;
    const actualKey = key || encryptionKeyRef.current;
    if (!actualKey) return;

    try {
      setIsSyncing(true);
      let user = (await supabase.auth.getUser()).data.user;

      const configStr = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_STORAGE_CONFIG_KEY) : null;
      const config = configStr ? JSON.parse(configStr) : null;
      const emailToUse = email || userEmail || config?.email;
      const hashToUse = hash || authHashRef.current || config?.authHash;

      if (!user && emailToUse && hashToUse) {
        user = await ensureSupabaseAuth(emailToUse, hashToUse);
      }
      if (!user) return;

      // 1. Récupérer les lignes depuis Supabase
      const { data: cloudRows, error } = await supabase
        .from('vault_items')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.warn('Erreur lecture cloud:', error);
        return;
      }

      // 2. Déchiffrement des éléments du cloud
      const decryptedCloudItems: VaultItem[] = [];
      const cloudMap = new Map<string, VaultItem>();
      if (cloudRows) {
        for (const row of cloudRows) {
          try {
            const rawJson = await decryptData(row.encrypted_payload, actualKey);
            const parsed = JSON.parse(rawJson);
            const item: VaultItem = {
              id: row.id,
              type: row.type,
              name: parsed.name,
              data: parsed.data,
              favorite: row.favorite,
              folder: row.folder as any,
              createdAt: row.created_at,
              updatedAt: row.updated_at,
              deletedAt: row.deleted_at,
            };
            decryptedCloudItems.push(item);
            cloudMap.set(item.id, item);
          } catch (decErr) {
            console.warn('Erreur déchiffrement cloud:', row.id, decErr);
          }
        }
      }

      // 3. Lire les éléments stockés en local
      const localStr = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_STORAGE_VAULT_KEY) : null;
      const localItems: VaultItem[] = [];
      if (localStr) {
        try {
          const encList: EncryptedVaultItem[] = JSON.parse(localStr);
          for (const enc of encList) {
            try {
              const rawJson = await decryptData(enc.encrypted_payload, actualKey);
              const parsed = JSON.parse(rawJson);
              localItems.push({
                id: enc.id,
                type: enc.type,
                name: parsed.name,
                data: parsed.data,
                favorite: enc.favorite,
                folder: enc.folder as any,
                createdAt: enc.created_at,
                updatedAt: enc.updated_at,
                deletedAt: enc.deleted_at,
              });
            } catch {}
          }
        } catch {}
      }

      // 4. Fusionner : repérer les éléments locaux non présents sur le cloud pour les pousser
      const mergedMap = new Map<string, VaultItem>();
      const itemsToPushToCloud: VaultItem[] = [];

      // Insérer d'abord les éléments du cloud
      decryptedCloudItems.forEach((ci) => mergedMap.set(ci.id, ci));

      // Comparer avec le local
      localItems.forEach((li) => {
        const ci = mergedMap.get(li.id);
        if (!ci) {
          // Présent en local mais pas encore sur le cloud -> on le garde et on le pousse !
          mergedMap.set(li.id, li);
          itemsToPushToCloud.push(li);
        } else {
          // Conflit : conserver la version la plus récente
          const localTime = new Date(li.updatedAt).getTime();
          const cloudTime = new Date(ci.updatedAt).getTime();
          if (localTime > cloudTime) {
            mergedMap.set(li.id, li);
            itemsToPushToCloud.push(li);
          }
        }
      });

      const mergedList = Array.from(mergedMap.values());

      // 5. Pousser les nouveaux éléments locaux vers Supabase
      if (itemsToPushToCloud.length > 0) {
        const rowsToUpsert = [];
        for (const item of itemsToPushToCloud) {
          const payloadString = JSON.stringify({ name: item.name, data: item.data });
          const encryptedPayload = await encryptData(payloadString, actualKey);
          rowsToUpsert.push({
            id: item.id,
            user_id: user.id,
            type: item.type,
            encrypted_payload: encryptedPayload,
            favorite: item.favorite || false,
            folder: item.folder || 'personal',
            created_at: item.createdAt || new Date().toISOString(),
            updated_at: item.updatedAt || new Date().toISOString(),
            deleted_at: item.deletedAt || null,
          });
        }
        const { error: upsertErr } = await supabase.from('vault_items').upsert(rowsToUpsert);
        if (upsertErr) {
          console.error('Erreur upsert cloud Supabase:', upsertErr);
        }
      }

      // 6. Sauvegarder la liste fusionnée dans le localStorage chiffré
      const finalEncryptedList: EncryptedVaultItem[] = [];
      for (const item of mergedList) {
        const payloadString = JSON.stringify({ name: item.name, data: item.data });
        const encryptedPayload = await encryptData(payloadString, actualKey);
        finalEncryptedList.push({
          id: item.id,
          type: item.type,
          encrypted_payload: encryptedPayload,
          favorite: item.favorite,
          folder: item.folder,
          created_at: item.createdAt,
          updated_at: item.updatedAt,
          deleted_at: item.deletedAt,
        });
      }
      localStorage.setItem(LOCAL_STORAGE_VAULT_KEY, JSON.stringify(finalEncryptedList));

      // 7. Mettre à jour les données dans l'interface
      setItems(mergedList);
    } catch (err) {
      console.warn('Erreur synchro cloud bidirectionnelle:', err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  /**
   * Initialisation ou création de coffre
   */
  const setupVault = async (masterPassword: string, email: string): Promise<boolean> => {
    try {
      setLoading(true);
      const cleanEmail = email.trim().toLowerCase();
      const { authHash, encryptionKey } = await deriveKeys(masterPassword, cleanEmail);

      encryptionKeyRef.current = encryptionKey;
      authHashRef.current = authHash;

      if (isSupabaseConfigured()) {
        await ensureSupabaseAuth(cleanEmail, authHash);
      }

      masterPasswordRef.current = masterPassword;
      setMasterPasswordAvailable(true);

      const config = {
        configured: true,
        email: cleanEmail,
        authHash,
        createdAt: new Date().toISOString(),
        autoLockMinutes: 15,
      };

      localStorage.setItem(LOCAL_STORAGE_CONFIG_KEY, JSON.stringify(config));
      setUserEmail(cleanEmail);
      setIsConfigured(true);
      setIsUnlocked(true);

      // Si le compte avait déjà des éléments sur le cloud, les récupérer
      if (isSupabaseConfigured()) {
        await syncWithCloud(encryptionKey, cleanEmail, authHash);
      } else {
        const existingLocal = localStorage.getItem(LOCAL_STORAGE_VAULT_KEY);
        if (!existingLocal) {
          localStorage.setItem(LOCAL_STORAGE_VAULT_KEY, JSON.stringify([]));
          setItems([]);
        }
      }

      return true;
    } catch (err) {
      console.error('Erreur configuration coffre:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Connexion à un coffre existant sur un nouvel appareil
   */
  const loginVault = async (masterPassword: string, email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      const cleanEmail = email.trim().toLowerCase();
      const { authHash, encryptionKey } = await deriveKeys(masterPassword, cleanEmail);

      // Assurer l'authentification Supabase
      if (isSupabaseConfigured()) {
        const user = await ensureSupabaseAuth(cleanEmail, authHash);
        if (!user) {
          return { success: false, error: 'Identifiants invalides ou échec de connexion au Cloud.' };
        }
      }

      encryptionKeyRef.current = encryptionKey;
      authHashRef.current = authHash;
      masterPasswordRef.current = masterPassword;
      setMasterPasswordAvailable(true);

      const config = {
        configured: true,
        email: cleanEmail,
        authHash,
        createdAt: new Date().toISOString(),
        autoLockMinutes: 15,
      };

      localStorage.setItem(LOCAL_STORAGE_CONFIG_KEY, JSON.stringify(config));
      setUserEmail(cleanEmail);
      setIsConfigured(true);
      setIsUnlocked(true);

      // Récupérer et déchiffrer immédiatement tous les éléments depuis le cloud
      if (isSupabaseConfigured()) {
        await syncWithCloud(encryptionKey, cleanEmail, authHash);
      }

      return { success: true };
    } catch (err: any) {
      console.error('Erreur connexion coffre existant:', err);
      return { success: false, error: err.message || 'Une erreur est survenue lors de la connexion.' };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Réinitialise les données locales de cet appareil (déconnexion complète de l'appareil)
   */
  const resetVaultLocal = () => {
    localStorage.removeItem(LOCAL_STORAGE_CONFIG_KEY);
    localStorage.removeItem(LOCAL_STORAGE_VAULT_KEY);
    disableBiometric();
    lockVault();
    setIsConfigured(false);
    setUserEmail('');
  };

  /**
   * Déverrouillage du coffre-fort
   */
  const unlockVault = async (masterPassword: string): Promise<boolean> => {
    try {
      setLoading(true);
      const configStr = localStorage.getItem(LOCAL_STORAGE_CONFIG_KEY);
      if (!configStr) return false;

      const config = JSON.parse(configStr);
      const { authHash, encryptionKey } = await deriveKeys(masterPassword, config.email);

      // Vérification du hachage de contrôle local
      if (authHash !== config.authHash) {
        return false;
      }

      encryptionKeyRef.current = encryptionKey;
      authHashRef.current = authHash;
      masterPasswordRef.current = masterPassword;
      setMasterPasswordAvailable(true);

      // 1. Déchiffrement immédiat du stockage local (instantané & offline-first)
      const encryptedItemsStr = localStorage.getItem(LOCAL_STORAGE_VAULT_KEY);
      const decryptedList: VaultItem[] = [];

      if (encryptedItemsStr) {
        const encryptedList: EncryptedVaultItem[] = JSON.parse(encryptedItemsStr);
        for (const encItem of encryptedList) {
          try {
            const rawJson = await decryptData(encItem.encrypted_payload, encryptionKey);
            const parsed = JSON.parse(rawJson);
            decryptedList.push({
              id: encItem.id,
              type: encItem.type,
              name: parsed.name,
              data: parsed.data,
              favorite: encItem.favorite,
              folder: encItem.folder as any,
              createdAt: encItem.created_at,
              updatedAt: encItem.updated_at,
              deletedAt: encItem.deleted_at,
            });
          } catch (decErr) {
            console.error('Erreur déchiffrement élément:', encItem.id, decErr);
          }
        }
      }

      setItems(decryptedList);
      setIsUnlocked(true);

      // 2. Synchronisation bidirectionnelle immédiate avec le Cloud
      if (isSupabaseConfigured()) {
        syncWithCloud(encryptionKey, config.email, authHash);
      }

      return true;
    } catch (err) {
      console.error('Erreur déverrouillage:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Verrouille le coffre et purge toutes les clés et données de la mémoire RAM
   */
  const lockVault = () => {
    encryptionKeyRef.current = null;
    authHashRef.current = null;
    masterPasswordRef.current = null;
    setMasterPasswordAvailable(false);
    setItems([]);
    setIsUnlocked(false);
    if (autoLockTimerRef.current) {
      clearTimeout(autoLockTimerRef.current);
    }
  };

  /**
   * Sauvegarde les éléments dans le stockage local et synchronise vers Supabase
   */
  const persistEncryptedItems = async (itemList: VaultItem[]) => {
    const key = encryptionKeyRef.current;
    if (!key) throw new Error('Coffre verrouillé');

    const encryptedList: EncryptedVaultItem[] = [];
    for (const item of itemList) {
      const payloadString = JSON.stringify({
        name: item.name,
        data: item.data,
      });
      const encryptedPayload = await encryptData(payloadString, key);
      encryptedList.push({
        id: item.id,
        type: item.type,
        encrypted_payload: encryptedPayload,
        favorite: item.favorite,
        folder: item.folder,
        created_at: item.createdAt,
        updated_at: item.updatedAt,
        deleted_at: item.deletedAt,
      });
    }

    localStorage.setItem(LOCAL_STORAGE_VAULT_KEY, JSON.stringify(encryptedList));

    // Synchronisation vers Supabase
    if (isSupabaseConfigured()) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const rowsToUpsert = encryptedList.map((enc) => ({
            id: enc.id,
            user_id: user.id,
            type: enc.type,
            encrypted_payload: enc.encrypted_payload,
            favorite: enc.favorite,
            folder: enc.folder || 'personal',
            created_at: enc.created_at,
            updated_at: enc.updated_at,
            deleted_at: enc.deleted_at || null,
          }));

          await supabase.from('vault_items').upsert(rowsToUpsert);
        }
      } catch (cloudSyncErr) {
        console.warn('Erreur push cloud:', cloudSyncErr);
      }
    }
  };

  /**
   * Ajoute un nouvel élément chiffré
   */
  const addItem = async (
    itemData: Omit<VaultItem, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    const now = new Date().toISOString();
    const newItem: VaultItem = {
      ...itemData,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };

    const nextList = [newItem, ...items];
    setItems(nextList);
    await persistEncryptedItems(nextList);
  };

  /**
   * Modifie un élément existant
   */
  const updateItem = async (
    id: string,
    updates: Partial<Omit<VaultItem, 'id' | 'createdAt' | 'updatedAt'>>
  ) => {
    const now = new Date().toISOString();
    const nextList = items.map((item) =>
      item.id === id ? { ...item, ...updates, updatedAt: now } : item
    );
    setItems(nextList);
    await persistEncryptedItems(nextList);
  };

  /**
   * Supprime un élément (ou le déplace dans la corbeille)
   */
  const deleteItem = async (id: string, permanent = false) => {
    let nextList: VaultItem[];
    if (permanent) {
      nextList = items.filter((item) => item.id !== id);
      // Supprimer également du cloud
      if (isSupabaseConfigured()) {
        try {
          await supabase.from('vault_items').delete().eq('id', id);
        } catch {}
      }
    } else {
      const now = new Date().toISOString();
      nextList = items.map((item) =>
        item.id === id ? { ...item, deletedAt: now } : item
      );
    }
    setItems(nextList);
    await persistEncryptedItems(nextList);
  };

  /**
   * Bascule l'état favori d'un élément
   */
  const toggleFavorite = async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    await updateItem(id, { favorite: !item.favorite });
  };

  const setAutoLockMinutes = (minutes: number) => {
    setAutoLockMinutesState(minutes);
    try {
      const configStr = localStorage.getItem(LOCAL_STORAGE_CONFIG_KEY);
      if (configStr) {
        const config = JSON.parse(configStr);
        config.autoLockMinutes = minutes;
        localStorage.setItem(LOCAL_STORAGE_CONFIG_KEY, JSON.stringify(config));
      }
    } catch {}
  };

  /**
   * Exporte les données du coffre (sauvegarde chiffrée ou export texte clair)
   */
  const exportVaultData = (includePlaintext = false) => {
    let content = '';
    let fileName = '';

    if (includePlaintext) {
      content = JSON.stringify(items, null, 2);
      fileName = `keopass_backup_plaintext_${new Date().toISOString().slice(0, 10)}.json`;
    } else {
      const encryptedStr = localStorage.getItem(LOCAL_STORAGE_VAULT_KEY) || '[]';
      content = JSON.stringify({
        exportedAt: new Date().toISOString(),
        email: userEmail,
        vault: JSON.parse(encryptedStr),
      }, null, 2);
      fileName = `keopass_backup_encrypted_${new Date().toISOString().slice(0, 10)}.json`;
    }

    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const syncNow = async () => {
    if (encryptionKeyRef.current) {
      await syncWithCloud(encryptionKeyRef.current);
    }
  };

  const enableBiometricsWithCurrentSession = async (): Promise<{ success: boolean; error?: string }> => {
    if (!masterPasswordRef.current || !userEmail) {
      return { success: false, error: 'Mot de passe maître non disponible en mémoire.' };
    }
    return await enableBiometric(masterPasswordRef.current, userEmail);
  };

  return (
    <VaultContext.Provider
      value={{
        isUnlocked,
        isConfigured,
        loading,
        isSyncing,
        items,
        userEmail,
        autoLockMinutes,
        masterPasswordAvailable,
        setupVault,
        loginVault,
        resetVaultLocal,
        unlockVault,
        lockVault,
        addItem,
        updateItem,
        deleteItem,
        toggleFavorite,
        setAutoLockMinutes,
        exportVaultData,
        syncNow,
        enableBiometricsWithCurrentSession,
      }}
    >
      {children}
    </VaultContext.Provider>
  );
}

export function useVault() {
  const context = useContext(VaultContext);
  if (!context) {
    throw new Error('useVault doit être utilisé à l’intérieur d’un VaultProvider');
  }
  return context;
}
