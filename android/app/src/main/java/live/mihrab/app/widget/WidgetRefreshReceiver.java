package live.mihrab.app.widget;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Redraws the widgets when a prayer time or midnight passes, or the clock or time zone changes. */
public class WidgetRefreshReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        PrayerWidgets.refreshAll(context);
    }
}
