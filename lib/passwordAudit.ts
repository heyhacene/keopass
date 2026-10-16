/**
 * KEO PASS — MOTEUR D'AUDIT DE SÉCURITÉ & FUITE DE DONNÉES
 * Modèle Zero-Knowledge via k-Anonymat (Troy Hunt / HaveIBeenPwned API)
 * 
 * Sécurité absolue :
 * 1. Le mot de passe en clair n'est JAMAIS envoyé sur le réseau.
 * 2. Seuls les 5 premiers caractères du hash SHA-1 sont transmis à l'API.
 * 3. La comparaison du suffixe restant (35 caractères) se fait STRICTEMENT en mémoire locale.
 */

import { VaultItem } from '@/types/vault';

export interface AuditResultItem {
  item: VaultItem;
  password: string;
  isBreached: boolean;
  breachCount: number;
  isReused: boolean;
  reuseCount: number;
  strength: 'weak' | 'medium' | 'strong';
  strengthScore: number; // 0 à 100
  strengthReasons: string[];
  hasTotp: boolean;
  daysOld?: number;
}

export interface VaultAuditReport {
  overallScore: number; // 0 à 100
  totalLogins: number;
  breachedCount: number;
  reusedCount: number;
  weakCount: number;
  strongCount: number;
  missingTotpCount: number;
  items: AuditResultItem[];
  scannedAt: Date;
}

// Cache local des préfixes SHA-1 pour éviter de réinterroger l'API pour les doublons
const pwnedPrefixCache = new Map<string, Record<string, number>>();

/**
 * Calcule le SHA-1 d'une chaîne de caractères en majuscules (Web Crypto API native)
 */
async function computeSha1Hex(str: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

/**
 * Interroge l'API HaveIBeenPwned via k-Anonymat (5 premiers caractères SHA-1)
 * Retourne le nombre de fois que ce mot de passe apparaît dans des fuites publiques.
 */
export async function checkPasswordBreach(password: string): Promise<number> {
  if (!password || password.length === 0) return 0;

  try {
    const fullHash = await computeSha1Hex(password);
    const prefix = fullHash.substring(0, 5);
    const suffix = fullHash.substring(5);

    let suffixesMap = pwnedPrefixCache.get(prefix);

    if (!suffixesMap) {
      // Appel API HaveIBeenPwned public (CORS autorisé, anonymat garanti)
      const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
        headers: {
          'Add-Padding': 'true', // Protection avancée contre l'analyse de taille réseau
        },
      });

      if (!res.ok) {
        console.warn(`PwnedPasswords API returned status ${res.status}`);
        return 0;
      }

      const text = await res.text();
      suffixesMap = {};

      const lines = text.split('\r\n');
      for (const line of lines) {
        const parts = line.split(':');
        if (parts.length === 2) {
          suffixesMap[parts[0].trim()] = parseInt(parts[1].trim(), 10) || 0;
        }
      }

      pwnedPrefixCache.set(prefix, suffixesMap);
    }

    return suffixesMap[suffix] || 0;
  } catch (err) {
    console.warn('Erreur lors de la vérification HaveIBeenPwned:', err);
    return 0;
  }
}

/**
 * Évalue la robustesse d'un mot de passe (score de 0 à 100)
 */
export function evaluatePasswordStrength(password: string): {
  strength: 'weak' | 'medium' | 'strong';
  score: number;
  reasons: string[];
} {
  if (!password) {
    return { strength: 'weak', score: 0, reasons: ['Mot de passe vide'] };
  }

  let score = 0;
  const reasons: string[] = [];

  // Longueur
  const len = password.length;
  if (len < 8) {
    reasons.push('Trop court (moins de 8 caractères)');
    score += len * 3;
  } else if (len < 12) {
    reasons.push('Longueur moyenne (recommandé : 14+ caractères)');
    score += 30 + (len - 8) * 5;
  } else if (len < 16) {
    score += 55 + (len - 12) * 5;
  } else {
    score += 75 + Math.min(25, (len - 16) * 3);
  }

  // Diversité des caractères
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigits = /[0-9]/.test(password);
  const hasSymbols = /[^a-zA-Z0-9]/.test(password);

  let typesCount = 0;
  if (hasLower) typesCount++;
  if (hasUpper) typesCount++;
  if (hasDigits) typesCount++;
  if (hasSymbols) typesCount++;

  if (typesCount <= 1) {
    reasons.push('Un seul type de caractères utilisé');
    score = Math.min(score, 30);
  } else if (typesCount === 2) {
    reasons.push('Peu de variété de caractères');
    score = Math.min(score, 50);
  } else if (typesCount === 3) {
    score += 15;
  } else {
    score += 25;
  }

  // Motifs évidents et répétitions
  const commonPatterns = ['123456', 'password', 'azerty', 'qwerty', 'admin', 'motdepasse', '0000', '1111'];
  const lower = password.toLowerCase();
  for (const pat of commonPatterns) {
    if (lower.includes(pat)) {
      reasons.push(`Contient un motif courant (${pat})`);
      score = Math.max(10, score - 35);
      break;
    }
  }

  if (/(.)\1{3,}/.test(password)) {
    reasons.push('Contient des répétitions consécutives');
    score = Math.max(15, score - 20);
  }

  const finalScore = Math.max(5, Math.min(100, Math.round(score)));

  let strength: 'weak' | 'medium' | 'strong' = 'medium';
  if (finalScore < 45) strength = 'weak';
  else if (finalScore >= 75) strength = 'strong';

  return { strength, score: finalScore, reasons };
}

