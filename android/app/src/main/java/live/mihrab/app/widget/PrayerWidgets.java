package live.mihrab.app.widget;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.SystemClock;
import android.util.TypedValue;
import android.view.View;
import android.widget.RemoteViews;
import live.mihrab.app.MainActivity;
import live.mihrab.app.R;

/**
 * Draws both widgets from the saved snapshot. The countdown is a Chronometer the
 * launcher ticks by itself, so the app only wakes when the next prayer arrives
 * (to move on to the one after) and at midnight (new Hijri date and good deed).
 * That alarm doesn't wake the phone: if the screen is off it runs when it comes on.
 */
final class PrayerWidgets {

    private static final int[] CELL = {R.id.widget_cell0, R.id.widget_cell1, R.id.widget_cell2, R.id.widget_cell3, R.id.widget_cell4};
    private static final int[] CELL_NAME = {
        R.id.widget_cell_name0, R.id.widget_cell_name1, R.id.widget_cell_name2, R.id.widget_cell_name3, R.id.widget_cell_name4,
    };
    private static final int[] CELL_TIME = {
        R.id.widget_cell_time0, R.id.widget_cell_time1, R.id.widget_cell_time2, R.id.widget_cell_time3, R.id.widget_cell_time4,
    };

    private PrayerWidgets() {}

    static void refreshAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] small = manager.getAppWidgetIds(new ComponentName(context, PrayerWidgetSmall.class));
        int[] large = manager.getAppWidgetIds(new ComponentName(context, PrayerWidgetLarge.class));
        WidgetSnapshot snapshot = WidgetSnapshot.load(context);
        long now = System.currentTimeMillis();
        WidgetSnapshot.Next next = snapshot == null ? null : snapshot.next(now);

        for (int id : small) manager.updateAppWidget(id, render(context, snapshot, next, now, false));
        for (int id : large) manager.updateAppWidget(id, render(context, snapshot, next, now, true));

        if (small.length + large.length == 0 || snapshot == null) {
            cancelAlarm(context);
        } else {
            long wake = snapshot.nextMidnight(now);
            if (next != null) wake = Math.min(wake, next.day.at[next.index]);
            scheduleAlarm(context, wake + 1000);
        }
    }

    private static RemoteViews render(Context context, WidgetSnapshot s, WidgetSnapshot.Next next, long now, boolean large) {
        boolean rtl = s != null && s.rtl;
        int layout = large
            ? (rtl ? R.layout.widget_large_rtl : R.layout.widget_large_ltr)
            : (rtl ? R.layout.widget_small_rtl : R.layout.widget_small_ltr);
        RemoteViews v = new RemoteViews(context.getPackageName(), layout);
        v.setOnClickPendingIntent(R.id.widget_root, openApp(context));

        if (s == null || next == null) {
            // No location yet, or the times ran out: ask for the app.
            String message = s == null ? context.getString(R.string.widget_empty) : s.labelStale;
            v.setViewVisibility(R.id.widget_hijri, View.GONE);
            v.setViewVisibility(R.id.widget_label, View.GONE);
            v.setViewVisibility(R.id.widget_time, View.GONE);
            v.setViewVisibility(R.id.widget_countdown, View.GONE);
            v.setTextViewText(R.id.widget_name, message);
            v.setTextViewTextSize(R.id.widget_name, TypedValue.COMPLEX_UNIT_SP, 15);
            if (large) {
                v.setViewVisibility(R.id.widget_place, View.GONE);
                v.setViewVisibility(R.id.widget_next_box, View.GONE);
                v.setViewVisibility(R.id.widget_row, View.GONE);
                v.setViewVisibility(R.id.widget_deed, View.GONE);
            }
            return v;
        }

        WidgetSnapshot.Day today = s.today(now);
        if (today == null) today = next.day;
        long at = next.day.at[next.index];

        v.setTextViewText(R.id.widget_hijri, today.hijri);
        String label = next.otherDay ? s.labelNext + " · " + s.labelTomorrow : s.labelNext;
        v.setTextViewText(R.id.widget_label, label);
        v.setTextViewText(R.id.widget_name, s.names[next.index]);
        v.setTextViewText(R.id.widget_time, next.day.times[next.index]);
        v.setChronometer(R.id.widget_countdown, SystemClock.elapsedRealtime() + (at - now), null, true);
        v.setChronometerCountDown(R.id.widget_countdown, true);

        if (large) {
            v.setTextViewText(R.id.widget_place, s.place);
            // The row shows the day of the next prayer, so after Isha it is tomorrow's.
            for (int i = 0; i < 5; i++) {
                boolean isNext = i == next.index;
                v.setTextViewText(CELL_NAME[i], s.names[i]);
                v.setTextViewText(CELL_TIME[i], next.day.times[i]);
                v.setInt(CELL[i], "setBackgroundResource", isNext ? R.drawable.widget_next_pill : R.drawable.widget_cell);
                v.setTextColor(CELL_NAME[i], context.getColor(isNext ? R.color.widget_gold_bright : R.color.widget_stone_dim));
            }
            if (today.deed.isEmpty()) {
                v.setViewVisibility(R.id.widget_deed, View.GONE);
            } else {
                v.setTextViewText(R.id.widget_deed, "✦ " + today.deed);
            }
        }
        return v;
    }

    private static PendingIntent openApp(Context context) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static PendingIntent refreshIntent(Context context) {
        Intent intent = new Intent(context, WidgetRefreshReceiver.class);
        return PendingIntent.getBroadcast(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static void scheduleAlarm(Context context, long at) {
        AlarmManager alarms = context.getSystemService(AlarmManager.class);
        if (alarms == null) return;
        PendingIntent pi = refreshIntent(context);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarms.canScheduleExactAlarms()) {
                // Without exact alarms, allow a minute of slack.
                alarms.setWindow(AlarmManager.RTC, at, 60_000, pi);
            } else {
                alarms.setExact(AlarmManager.RTC, at, pi);
            }
        } catch (SecurityException e) {
            alarms.setWindow(AlarmManager.RTC, at, 60_000, pi);
        }
    }

    private static void cancelAlarm(Context context) {
        AlarmManager alarms = context.getSystemService(AlarmManager.class);
        if (alarms != null) alarms.cancel(refreshIntent(context));
    }
}
