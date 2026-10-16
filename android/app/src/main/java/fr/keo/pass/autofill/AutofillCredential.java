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
                if (!d.isEmpty()) {
                    cred.domains.add(d);
                }
            }
        }
        
        // Extraire automatiquement le domaine depuis l'URL si absent
        if (!cred.url.isEmpty()) {
            String extracted = extractDomain(cred.url);
            if (!extracted.isEmpty() && !cred.domains.contains(extracted)) {
                cred.domains.add(extracted);
            }
        }
        return cred;
    }

    public static String extractDomain(String rawUrl) {
        if (rawUrl == null || rawUrl.isEmpty()) return "";
        try {
            String s = rawUrl.toLowerCase();
            if (s.startsWith("http://")) s = s.substring(7);
            else if (s.startsWith("https://")) s = s.substring(8);
            int slashIdx = s.indexOf('/');
            if (slashIdx != -1) s = s.substring(0, slashIdx);
            int colonIdx = s.indexOf(':');
            if (colonIdx != -1) s = s.substring(0, colonIdx);
            if (s.startsWith("www.")) s = s.substring(4);
            return s.trim();
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
