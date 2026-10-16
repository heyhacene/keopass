package fr.keo.pass.autofill;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.view.autofill.AutofillManager;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "KeoPassAutofill")
public class AutofillPlugin extends Plugin {

    @PluginMethod
    public void getStatus(PluginCall call) {
        JSObject ret = new JSObject();
        boolean supported = false;
        boolean enabled = false;
        boolean isDefault = false;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                AutofillManager afm = getContext().getSystemService(AutofillManager.class);
                if (afm != null) {
                    supported = afm.isAutofillSupported();
                    enabled = afm.isEnabled();
                    isDefault = afm.hasEnabledAutofillServices();
                }
            } catch (Exception e) {
                // Ignore
            }
        }

        ret.put("supported", supported);
        ret.put("enabled", enabled);
        ret.put("isDefaultService", isDefault);

        KeoPassAutofillRepository repo = new KeoPassAutofillRepository(getContext());
        ret.put("credentialCount", repo.getCredentialCount());

        call.resolve(ret);
    }

    @PluginMethod
    public void openAutofillSettings(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                Intent intent = new Intent(Settings.ACTION_REQUEST_SET_AUTOFILL_SERVICE);
                intent.setData(Uri.parse("package:" + getContext().getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
                call.resolve();
            } catch (ActivityNotFoundException e) {
                try {
                    Intent fallback = new Intent(Settings.ACTION_SETTINGS);
                    fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getContext().startActivity(fallback);
                    call.resolve();
                } catch (Exception ex) {
                    call.reject("Impossible d'ouvrir les parametres: " + ex.getMessage());
                }
            }
        } else {
            call.reject("Autofill non supporte sur cette version d'Android");
        }
    }

    @PluginMethod
    public void syncCredentials(PluginCall call) {
        JSArray credentials = call.getArray("credentials");
        if (credentials == null) {
            call.reject("Liste d'identifiants requise");
            return;
        }

        KeoPassAutofillRepository repo = new KeoPassAutofillRepository(getContext());
        repo.saveCredentials(credentials.toString());

        JSObject ret = new JSObject();
        ret.put("count", repo.getCredentialCount());
        call.resolve(ret);
    }

    @PluginMethod
    public void clearCredentials(PluginCall call) {
        KeoPassAutofillRepository repo = new KeoPassAutofillRepository(getContext());
        repo.clear();
        call.resolve();
    }
}
