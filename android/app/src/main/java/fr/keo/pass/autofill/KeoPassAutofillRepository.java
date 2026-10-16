package fr.keo.pass.autofill;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class KeoPassAutofillRepository {
    private static final String TAG = "KeoPassAutofillRepo";
    private static final String PREF_NAME = "keopass_autofill_storage";
    private static final String KEY_CREDENTIALS = "credentials_cache";

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
            return Integer.compare(other.score, this.score); // Tri decroissant par score
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

        String cleanDomain = AutofillCredential.extractDomain(targetDomain).toLowerCase().trim();
        String domainBrand = extractBrand(cleanDomain);

        String pkg = targetPackage != null ? targetPackage.toLowerCase().trim() : "";
        String pkgBrand = extractBrandFromPackage(pkg);

        String winTitle = windowTitle != null ? windowTitle.toLowerCase().trim() : "";
        String label = appLabel != null ? appLabel.toLowerCase().trim() : "";

        for (AutofillCredential cred : all) {
            int score = calculateMatchScore(cred, cleanDomain, domainBrand, pkg, pkgBrand, winTitle, label);
            if (score > 0) {
                scoredMatches.add(new ScoredCredential(cred, score));
            }
        }

        // Si des correspondances specifiques ont ete trouvees (ex: Zalando),
        // renvoyer UNIQUEMENT les correspondances classees par pertinence !
        if (!scoredMatches.isEmpty()) {
            Collections.sort(scoredMatches);
            List<AutofillCredential> filtered = new ArrayList<>();
            for (ScoredCredential sm : scoredMatches) {
                filtered.add(sm.credential);
            }
            return filtered;
        }

        // Sinon, si AUCUNE correspondance n'a ete trouvee (application inconnue ou nouvelle),
        // proposer la liste generale des identifiants (max 5)
        if (all.size() > 5) {
            return all.subList(0, 5);
        }
        return all;
    }

    private int calculateMatchScore(
            AutofillCredential cred,
            String cleanDomain,
            String domainBrand,
            String pkg,
            String pkgBrand,
            String winTitle,
            String label) {

        int score = 0;
        String titleClean = cred.getTitle().toLowerCase().replaceAll("[^a-z0-9]", "");

        // 1. Verification des domaines et mots-cles enregistres
        for (String d : cred.getDomains()) {
            String dLower = d.toLowerCase().trim();
            String dClean = dLower.replaceAll("[^a-z0-9]", "");

            // Match domaine web exact ou sous-domaine (ex: zalando.fr)
            if (!cleanDomain.isEmpty()) {
                if (cleanDomain.equalsIgnoreCase(dLower) ||
                    cleanDomain.endsWith("." + dLower) ||
                    dLower.endsWith("." + cleanDomain)) {
                    score = Math.max(score, 100);
                }
                if (!domainBrand.isEmpty() && domainBrand.length() >= 3) {
                    if (dLower.equalsIgnoreCase(domainBrand) || dClean.equals(domainBrand)) {
                        score = Math.max(score, 90);
                    }
                }
            }

            // Match package Android (ex: de.zalando.mobile)
            if (!pkgBrand.isEmpty() && pkgBrand.length() >= 3) {
                if (dClean.equals(pkgBrand) || dLower.contains(pkgBrand) || pkgBrand.contains(dClean)) {
                    score = Math.max(score, 85);
                }
            }

            // Match titre de fenetre (ex: "Connexion Zalando")
            if (!winTitle.isEmpty() && dClean.length() >= 3 && winTitle.contains(dClean)) {
                score = Math.max(score, 80);
            }

            // Match nom d'application
            if (!label.isEmpty() && dClean.length() >= 3 && label.contains(dClean)) {
                score = Math.max(score, 85);
            }
        }

        // 2. Verification directe du Titre de l'entree KeoPass
        if (titleClean.length() >= 3) {
            // Domaine web contient le titre (ex: zalando.fr contient "zalando")
            if (!cleanDomain.isEmpty() && cleanDomain.contains(titleClean)) {
                score = Math.max(score, 90);
            }
            if (!domainBrand.isEmpty() && (domainBrand.contains(titleClean) || titleClean.contains(domainBrand))) {
                score = Math.max(score, 90);
            }

            // Package contient le titre (ex: de.zalando.mobile contient "zalando")
            if (!pkgBrand.isEmpty() && (pkgBrand.contains(titleClean) || titleClean.contains(pkgBrand))) {
                score = Math.max(score, 85);
            }

            // Nom d'app contient le titre
            if (!label.isEmpty() && (label.contains(titleClean) || titleClean.contains(label))) {
                score = Math.max(score, 85);
            }

            // Titre de fenetre contient le titre
            if (!winTitle.isEmpty() && winTitle.contains(titleClean)) {
                score = Math.max(score, 80);
            }
        }

        return score;
    }

    private static String extractBrand(String domain) {
        if (domain == null || domain.isEmpty()) return "";
        try {
            String[] parts = domain.split("\\.");
            if (parts.length >= 2) {
                int idx = 0;
                if (parts[0].equalsIgnoreCase("www") || parts[0].equalsIgnoreCase("m")) {
                    idx = 1;
                }
                return parts[idx].replaceAll("[^a-z0-9]", "");
            }
            return parts[0].replaceAll("[^a-z0-9]", "");
        } catch (Exception e) {
            return "";
        }
    }

    private static String extractBrandFromPackage(String pkg) {
        if (pkg == null || pkg.isEmpty()) return "";
        // ex: de.zalando.mobile -> zalando
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
                !clean.equals("chrome")) {
                return clean;
            }
        }
        return "";
    }
}
