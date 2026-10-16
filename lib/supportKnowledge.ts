export interface SupportAction {
  label: string;
  type: 'open_import' | 'open_settings' | 'open_generator' | 'open_download_apk' | 'open_web' | 'open_dar';
  url?: string;
}

export interface SupportFAQ {
  id: string;
  title: string;
  keywords: string[];
  answer: string;
  quickQuestion: string;
  action?: SupportAction;
}

export const SUPPORT_FAQS: SupportFAQ[] = [
  {
    id: 'import-passwords',
    title: 'Importer vos mots de passe (Chrome, Firefox, Bitwarden...)',
    quickQuestion: 'Comment importer mes mots de passe depuis un autre navigateur ?',
    keywords: [
      'import',
      'importer',
      'rapatrier',
      'transferer',
      'chrome',
      'firefox',
      'bitwarden',
      'adblock',
      'total adblock',
      'edge',
      'safari',
      'csv',
      'json',
      'gestionnaire',
    ],
    answer: `### 📥 Rapatrier vos mots de passe dans KeoPass

Vous pouvez importer facilement vos identifiants depuis n'importe quel navigateur ou gestionnaire :

1. **Depuis Google Chrome ou Microsoft Edge :**
   * Ouvrez Chrome > **Paramètres** > **Remplissage automatique et mots de passe** > **Gestionnaire de mots de passe**.
   * Cliquez sur **Paramètres** (roue crantée à gauche) > **Exporter les mots de passe** (fichier \`.csv\`).
2. **Depuis Mozilla Firefox :**
   * Ouvrez Firefox > Menu (☰) > **Identifiants et mots de passe**.
   * Cliquez sur les 3 petits points en haut à droite > **Exporter les identifiants** (fichier \`.csv\`).
3. **Depuis Total Adblock ou Bitwarden :**
   * Exportez votre coffre au format CSV ou JSON.
4. **Dans KeoPass :**
   * Cliquez sur le bouton vert **« Importer »** dans la barre en haut ou le menu latéral.
   * Déposez votre fichier : KeoPass détecte automatiquement les colonnes, filtre les doublons et chiffre tous vos mots de passe avec votre clé AES-256 locale.`,
    action: {
      label: 'Ouvrir l’outil d’importation',
      type: 'open_import',
    },
  },
  {
    id: 'biometrics-setup',
    title: 'Activer et utiliser l’empreinte digitale (Biométrie)',
    quickQuestion: 'Comment déverrouiller KeoPass avec mon empreinte digitale ?',
    keywords: [
      'empreinte',
      'biometrie',
      'biometrique',
      'doigt',
      'touch id',
      'face id',
      'deverrouiller',
      'keystore',
      'capteur',
    ],
    answer: `### 👆 Déverrouillage par empreinte digitale

KeoPass utilise le coffre sécurisé matériel de votre smartphone (**Android Keystore**) pour vous authentifier instantanément :

* **À la connexion :**
  Lors de votre saisie de mot de passe, laissez cochée la case **« Activer l’empreinte digitale pour les prochains déverrouillages »**.
* **Au lancement suivant :**
  Dès l'ouverture de l'application, le capteur d'empreinte natif de votre smartphone s'affiche directement.
* **Pour gérer ou tester l'empreinte :**
  Rendez-vous dans les **Paramètres** (icône d'engrenage) > section **Sécurité & Empreinte digitale** pour tester ou réinitialiser votre accès biométrique.

> *Astuce : Si le capteur ne s'affiche pas, assurez-vous d'avoir enregistré au moins une empreinte dans les paramètres Android de votre téléphone.*`,
    action: {
      label: 'Ouvrir les Paramètres',
      type: 'open_settings',
    },
  },
  {
    id: 'zero-knowledge-security',
    title: 'Chiffrement et Sécurité Zero-Knowledge',
    quickQuestion: 'Mes mots de passe sont-ils lisibles par d’autres personnes ?',
    keywords: [
      'securite',
      'chiffrement',
      'chiffrer',
      'zero-knowledge',
      'aes',
      'aes-256',
      'piratage',
      'confidentialite',
      'supabase',
      'cloud',
      'fuite',
      'pwned',
      'oubli',
    ],
    answer: `### 🛡️ Sécurité Zero-Knowledge absolue

KeoPass applique une politique stricte de **Zero-Knowledge** :

1. **Chiffrement local sur votre appareil :**
   Tous vos mots de passe, cartes et notes sont chiffrés en **AES-256-GCM** avec une clé dérivée de votre mot de passe maître (**PBKDF2** à 100 000 itérations).
2. **Le serveur ne sait rien :**
   Seules les données chiffrées indéchiffrables sont synchronisées sur le cloud (Supabase). Même en cas d'accès direct à la base de données, personne (ni hébergeur, ni pirate) ne peut lire vos secrets sans votre mot de passe maître.
3. **Purge automatique en mémoire :**
   La clé de déchiffrement n'est conservée qu'en mémoire vive (RAM volatile) et purgée dès le verrouillage de l'application.

> ⚠️ **Important :** Ne perdez pas votre mot de passe maître, car par sécurité absolue, aucun mécanisme de réinitialisation à distance n'existe.`,
  },
  {
    id: 'update-apk',
    title: 'Mises à jour et téléchargement de l’APK Android',
    quickQuestion: 'Comment installer la dernière mise à jour de KeoPass sur Android ?',
    keywords: [
      'mise a jour',
      'maj',
      'apk',
      'telecharger',
      'installer',
      'android',
      'release',
      'version',
      'nouvelle version',
      'github',
    ],
    answer: `### 📱 Mettre à jour KeoPass sur Android

Les mises à jour de KeoPass sont compilées automatiquement et disponibles en téléchargement direct :

1. Ouvrez les **Paramètres** de KeoPass (icône d'engrenage en haut à droite).
2. Dans le bloc **Application Android (APK) & Mises à jour**, cliquez sur **« Télécharger le dernier APK KeoPass »**.
3. Une fois le fichier \`KeoPass.apk\` téléchargé, appuyez dessus pour lancer l'installation.
4. Android vous proposera de mettre à jour l'application : acceptez, toutes vos données et vos identifiants enregistrés seront **intégralement conservés** !`,
    action: {
      label: 'Télécharger le dernier APK (v1.0.0)',
      type: 'open_download_apk',
      url: 'https://github.com/heyhacene/keopass/releases/latest/download/KeoPass.apk',
    },
  },
  {
    id: 'web-version',
    title: 'Accéder à KeoPass sur le Web et PC',
    quickQuestion: 'Comment utiliser KeoPass depuis mon ordinateur ou navigateur ?',
    keywords: [
      'web',
      'ordinateur',
      'pc',
      'mac',
      'navigateur',
      'vercel',
      'site',
      'ligne',
      'lien web',
    ],
    answer: `### 🌐 Version Web de KeoPass

KeoPass est accessible depuis n'importe quel navigateur (ordinateur, Mac, tablette) à l'adresse :
**[https://keopass.vercel.app](https://keopass.vercel.app)**

* **Synchronisation fluide :** Connectez-vous avec vos identifiants Supabase habituels et déverrouillez votre coffre avec votre même mot de passe maître.
* **Sécurité identique :** Le déchiffrement se fait entièrement dans votre navigateur local sans que rien ne transite en clair.
* **Raccourci :** Vous trouverez un lien direct vers la version Web dans les paramètres et le menu latéral de l'application.`,
    action: {
      label: 'Ouvrir la version Web (Vercel)',
      type: 'open_web',
      url: 'https://keopass.vercel.app',
    },
  },
  {
    id: 'password-generator',
    title: 'Générateur de mots de passe et robustesse',
    quickQuestion: 'Comment générer un mot de passe fort et sécurisé ?',
    keywords: [
      'generateur',
      'generer',
      'mot de passe fort',
      'robuste',
      'phrase de passe',
      'aleatoire',
      'longueur',
      'entropie',
    ],
    answer: `### 🎲 Le Générateur de mots de passe KeoPass

KeoPass intègre un générateur conforme aux recommandations de l'ANSSI :

1. Cliquez sur le bouton **« Générateur »** dans la barre de navigation.
2. Choisissez votre mode :
   * **Aléatoire complexe :** Ajustez la longueur (12 à 64 caractères), incluez des majuscules, minuscules, chiffres et symboles.
   * **Phrase de passe :** Génère une combinaison de mots faciles à mémoriser mais impossibles à deviner pour une machine.
3. L'indicateur d'entropie calcule en temps réel la résistance face aux attaques par force brute.`,
    action: {
      label: 'Ouvrir le Générateur',
      type: 'open_generator',
    },
  },
  {
    id: 'totp-2fa',
    title: 'Codes d’authentification à deux facteurs (2FA / TOTP)',
    quickQuestion: 'Comment ajouter un code 2FA pour sécuriser mes comptes ?',
    keywords: [
      '2fa',
      'totp',
      'double facteur',
      'authentification',
      'code a 6 chiffres',
      'authenticator',
      'compte a rebours',
    ],
    answer: `### ⏱️ Codes 2FA (TOTP) intégrés

KeoPass remplace avantageusement des applications comme Google Authenticator :

1. Lors de la modification ou création d'un identifiant, remplissez le champ **Clé secrète 2FA (TOTP)** (fournie par votre service sous forme de chaîne de caractères du type \`JBSWY3DPEHPK3PXP\`).
2. KeoPass génère alors automatiquement un **code à 6 chiffres renouvelé toutes les 30 secondes** (RFC 6238).
3. Cliquez sur le code pour le copier instantanément dans votre presse-papiers avec purge automatique au bout de 30 secondes.`,
  },
  {
    id: 'keo-family-dar',
    title: 'Keo Family (Dar) & Rendez-vous Doctolib',
    quickQuestion: 'Comment synchroniser mes rendez-vous Doctolib dans Keo Family ?',
    keywords: [
      'dar',
      'keo family',
      'famille',
      'doctolib',
      'agenda',
      'calendrier',
      'ics',
      'rendez-vous',
      'planning',
    ],
    answer: `### 🏡 Keo Family (Dar) & Rendez-vous Doctolib

Keo Family est votre application d'organisation familiale :

* **Ajout automatique depuis Doctolib :**
  Lors de la prise d'un rendez-vous sur Doctolib, cliquez sur **« Ajouter à mon agenda »**. Votre smartphone Android vous proposera directement d'ouvrir avec **Keo Family**, qui enregistrera le médecin, la date, l'heure et l'adresse dans le calendrier partagé.
* **Fichiers de calendrier (.ics) :**
  Tout fichier de calendrier reçu par email, WhatsApp ou SMS peut être ouvert directement dans Keo Family.
* **Notifications :**
  Des alertes système apparaissent dans le volet de notification de votre smartphone avant chaque rendez-vous.`,
    action: {
      label: 'Accéder à Keo Family (dar.otsmane.fr)',
      type: 'open_dar',
      url: 'https://dar.otsmane.fr',
    },
  },
];

