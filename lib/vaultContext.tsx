'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { VaultItem, VaultItemType, EncryptedVaultItem } from '@/types/vault';
import { deriveKeys, encryptData, decryptData } from '@/lib/crypto';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

interface VaultContextType {
  isUnlocked: boolean;
  isConfigured: boolean;
  loading: boolean;
  isSyncing: boolean;
  items: VaultItem[];
  userEmail: string;
  autoLockMinutes: number;
  setupVault: (masterPassword: string, email: string) => Promise<boolean>;
  unlockVault: (masterPassword: string) => Promise<boolean>;
  lockVault: () => void;
  addItem: (item: Omit<VaultItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateItem: (id: string, updates: Partial<Omit<VaultItem, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
  deleteItem: (id: string, permanent?: boolean) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  setAutoLockMinutes: (minutes: number) => void;
  exportVaultData: (includePlaintext?: boolean) => void;
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

  // Clé cryptographique stockée STRICTEMENT en mémoire RAM volatile
  const encryptionKeyRef = useRef<CryptoKey | null>(null);
  const authHashRef = useRef<string | null>(null);
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
   * Synchronise les éléments chiffrés avec Supabase en arrière-plan
   */
  const syncWithCloud = useCallback(async (key: CryptoKey) => {
    if (!isSupabaseConfigured()) return;
    try {
      setIsSyncing(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: cloudRows, error } = await supabase
        .from('vault_items')
        .select('*')
        .eq('user_id', user.id);

      if (error || !cloudRows) return;

      // Déchiffrement des éléments du cloud
      const decryptedCloudItems: VaultItem[] = [];
      for (const row of cloudRows) {
        try {
          const rawJson = await decryptData(row.encrypted_payload, key);
          const parsed = JSON.parse(rawJson);
          decryptedCloudItems.push({
            id: row.id,
            type: row.type,
            name: parsed.name,
            data: parsed.data,
            favorite: row.favorite,
            folder: row.folder as any,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            deletedAt: row.deleted_at,
          });
        } catch (decErr) {
          console.warn('Erreur déchiffrement cloud:', row.id, decErr);
        }
      }

      // Fusion avec mise à jour des éléments
      setItems((currentItems) => {
        const itemMap = new Map<string, VaultItem>();
        currentItems.forEach((i) => itemMap.set(i.id, i));

        decryptedCloudItems.forEach((cloudItem) => {
          const localItem = itemMap.get(cloudItem.id);
          if (!localItem) {
            itemMap.set(cloudItem.id, cloudItem);
          } else {
            // Prendre la version la plus récente
            const localTime = new Date(localItem.updatedAt).getTime();
            const cloudTime = new Date(cloudItem.updatedAt).getTime();
            if (cloudTime > localTime) {
              itemMap.set(cloudItem.id, cloudItem);
            }
          }
        });

        const merged = Array.from(itemMap.values());
        // Mise en cache locale du résultat fusionné
        return merged;
      });
    } catch (err) {
      console.warn('Erreur synchro cloud:', err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  /**
   * Initialisation d'un tout nouveau coffre-fort
   */
  const setupVault = async (masterPassword: string, email: string): Promise<boolean> => {
    try {
      setLoading(true);
      const cleanEmail = email.trim().toLowerCase();
      const { authHash, encryptionKey } = await deriveKeys(masterPassword, cleanEmail);

      encryptionKeyRef.current = encryptionKey;
      authHashRef.current = authHash;

      // Inscription ou connexion Supabase avec authHash
      if (isSupabaseConfigured()) {
        try {
          const { error: signUpErr } = await supabase.auth.signUp({
            email: cleanEmail,
            password: authHash,
          });
          if (signUpErr && signUpErr.message.includes('already registered')) {
            await supabase.auth.signInWithPassword({
              email: cleanEmail,
              password: authHash,
            });
          }
        } catch (authErr) {
          console.warn('Erreur auth Supabase:', authErr);
        }
      }

      const config = {
        configured: true,
        email: cleanEmail,
        authHash,
        createdAt: new Date().toISOString(),
        autoLockMinutes: 15,
      };

      localStorage.setItem(LOCAL_STORAGE_CONFIG_KEY, JSON.stringify(config));
      localStorage.setItem(LOCAL_STORAGE_VAULT_KEY, JSON.stringify([]));

      setUserEmail(cleanEmail);
      setIsConfigured(true);
      setIsUnlocked(true);
      setItems([]);
      return true;
    } catch (err) {
      console.error('Erreur configuration coffre:', err);
      return false;
    } finally {
      setLoading(false);
    }
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

      // 2. Connexion Supabase et synchronisation en arrière-plan
      if (isSupabaseConfigured()) {
        try {
          await supabase.auth.signInWithPassword({
            email: config.email,
            password: authHash,
          });
          syncWithCloud(encryptionKey);
        } catch (cloudErr) {
          console.warn('Erreur connexion cloud:', cloudErr);
        }
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
        setupVault,
        unlockVault,
        lockVault,
        addItem,
        updateItem,
        deleteItem,
        toggleFavorite,
        setAutoLockMinutes,
        exportVaultData,
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
