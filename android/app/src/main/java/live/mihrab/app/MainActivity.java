package live.mihrab.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import live.mihrab.app.offline.OfflinePlugin;
import live.mihrab.app.speech.SpeechPlugin;
import live.mihrab.app.widget.WidgetPlugin;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // The home-screen widget gets its prayer times from the web app through this plugin.
        registerPlugin(WidgetPlugin.class);
        // The memorisation page listens to recitations through this plugin.
        registerPlugin(SpeechPlugin.class);
        // Books and recitations kept on the phone for reading and listening offline.
        registerPlugin(OfflinePlugin.class);
        super.onCreate(savedInstanceState);
        // Quran recitations go on from one ayah to the next without a tap for each.
        getBridge().getWebView().getSettings().setMediaPlaybackRequiresUserGesture(false);
    }
}