/**
 * Normalise un texte (supprime accents, ponctuation, espaces multiples)
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Moteur de recherche sémantique local pour trouver la réponse la plus pertinente
 */
export function findBestAnswer(query: string): { faq: SupportFAQ; score: number } | null {
  const cleanQuery = normalizeText(query);
  if (!cleanQuery) return null;

  const queryTokens = cleanQuery.split(' ').filter((t) => t.length > 2);
  let bestMatch: SupportFAQ | null = null;
  let highestScore = 0;

  for (const faq of SUPPORT_FAQS) {
    let score = 0;
    const cleanTitle = normalizeText(faq.title);
    const cleanQuestion = normalizeText(faq.quickQuestion);
    const keywords = faq.keywords.map(normalizeText);

    // 1. Correspondance exacte sur les mots-clés
    for (const kw of keywords) {
      if (cleanQuery.includes(kw)) {
        score += kw.length > 5 ? 8 : 5;
      }
    }

    // 2. Correspondance sur les tokens individuels
    for (const token of queryTokens) {
      if (keywords.some((kw) => kw.includes(token))) score += 3;
      if (cleanTitle.includes(token)) score += 4;
      if (cleanQuestion.includes(token)) score += 3;
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = faq;
    }
  }

  if (bestMatch && highestScore >= 5) {
    return { faq: bestMatch, score: highestScore };
  }

  return null;
}

