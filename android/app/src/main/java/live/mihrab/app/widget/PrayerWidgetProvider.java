package live.mihrab.app.widget;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.os.Bundle;

/** Both widget sizes draw from the same snapshot, so any update redraws them all. */
public abstract class PrayerWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        PrayerWidgets.refreshAll(context);
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager, int id, Bundle options) {
        PrayerWidgets.refreshAll(context);
    }

    @Override
    public void onDisabled(Context context) {
        // Stops the alarm once no Mihrab widget is left on the home screen.
        PrayerWidgets.refreshAll(context);
    }
}
