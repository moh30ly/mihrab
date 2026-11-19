package live.mihrab.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import live.mihrab.app.widget.WidgetPlugin;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // The home-screen widget gets its prayer times from the web app through this plugin.
        registerPlugin(WidgetPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