/**
 * Appel direct à l'API Google Gemini 1.5 Flash (si une clé API est fournie)
 */
export async function askGeminiAssistant(
  prompt: string,
  history: { role: 'user' | 'model'; parts: { text: string }[] }[],
  apiKey: string
): Promise<string> {
  const systemInstruction = `Tu es l'Assistant Support officiel de KeoPass (coffre-fort et gestionnaire de mots de passe Zero-Knowledge AES-256) et Keo Family (application d'organisation familiale Dar).
Ton rôle est d'aider les utilisateurs avec bienveillance, clarté et précision technique.

Règles de sécurité fondamentales :
- Tu n'as AUCUN accès aux mots de passe ou au contenu du coffre de l'utilisateur. Rappelle-le si l'utilisateur demande à consulter ses secrets.
- Ne demande JAMAIS à l'utilisateur de te communiquer son mot de passe maître ou une clé secrète.
- Explique les étapes pas à pas de façon lisible avec des puces et du gras.
- Si la question concerne l'import de mots de passe (Chrome, Firefox, Bitwarden, etc.), explique comment exporter en CSV depuis le navigateur et utiliser le bouton "Importer" de KeoPass.
- Si la question concerne l'empreinte digitale, explique qu'elle s'active en cochant la case à la saisie du mot de passe maître et s'enregistre dans le Keystore Android.
- Si la question concerne la version Web, donne le lien officiel https://keopass.vercel.app.
- Si la question concerne Keo Family / Dar, donne le lien https://dar.otsmane.fr et mentionne l'intégration Doctolib (.ics).`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const contents = [
    ...history,
    {
      role: 'user',
      parts: [{ text: prompt }],
    },
  ];

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents,
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000,
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData?.error?.message || `Erreur Gemini API (${response.status} ${response.statusText})`
    );
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Réponse vide de l’assistant IA.');
  }

  return text;
}
