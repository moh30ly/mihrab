package live.mihrab.app.widget;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Receives the prayer snapshot from the web app (lib/widget.ts) and redraws the widgets. */
@CapacitorPlugin(name = "MihrabWidget")
public class WidgetPlugin extends Plugin {

    @PluginMethod
    public void update(PluginCall call) {
        String data = call.getString("data");
        if (data == null) {
            call.reject("data is required");
            return;
        }
        WidgetSnapshot.save(getContext(), data);
        PrayerWidgets.refreshAll(getContext());
        call.resolve();
    }
}
