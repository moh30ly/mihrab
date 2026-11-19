package live.mihrab.app.widget;

import android.content.Context;
import android.content.SharedPreferences;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.TimeZone;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * The prayer times the web app hands over, already formatted in the app's language.
 * See buildWidgetSnapshot in lib/widget.ts for the shape.
 */
final class WidgetSnapshot {

    private static final String PREFS = "mihrab_widget";
    private static final String KEY = "snapshot";

    static final class Day {
        String date;
        String hijri;
        String deed;
        long[] at = new long[5];
        String[] times = new String[5];
    }

    /** Where the next prayer is: which day and which of the five. */
    static final class Next {
        Day day;
        int index;
        boolean otherDay;
    }

    boolean rtl;
    String place;
    TimeZone timeZone;
    String[] names = new String[5];
    String labelNext;
    String labelTomorrow;
    String labelStale;
    final List<Day> days = new ArrayList<>();

    static void save(Context context, String json) {
        prefs(context).edit().putString(KEY, json).apply();
    }

    /** The saved snapshot, or null when the app hasn't sent one (no location yet). */
    static WidgetSnapshot load(Context context) {
        String json = prefs(context).getString(KEY, null);
        if (json == null || json.isEmpty()) return null;
        try {
            return parse(new JSONObject(json));
        } catch (JSONException e) {
            return null;
        }
    }

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private static WidgetSnapshot parse(JSONObject o) throws JSONException {
        WidgetSnapshot s = new WidgetSnapshot();
        s.rtl = o.optBoolean("rtl", false);
        s.place = o.optString("place", "");
        s.timeZone = TimeZone.getTimeZone(o.optString("timezone", TimeZone.getDefault().getID()));
        JSONArray names = o.getJSONArray("names");
        for (int i = 0; i < 5; i++) s.names[i] = names.getString(i);
        JSONObject labels = o.getJSONObject("labels");
        s.labelNext = labels.optString("next", "");
        s.labelTomorrow = labels.optString("tomorrow", "");
        s.labelStale = labels.optString("stale", "");
        JSONArray days = o.getJSONArray("days");
        for (int d = 0; d < days.length(); d++) {
            JSONObject j = days.getJSONObject(d);
            Day day = new Day();
            day.date = j.getString("date");
            day.hijri = j.optString("hijri", "");
            day.deed = j.optString("deed", "");
            JSONArray at = j.getJSONArray("at");
            JSONArray times = j.getJSONArray("times");
            for (int i = 0; i < 5; i++) {
                day.at[i] = at.getLong(i);
                day.times[i] = times.getString(i);
            }
            s.days.add(day);
        }
        return s;
    }

    /** Today's civil date where the user prays, as yyyy-mm-dd. */
    String todayKey(long now) {
        SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
        f.setTimeZone(timeZone);
        return f.format(new Date(now));
    }

    /** The entry for today, or null when the snapshot doesn't reach today. */
    Day today(long now) {
        String key = todayKey(now);
        for (Day day : days) if (key.equals(day.date)) return day;
        return null;
    }

    /** The first of the five prayers still ahead, or null when the snapshot has run out. */
    Next next(long now) {
        Day today = today(now);
        for (Day day : days) {
            for (int i = 0; i < 5; i++) {
                if (day.at[i] > now) {
                    Next n = new Next();
                    n.day = day;
                    n.index = i;
                    n.otherDay = day != today;
                    return n;
                }
            }
        }
        return null;
    }

    /** The next midnight where the user prays, when the Hijri date and good deed change. */
    long nextMidnight(long now) {
        Calendar c = Calendar.getInstance(timeZone);
        c.setTimeInMillis(now);
        c.add(Calendar.DAY_OF_MONTH, 1);
        c.set(Calendar.HOUR_OF_DAY, 0);
        c.set(Calendar.MINUTE, 0);
        c.set(Calendar.SECOND, 0);
        c.set(Calendar.MILLISECOND, 0);
        return c.getTimeInMillis();
    }
}
