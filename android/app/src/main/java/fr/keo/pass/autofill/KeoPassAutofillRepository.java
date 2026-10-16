package fr.keo.pass.autofill;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.ArrayList;
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

    public synchronized List<AutofillCredential> findMatches(String targetDomain, String targetPackage) {
        List<AutofillCredential> all = getAll();
        List<AutofillCredential> exactMatches = new ArrayList<>();
        List<AutofillCredential> fuzzyMatches = new ArrayList<>();

        String cleanDomain = AutofillCredential.extractDomain(targetDomain).toLowerCase();
        String pkg = (targetPackage != null ? targetPackage.toLowerCase() : "");

        for (AutofillCredential cred : all) {
            boolean matched = false;

            // 1. Match domaine web (ex: dans Chrome, Samsung Internet)
            if (!cleanDomain.isEmpty()) {
                for (String d : cred.getDomains()) {
                    if (d.equalsIgnoreCase(cleanDomain) || cleanDomain.endsWith("." + d) || d.endsWith("." + cleanDomain)) {
                        exactMatches.add(cred);
                        matched = true;
                        break;
                    }
                }
            }

            if (matched) continue;

            // 2. Match package Android (ex: com.instagram.android)
            if (!pkg.isEmpty()) {
                String titleLower = cred.getTitle().toLowerCase().replaceAll("[^a-z0-9]", "");
                String pkgParts = pkg.replace('.', ' ');

                if (!titleLower.isEmpty() && pkgParts.contains(titleLower)) {
                    exactMatches.add(cred);
                    continue;
                }

                for (String d : cred.getDomains()) {
                    String domainName = d.split("\\.")[0];
                    if (domainName.length() >= 3 && pkgParts.contains(domainName)) {
                        fuzzyMatches.add(cred);
                        matched = true;
                        break;
                    }
                }
            }
        }

        if (!exactMatches.isEmpty()) {
            return exactMatches;
        }
        if (!fuzzyMatches.isEmpty()) {
            return fuzzyMatches;
        }

        // Si aucun match exact, proposer les identifiants disponibles (jusqu'a 5)
        if (all.size() > 5) {
            return all.subList(0, 5);
        }
        return all;
    }
}
