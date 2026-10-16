package fr.keo.pass.autofill;

import android.app.PendingIntent;
import android.app.assist.AssistStructure;
import android.content.Intent;
import android.os.Build;
import android.os.CancellationSignal;
import android.service.autofill.AutofillService;
import android.service.autofill.Dataset;
import android.service.autofill.FillCallback;
import android.service.autofill.FillContext;
import android.service.autofill.FillRequest;
import android.service.autofill.FillResponse;
import android.service.autofill.InlinePresentation;
import android.service.autofill.SaveCallback;
import android.service.autofill.SaveRequest;
import android.text.InputType;
import android.util.Log;
import android.view.View;
import android.view.autofill.AutofillId;
import android.view.autofill.AutofillValue;
import android.view.inputmethod.InlineSuggestionsRequest;
import android.widget.RemoteViews;
import android.widget.inline.InlinePresentationSpec;

import androidx.annotation.NonNull;
import androidx.annotation.RequiresApi;

import java.util.List;

import fr.keo.pass.R;

@RequiresApi(api = Build.VERSION_CODES.O)
public class KeoPassAutofillService extends AutofillService {
    private static final String TAG = "KeoPassAutofillService";

    private static class ParsedStructure {
        AutofillId usernameId;
        AutofillId passwordId;
        String webDomain;
        String packageName;
    }

