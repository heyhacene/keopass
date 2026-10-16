package fr.keo.pass;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import fr.keo.pass.autofill.AutofillPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AutofillPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
