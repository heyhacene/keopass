# 🛡️ KeoPass (Suite Keo)

> Gestionnaire de mots de passe multiplateforme et coffre-fort chiffré de bout en bout (Zero-Knowledge AES-256).

---

## 🔒 Principes de Sécurité

1. **Zero-Knowledge** : Le mot de passe maître ne quitte **JAMAIS** votre appareil.
2. **Dérivation PBKDF2** : Utilise PBKDF2 avec SHA-256 (100 000 itérations) pour calculer la clé de chiffrement et un hachage d'authentification séparé.
3. **Chiffrement AES-GCM 256 bits** : Chaque élément (identifiant, carte, note) est chiffré individuellement avec un vecteur d'initialisation (IV) aléatoire de 12 octets.
4. **Purge automatique de la mémoire** : La clé maître est conservée uniquement en mémoire RAM volatile et purgée automatiquement lors du verrouillage ou après 15 minutes d'inactivité.

---

## ⚡ Fonctionnalités

* 🔑 **Identifiants & Mots de passe** : Stockage sécurisé avec détection d'URL et nom d'utilisateur.
* 💳 **Cartes bancaires** : Numéro, date d'expiration, CVV et code PIN masqués.
* 📝 **Notes sécurisées** : Blocs-notes chiffrés pour clés de récupération et phrases de passe.
* ⏱️ **Codes 2FA (TOTP) intégrés** : Générateur de codes à 6 chiffres avec compte à rebours 30 secondes (RFC 6238).
* 🎲 **Générateur de mots de passe de pointe** :
  * Mode Aléatoire complexe (longueur 8-64, majuscules, minuscules, chiffres, symboles, sans caractères ambigus).
  * Mode Phrase de passe (mots mnémotechniques mémorisables).
  * Calculateur d'entropie et de robustesse en temps réel.
* 📱 **Multiplateforme universelle** : Web, PWA (Windows, Mac, iOS, Android) et prêt pour Capacitor.
