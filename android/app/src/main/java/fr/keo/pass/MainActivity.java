package fr.keo.pass;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.epicshaggy.biometric.NativeBiometric;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeBiometric.class);
        super.onCreate(savedInstanceState);
    }
}
