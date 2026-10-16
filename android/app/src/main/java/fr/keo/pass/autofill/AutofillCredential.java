package fr.keo.pass.autofill;

import org.json.JSONArray;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.List;

public class AutofillCredential {
    private String id;
    private String title;
    private String username;
    private String password;
    private String url;
    private List<String> domains;

    public AutofillCredential() {
        this.domains = new ArrayList<>();
    }

    public static AutofillCredential fromJSON(JSONObject obj) {
        AutofillCredential cred = new AutofillCredential();
        cred.id = obj.optString("id", "");
        cred.title = obj.optString("title", "");
        cred.username = obj.optString("username", "");
        cred.password = obj.optString("password", "");
        cred.url = obj.optString("url", "");
        
        JSONArray domArr = obj.optJSONArray("domains");
        if (domArr != null) {
            for (int i = 0; i < domArr.length(); i++) {
                String d = domArr.optString(i, "").trim().toLowerCase();
                if (!d.isEmpty() && !cred.domains.contains(d)) {
                    cred.domains.add(d);
                }
            }
        }
        
        // Extraire automatiquement le domaine et la marque depuis l'URL si absent
        if (!cred.url.isEmpty()) {
            String extractedDomain = extractDomain(cred.url);
            if (!extractedDomain.isEmpty() && !cred.domains.contains(extractedDomain)) {
                cred.domains.add(extractedDomain);
            }
            String extractedBrand = extractBrand(cred.url);
            if (!extractedBrand.isEmpty() && !cred.domains.contains(extractedBrand)) {
                cred.domains.add(extractedBrand);
            }
        }

        // Extraire la marque depuis le titre
        if (!cred.title.isEmpty()) {
            String cleanTitle = cred.title.toLowerCase().replaceAll("[^a-z0-9]", "");
            if (cleanTitle.length() >= 3 && !cred.domains.contains(cleanTitle)) {
                cred.domains.add(cleanTitle);
            }
        }

        return cred;
    }

    public static String extractDomain(String rawUrl) {
        if (rawUrl == null || rawUrl.isEmpty()) return "";
        try {
            String s = rawUrl.toLowerCase().trim();
            if (s.startsWith("http://")) s = s.substring(7);
            else if (s.startsWith("https://")) s = s.substring(8);
            int slashIdx = s.indexOf('/');
            if (slashIdx != -1) s = s.substring(0, slashIdx);
            int colonIdx = s.indexOf(':');
            if (colonIdx != -1) s = s.substring(0, colonIdx);
            int queryIdx = s.indexOf('?');
            if (queryIdx != -1) s = s.substring(0, queryIdx);
            if (s.startsWith("www.")) s = s.substring(4);
            return s.trim();
        } catch (Exception e) {
            return "";
        }
    }

    public static String extractBrand(String domainOrUrl) {
        if (domainOrUrl == null || domainOrUrl.isEmpty()) return "";
        try {
            String clean = extractDomain(domainOrUrl);
            String[] parts = clean.split("\\.");
            if (parts.length >= 2) {
                int tldOffset = 1;
                // Ex: co.uk, com.fr
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

    public String getId() { return id != null ? id : ""; }
    public String getTitle() { return title != null && !title.isEmpty() ? title : "KeoPass"; }
    public String getUsername() { return username != null ? username : ""; }
    public String getPassword() { return password != null ? password : ""; }
    public String getUrl() { return url != null ? url : ""; }
    public List<String> getDomains() { return domains; }
}