/**
 * Lance l'audit complet du coffre-fort KeoPass
 */
export async function runVaultSecurityAudit(
  items: VaultItem[],
  onProgress?: (processed: number, total: number) => void
): Promise<VaultAuditReport> {
  const loginItems = items.filter(
    (item) => item.type === 'login' && !item.deletedAt && (item.data as any)?.password
  );

  const total = loginItems.length;
  if (total === 0) {
    return {
      overallScore: 100,
      totalLogins: 0,
      breachedCount: 0,
      reusedCount: 0,
      weakCount: 0,
      strongCount: 0,
      missingTotpCount: 0,
      items: [],
      scannedAt: new Date(),
    };
  }

  // 1. Détection des doublons / mots de passe réutilisés
  const passwordUsageMap = new Map<string, number>();
  for (const item of loginItems) {
    const pwd = (item.data as any)?.password || '';
    if (pwd) {
      passwordUsageMap.set(pwd, (passwordUsageMap.get(pwd) || 0) + 1);
    }
  }

  // 2. Analyse détaillée de chaque élément
  const results: AuditResultItem[] = [];
  let processed = 0;

  for (const item of loginItems) {
    const data = item.data as any;
    const pwd = data?.password || '';
    const reuseCount = passwordUsageMap.get(pwd) || 1;
    const isReused = reuseCount > 1;

    // Analyse de robustesse
    const { strength, score, reasons } = evaluatePasswordStrength(pwd);

    // Analyse de fuite de données
    const breachCount = await checkPasswordBreach(pwd);
    const isBreached = breachCount > 0;

    const hasTotp = Boolean(data?.totpSecret && data.totpSecret.trim().length > 0);

    results.push({
      item,
      password: pwd,
      isBreached,
      breachCount,
      isReused,
      reuseCount,
      strength,
      strengthScore: score,
      strengthReasons: reasons,
      hasTotp,
    });

    processed++;
    if (onProgress) {
      onProgress(processed, total);
    }
  }

  // 3. Calcul des statistiques globales
  const breachedCount = results.filter((r) => r.isBreached).length;
  const reusedCount = results.filter((r) => r.isReused).length;
  const weakCount = results.filter((r) => r.strength === 'weak').length;
  const strongCount = results.filter((r) => r.strength === 'strong').length;
  const missingTotpCount = results.filter((r) => !r.hasTotp).length;

  // Calcul du score global (pénalités pour failles graves)
  let scoreTotal = 100;
  // Les fuites sont très pénalisantes (-25 points par mot de passe fuité, max -60)
  scoreTotal -= Math.min(60, (breachedCount / total) * 100 * 0.6);
  // Les réutilisations sont pénalisantes (-20 points, max -30)
  scoreTotal -= Math.min(30, (reusedCount / total) * 100 * 0.3);
  // Les mots de passe faibles pénalisent (-20 points, max -30)
  scoreTotal -= Math.min(30, (weakCount / total) * 100 * 0.3);

  // Bonus si 2FA est activé
  const totpRatio = (total - missingTotpCount) / total;
  scoreTotal += Math.round(totpRatio * 10);

  const overallScore = Math.max(10, Math.min(100, Math.round(scoreTotal)));

  return {
    overallScore,
    totalLogins: total,
    breachedCount,
    reusedCount,
    weakCount,
    strongCount,
    missingTotpCount,
    items: results,
    scannedAt: new Date(),
  };
}
