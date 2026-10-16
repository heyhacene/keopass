package fr.keo.pass.autofill;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;
import org.json.JSONArray;
import org.json.JSONObject;
import java.net.URLDecoder;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class KeoPassAutofillRepository {
    private static final String TAG = "KeoPassAutofillRepo";
    private static final String PREF_NAME = "keopass_autofill_storage";
    private static final String KEY_CREDENTIALS = "credentials_cache";

    // Mots techniques et generiques a BANNIR des correspondances de marque
    private static final Set<String> STOP_WORDS = new HashSet<>(Arrays.asList(
        "account", "accounts", "login", "auth", "signin", "connexion",
        "connect", "compte", "comptes", "password", "pass", "mdp", "motdepasse",
        "portal", "identity", "secure", "sso", "oauth", "oauth2", "user", "email",
        "default", "web", "app", "mobile", "authenticate", "callback", "redirect"
    ));

    private final SharedPreferences prefs;

    public KeoPassAutofillRepository(Context context) {
        this.prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
    }

    public synchronized void saveCredentials(String jsonArrayString) {
        prefs.edit().putString(KEY_CREDENTIALS, jsonArrayString).apply();
    }

    public synchronized void clear() {
        prefs.edit().remove(KEY_CREDENTIALS).apply();
    }

    public synchronized int getCredentialCount() {
        return getAll().size();
    }

    public synchronized List<AutofillCredential> getAll() {
        List<AutofillCredential> list = new ArrayList<>();
        String raw = prefs.getString(KEY_CREDENTIALS, null);
        if (raw == null || raw.isEmpty()) return list;
        try {
            JSONArray arr = new JSONArray(raw);
            for (int i = 0; i < arr.length(); i++) {
                JSONObject obj = arr.getJSONObject(i);
                list.add(AutofillCredential.fromJSON(obj));
            }
        } catch (Exception e) {
            Log.e(TAG, "Erreur parsing identifiants autofill", e);
        }
        return list;
    }

    private static class ScoredCredential implements Comparable<ScoredCredential> {
        final AutofillCredential credential;
        final int score;

        ScoredCredential(AutofillCredential credential, int score) {
            this.credential = credential;
            this.score = score;
        }

        @Override
        public int compareTo(ScoredCredential other) {
            return Integer.compare(other.score, this.score);
        }
    }

    public synchronized List<AutofillCredential> findMatches(
            String targetDomain,
            String targetPackage,
            String windowTitle,
            String appLabel) {

        List<AutofillCredential> all = getAll();
        if (all.isEmpty()) return all;

        List<ScoredCredential> scoredMatches = new ArrayList<>();

        String rawTarget = targetDomain != null ? targetDomain.trim() : "";
        String cleanDomain = AutofillCredential.extractDomain(rawTarget).toLowerCase();
        
        // Extraction intelligente de la marque (ex: accounts.zalando.com -> "zalando")
        String domainBrand = extractBrandSmart(cleanDomain);
        if (STOP_WORDS.contains(domainBrand)) {
            domainBrand = "";
        }

        // Si l'URL contient un redirect_uri OAuth/SSO (ex: redirect_uri=https%3A%2F%2Fwww.zalando.fr...)
        String redirectBrand = extractBrandFromRedirectUri(rawTarget);
        if (STOP_WORDS.contains(redirectBrand)) {
            redirectBrand = "";
        }

        String pkg = targetPackage != null ? targetPackage.toLowerCase().trim() : "";
        String pkgBrand = extractBrandFromPackage(pkg);
        if (STOP_WORDS.contains(pkgBrand)) {
            pkgBrand = "";
        }

        String winTitle = windowTitle != null ? windowTitle.toLowerCase().trim() : "";
        String label = appLabel != null ? appLabel.toLowerCase().trim() : "";

        for (AutofillCredential cred : all) {
            int score = calculateMatchScore(
                    cred,
                    cleanDomain,
                    domainBrand,
                    redirectBrand,
                    pkg,
                    pkgBrand,
                    winTitle,
                    label
            );
            if (score > 0) {
                scoredMatches.add(new ScoredCredential(cred, score));
            }
        }

        // Si nous avons trouve des correspondances (ex: Zalando), renvoyer STRICTEMENT celles-ci !
        if (!scoredMatches.isEmpty()) {
            Collections.sort(scoredMatches);
            List<AutofillCredential> filtered = new ArrayList<>();
            for (ScoredCredential sm : scoredMatches) {
                filtered.add(sm.credential);
            }
            return filtered;
        }

        // Sinon, si aucun match n'a ete trouve (application ou site inconnu),
        // renvoyer les identifiants disponibles comme secours (max 5)
        if (all.size() > 5) {
            return all.subList(0, 5);
        }
        return all;
    }

    private int calculateMatchScore(
            AutofillCredential cred,
            String cleanDomain,
            String domainBrand,
            String redirectBrand,
            String pkg,
            String pkgBrand,
            String winTitle,
            String label) {

        int score = 0;
        String titleClean = cred.getTitle().toLowerCase().replaceAll("[^a-z0-9]", "");
        boolean titleIsStopWord = STOP_WORDS.contains(titleClean);

        // 1. Verification par marque extraite de l'URL ou SSO redirect (ex: "zalando")
        if (!domainBrand.isEmpty()) {
            if (!titleIsStopWord && (titleClean.equals(domainBrand) || titleClean.contains(domainBrand))) {
                score = Math.max(score, 100);
            }
            for (String d : cred.getDomains()) {
                String dClean = d.toLowerCase().replaceAll("[^a-z0-9]", "");
                if (dClean.equals(domainBrand) || dClean.contains(domainBrand)) {
                    score = Math.max(score, 100);
                }
            }
        }

        if (!redirectBrand.isEmpty()) {
            if (!titleIsStopWord && (titleClean.equals(redirectBrand) || titleClean.contains(redirectBrand))) {
                score = Math.max(score, 100);
            }
            for (String d : cred.getDomains()) {
                String dClean = d.toLowerCase().replaceAll("[^a-z0-9]", "");
                if (dClean.equals(redirectBrand) || dClean.contains(redirectBrand)) {
                    score = Math.max(score, 100);
                }
            }
        }

        // 2. Verification de correspondance domaine complete (ex: zalando.fr)
        if (!cleanDomain.isEmpty()) {
            for (String d : cred.getDomains()) {
                String dLower = d.toLowerCase().trim();
                if (cleanDomain.equalsIgnoreCase(dLower) ||
                    cleanDomain.endsWith("." + dLower) ||
                    dLower.endsWith("." + cleanDomain)) {
                    score = Math.max(score, 95);
                }
            }
        }

        // 3. Verification par Package Android (ex: de.zalando.mobile -> "zalando")
        if (!pkgBrand.isEmpty()) {
            if (!titleIsStopWord && (titleClean.equals(pkgBrand) || titleClean.contains(pkgBrand))) {
                score = Math.max(score, 90);
            }
            for (String d : cred.getDomains()) {
                String dClean = d.toLowerCase().replaceAll("[^a-z0-9]", "");
                if (dClean.equals(pkgBrand) || dClean.contains(pkgBrand)) {
                    score = Math.max(score, 90);
                }
            }
        }

        // 4. Verification par Nom d'application Android (ex: "Zalando")
        if (!label.isEmpty()) {
            String labelClean = label.replaceAll("[^a-z0-9]", "");
            if (!STOP_WORDS.contains(labelClean) && labelClean.length() >= 3) {
                if (!titleIsStopWord && (titleClean.equals(labelClean) || titleClean.contains(labelClean))) {
                    score = Math.max(score, 90);
                }
            }
        }

        // 5. Verification par Titre de la fenetre web (ex: "Zalando - Chaussures")
        if (!winTitle.isEmpty() && !titleIsStopWord && titleClean.length() >= 4) {
            if (winTitle.contains(titleClean)) {
                score = Math.max(score, 80);
            }
        }

        return score;
    }

    /**
     * Extrait la veritable marque du domaine en ignorant les sous-domaines SSO/Auth
     * Exemple: "accounts.zalando.com" -> "zalando"
     * Exemple: "www.zalando.fr" -> "zalando"
     */
    public static String extractBrandSmart(String domain) {
        if (domain == null || domain.isEmpty()) return "";
        try {
            String clean = AutofillCredential.extractDomain(domain);
            String[] parts = clean.split("\\.");
            if (parts.length >= 2) {
                int tldOffset = 1;
                // Si TLD compose (ex: .co.uk, .com.fr)
                if (parts.length >= 3 && parts[parts.length - 2].length() <= 3 && parts[parts.length - 1].length() <= 3) {
                    tldOffset = 2;
                }
                int brandIdx = parts.length - 1 - tldOffset;
                if (brandIdx >= 0) {
                    return parts[brandIdx].replaceAll("[^a-z0-9]", "");
                }
            }
            return parts[0].replaceAll("[^a-z0-9]", "");
        } catch (Exception e) {
            return "";
        }
    }

    /**
     * Extrait la marque depuis le parametre redirect_uri d'un SSO
     * Exemple: redirect_uri=https%3A%2F%2Fwww.zalando.fr%2Fsso%2Fcallback -> "zalando"
     */
    private static String extractBrandFromRedirectUri(String fullUrl) {
        if (fullUrl == null || !fullUrl.contains("redirect_uri=")) return "";
        try {
            int start = fullUrl.indexOf("redirect_uri=") + "redirect_uri=".length();
            int end = fullUrl.indexOf('&', start);
            String rawRedirect = (end != -1) ? fullUrl.substring(start, end) : fullUrl.substring(start);
            String decoded = URLDecoder.decode(rawRedirect, "UTF-8");
            return extractBrandSmart(decoded);
        } catch (Exception e) {
            return "";
        }
    }

    private static String extractBrandFromPackage(String pkg) {
        if (pkg == null || pkg.isEmpty()) return "";
        String[] parts = pkg.split("\\.");
        for (String p : parts) {
            String clean = p.replaceAll("[^a-z0-9]", "");
            if (clean.length() >= 4 &&
                !clean.equals("android") &&
                !clean.equals("mobile") &&
                !clean.equals("client") &&
                !clean.equals("google") &&
                !clean.equals("samsung") &&
                !clean.equals("browser") &&
                !clean.equals("chrome") &&
                !STOP_WORDS.contains(clean)) {
                return clean;
            }
        }
        return "";
    }
}