    @Override
    public void onFillRequest(
            @NonNull FillRequest request,
            @NonNull CancellationSignal cancellationSignal,
            @NonNull FillCallback callback) {

        if (cancellationSignal.isCanceled()) {
            return;
        }

        try {
            List<FillContext> contexts = request.getFillContexts();
            if (contexts == null || contexts.isEmpty()) {
                callback.onSuccess(null);
                return;
            }

            AssistStructure structure = contexts.get(contexts.size() - 1).getStructure();
            ParsedStructure parsed = parseStructure(structure);

            if (parsed.usernameId == null && parsed.passwordId == null) {
                // Aucun champ d'authentification detecte
                callback.onSuccess(null);
                return;
            }

            KeoPassAutofillRepository repo = new KeoPassAutofillRepository(this);
            List<AutofillCredential> matches = repo.findMatches(parsed.webDomain, parsed.packageName);

            if (matches.isEmpty()) {
                callback.onSuccess(null);
                return;
            }

            FillResponse.Builder responseBuilder = new FillResponse.Builder();

            InlineSuggestionsRequest inlineRequest = null;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                inlineRequest = request.getInlineSuggestionsRequest();
            }

            int addedCount = 0;
            for (AutofillCredential cred : matches) {
                if (cred.getUsername().isEmpty() && cred.getPassword().isEmpty()) {
                    continue;
                }

                RemoteViews dropdown = new RemoteViews(getPackageName(), R.layout.autofill_suggestion_item);
                dropdown.setTextViewText(R.id.autofill_title, cred.getTitle());
                dropdown.setTextViewText(R.id.autofill_subtitle, !cred.getUsername().isEmpty() ? cred.getUsername() : "KeoPass");

                InlinePresentation inlinePresentation = null;
                if (inlineRequest != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    inlinePresentation = createInlinePresentation(inlineRequest, cred.getTitle(), cred.getUsername());
                }

                Dataset.Builder datasetBuilder = new Dataset.Builder();

                if (parsed.usernameId != null && !cred.getUsername().isEmpty()) {
                    if (inlinePresentation != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                        datasetBuilder.setValue(
                                parsed.usernameId,
                                AutofillValue.forText(cred.getUsername()),
                                dropdown,
                                inlinePresentation);
                    } else {
                        datasetBuilder.setValue(
                                parsed.usernameId,
                                AutofillValue.forText(cred.getUsername()),
                                dropdown);
                    }
                }

                if (parsed.passwordId != null && !cred.getPassword().isEmpty()) {
                    if (inlinePresentation != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                        datasetBuilder.setValue(
                                parsed.passwordId,
                                AutofillValue.forText(cred.getPassword()),
                                dropdown,
                                inlinePresentation);
                    } else {
                        datasetBuilder.setValue(
                                parsed.passwordId,
                                AutofillValue.forText(cred.getPassword()),
                                dropdown);
                    }
                }

                responseBuilder.addDataset(datasetBuilder.build());
                addedCount++;
                if (addedCount >= 5) break; // Maximum 5 suggestions pour eviter d'encombrer le clavier
            }

            if (addedCount > 0) {
                callback.onSuccess(responseBuilder.build());
            } else {
                callback.onSuccess(null);
            }
        } catch (Exception e) {
            Log.e(TAG, "Erreur lors du traitement Autofill", e);
            callback.onSuccess(null);
        }
    }

    @Override
    public void onSaveRequest(@NonNull SaveRequest request, @NonNull SaveCallback callback) {
        // Enregistrement facultatif
        callback.onSuccess();
    }

    private ParsedStructure parseStructure(AssistStructure structure) {
        ParsedStructure result = new ParsedStructure();
        if (structure.getActivityComponent() != null) {
            result.packageName = structure.getActivityComponent().getPackageName();
        }
        int windowCount = structure.getWindowNodeCount();
        for (int i = 0; i < windowCount; i++) {
            AssistStructure.WindowNode window = structure.getWindowNodeAt(i);
            AssistStructure.ViewNode root = window.getRootViewNode();
            traverseNode(root, result);
        }
        return result;
    }

    private void traverseNode(AssistStructure.ViewNode node, ParsedStructure result) {
        if (node == null) return;

        if (result.webDomain == null && node.getWebDomain() != null) {
            result.webDomain = node.getWebDomain();
        }

        String[] hints = node.getAutofillHints();
        int inputType = node.getInputType();
        String idEntry = node.getIdEntry() != null ? node.getIdEntry().toLowerCase() : "";
        String hint = node.getHint() != null ? node.getHint().toLowerCase() : "";

        boolean isPassword = false;
        boolean isUsername = false;

        // 1. Verifier hints standard Android
        if (hints != null) {
            for (String h : hints) {
                if (View.AUTOFILL_HINT_PASSWORD.equalsIgnoreCase(h)) isPassword = true;
                if (View.AUTOFILL_HINT_USERNAME.equalsIgnoreCase(h) || View.AUTOFILL_HINT_EMAIL_ADDRESS.equalsIgnoreCase(h)) isUsername = true;
            }
        }

        // 2. Verifier le type d'input
        int variation = inputType & InputType.TYPE_MASK_VARIATION;
        int classType = inputType & InputType.TYPE_MASK_CLASS;
        if (classType == InputType.TYPE_CLASS_TEXT) {
            if (variation == InputType.TYPE_TEXT_VARIATION_PASSWORD ||
                variation == InputType.TYPE_TEXT_VARIATION_WEB_PASSWORD ||
                variation == InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD) {
                isPassword = true;
            } else if (variation == InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS ||
                       variation == InputType.TYPE_TEXT_VARIATION_WEB_EMAIL_ADDRESS) {
                isUsername = true;
            }
        }

        // 3. Heuristiques sur l'identifiant et le hint du champ
        if (!isPassword && !isUsername) {
            if (idEntry.contains("password") || idEntry.contains("pwd") || idEntry.contains("mdp") ||
                hint.contains("mot de passe") || hint.contains("password")) {
                isPassword = true;
            } else if (idEntry.contains("username") || idEntry.contains("user") || idEntry.contains("email") ||
                       idEntry.contains("login") || idEntry.contains("identifiant") ||
                       hint.contains("email") || hint.contains("identifiant") || hint.contains("utilisateur")) {
                isUsername = true;
            }
        }

        if (isPassword && result.passwordId == null) {
            result.passwordId = node.getAutofillId();
        } else if (isUsername && result.usernameId == null) {
            result.usernameId = node.getAutofillId();
        }

        for (int i = 0; i < node.getChildCount(); i++) {
            traverseNode(node.getChildAt(i), result);
        }
    }

    private InlinePresentation createInlinePresentation(
            InlineSuggestionsRequest inlineRequest,
            String title,
            String subtitle) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R || inlineRequest == null) {
            return null;
        }
        try {
            List<InlinePresentationSpec> specs = inlineRequest.getInlinePresentationSpecs();
            if (specs == null || specs.isEmpty()) {
                return null;
            }
            InlinePresentationSpec spec = specs.get(0);
            Intent intent = new Intent();
            PendingIntent pendingIntent = PendingIntent.getActivity(
                    this, 0, intent, PendingIntent.FLAG_IMMUTABLE
            );
            androidx.autofill.inline.v1.InlineSuggestionUi.Content.Builder contentBuilder =
                    androidx.autofill.inline.v1.InlineSuggestionUi.newContentBuilder(pendingIntent)
                            .setTitle(title);
            if (subtitle != null && !subtitle.isEmpty()) {
                contentBuilder.setSubtitle(subtitle);
            }
            return new InlinePresentation(contentBuilder.build().getSlice(), spec, false);
        } catch (Exception e) {
            Log.e(TAG, "Impossible de creer InlinePresentation", e);
            return null;
        }
    }
}
