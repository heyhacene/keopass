export type VaultItemType = 'login' | 'card' | 'note' | 'identity';

export type VaultFolder = 'personal' | 'work' | 'finance' | 'family' | 'other';

export interface LoginData {
  url?: string;
  username: string;
  password: string;
  totpSecret?: string;
  notes?: string;
}

export interface CardData {
  cardholderName: string;
  cardNumber: string;
  expirationMonth: string;
  expirationYear: string;
  cvv: string;
  pin?: string;
  cardType?: 'visa' | 'mastercard' | 'amex' | 'cb' | 'other';
  notes?: string;
}

export interface NoteData {
  content: string;
}

export interface CustomField {
  id: string;
  label: string;
  value: string;
  isSecret?: boolean;
}

export interface IdentityData {
  fullName?: string;
  email?: string;
  phone?: string;
  address?: string;
  passportNumber?: string;
  customFields?: CustomField[];
  notes?: string;
}

export type VaultPayload = LoginData | CardData | NoteData | IdentityData;

export interface VaultItem {
  id: string;
  type: VaultItemType;
  name: string;
  folder?: VaultFolder;
  favorite: boolean;
  data: VaultPayload;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface EncryptedVaultItem {
  id: string;
  user_id?: string;
  type: VaultItemType;
  encrypted_payload: string; // Base64(IV + Tag + Ciphertext)
  favorite: boolean;
  folder?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface PasswordGeneratorOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
  avoidAmbiguous: boolean;
  mode: 'random' | 'passphrase';
  wordCount?: number;
  wordSeparator?: string;
  includeNumberInPassphrase?: boolean;
  capitalizePassphrase?: boolean;
}

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string;
  bgBar: string;
  entropyBits: number;
  feedback: string;
}
