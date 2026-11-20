package live.mihrab.app.offline;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import org.json.JSONObject;

/**
 * Keeps books and recitations on the phone so they work without a connection
 * (lib/offline.ts). Files go under the app's no-backup folder, in "packs": one
 * folder per book or per surah of a reciter, for example library/tafsir/saadi or
 * audio/ghamdi/2. A pack is complete once its ".complete" file is written, so a
 * download cut short is never mistaken for a finished one, and starting it again
 * skips the files it already has.
 *
 * The web view reads the files through Capacitor.convertFileSrc. Events:
 * "progress" ({ id, done, total, bytes }).
 */
@CapacitorPlugin(name = "MihrabOffline")
public class OfflinePlugin extends Plugin {

    private static final String COMPLETE = ".complete";
    /** Only these sites are downloaded from. */
    private static final String[] HOSTS = { "mihrab.live", "everyayah.com" };

    private final ExecutorService files = Executors.newFixedThreadPool(4);
    /** Runs one download at a time. */
    private final ExecutorService jobs = Executors.newSingleThreadExecutor();
    /** Listing and removing, which must not wait behind a download. */
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private final ConcurrentHashMap<String, AtomicBoolean> running = new ConcurrentHashMap<>();
    private final Set<String> cancelledByUser = ConcurrentHashMap.newKeySet();

    private File root() {
        File dir = new File(getContext().getNoBackupFilesDir(), "offline");
        //noinspection ResultOfMethodCallIgnored
        dir.mkdirs();
        return dir;
    }

    /** A path inside the offline folder; anything that climbs out of it is refused. */
    private File resolve(String path) throws IOException {
        File base = root().getCanonicalFile();
        File f = new File(base, path).getCanonicalFile();
        if (!f.getPath().startsWith(base.getPath() + File.separator)) throw new IOException("Bad path: " + path);
        return f;
    }

    @PluginMethod
    public void info(PluginCall call) {
        File dir = root();
        JSObject ret = new JSObject();
        ret.put("root", dir.getAbsolutePath());
        ret.put("free", dir.getUsableSpace());
        call.resolve(ret);
    }

    /** The complete packs, as { path, bytes }, found up to three folders deep. */
    @PluginMethod
    public void packs(PluginCall call) {
        io.execute(() -> {
            JSArray list = new JSArray();
            File base = root();
            findPacks(base, "", 0, list);
            JSObject ret = new JSObject();
            ret.put("packs", list);
            call.resolve(ret);
        });
    }

    private void findPacks(File dir, String rel, int depth, JSArray out) {
        if (new File(dir, COMPLETE).exists()) {
            JSObject p = new JSObject();
            p.put("path", rel);
            p.put("bytes", sizeOf(dir));
            out.put(p);
            return;
        }
        if (depth >= 3) return;
        File[] children = dir.listFiles();
        if (children == null) return;
        for (File c : children) {
            if (c.isDirectory()) findPacks(c, rel.isEmpty() ? c.getName() : rel + "/" + c.getName(), depth + 1, out);
        }
    }

    private static long sizeOf(File f) {
        if (f.isFile()) return f.length();
        long total = 0;
        File[] children = f.listFiles();
        if (children != null) for (File c : children) total += sizeOf(c);
        return total;
    }

    private static boolean deleteAll(File f) {
        File[] children = f.listFiles();
        if (children != null) for (File c : children) deleteAll(c);
        return f.delete() || !f.exists();
    }

    /** Removes a pack (or any folder inside the offline folder). */
    @PluginMethod
    public void remove(PluginCall call) {
        String path = call.getString("path", "");
        io.execute(() -> {
            try {
                File f = resolve(path);
                // The marker goes first, so a removal cut short leaves an incomplete pack.
                //noinspection ResultOfMethodCallIgnored
                new File(f, COMPLETE).delete();
                deleteAll(f);
                call.resolve();
            } catch (IOException e) {
                call.reject(e.getMessage(), "path");
            }
        });
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        String id = call.getString("id", "");
        AtomicBoolean flag = running.get(id);
        if (flag != null) {
            cancelledByUser.add(id);
            flag.set(true);
        }
        call.resolve();
    }

    /**
     * Downloads a pack: { id, path, items: [{ url, file }] }, where each file is
     * relative to the pack's folder. Resolves with { bytes } once every file is in
     * place; rejects with code "cancelled", "network" or "storage".
     */
    @PluginMethod
    public void download(PluginCall call) {
        final String id = call.getString("id", "");
        final String packPath = call.getString("path", "");
        final JSArray items = call.getArray("items", new JSArray());
        final AtomicBoolean stop = new AtomicBoolean(false);
        cancelledByUser.remove(id);
        running.put(id, stop);
        jobs.execute(() -> {
            try {
                File pack = resolve(packPath);
                //noinspection ResultOfMethodCallIgnored
                pack.mkdirs();
                //noinspection ResultOfMethodCallIgnored
                new File(pack, COMPLETE).delete();
                final int total = items.length();
                final AtomicInteger done = new AtomicInteger();
                final AtomicLong bytes = new AtomicLong();
                List<Future<?>> futures = new ArrayList<>();
                for (int i = 0; i < total; i++) {
                    JSONObject item = items.getJSONObject(i);
                    final String url = item.getString("url");
                    final File dest = resolveIn(pack, item.getString("file"));
                    checkHost(url);
                    futures.add(files.submit(() -> {
                        if (stop.get()) return null;
                        bytes.addAndGet(fetch(url, dest, stop));
                        int n = done.incrementAndGet();
                        JSObject p = new JSObject();
                        p.put("id", id);
                        p.put("done", n);
                        p.put("total", total);
                        p.put("bytes", bytes.get());
                        notifyListeners("progress", p);
                        return null;
                    }));
                }
                Exception failure = null;
                for (Future<?> f : futures) {
                    try {
                        f.get();
                    } catch (Exception e) {
                        if (failure == null) failure = e;
                        stop.set(true);
                    }
                }
                if (cancelledByUser.contains(id)) {
                    call.reject("Download cancelled", "cancelled");
                    return;
                }
                if (failure != null) {
                    Throwable cause = failure.getCause() != null ? failure.getCause() : failure;
                    boolean full = pack.getUsableSpace() < 5L * 1024 * 1024;
                    call.reject(String.valueOf(cause.getMessage()), full ? "storage" : "network");
                    return;
                }
                if (!new File(pack, COMPLETE).createNewFile()) throw new IOException("Could not finish " + packPath);
                JSObject ret = new JSObject();
                ret.put("bytes", sizeOf(pack));
                call.resolve(ret);
            } catch (Exception e) {
                call.reject(String.valueOf(e.getMessage()), "storage");
            } finally {
                running.remove(id);
                cancelledByUser.remove(id);
            }
        });
    }

    private static File resolveIn(File pack, String rel) throws IOException {
        File f = new File(pack, rel).getCanonicalFile();
        if (!f.getPath().startsWith(pack.getCanonicalPath() + File.separator)) throw new IOException("Bad file: " + rel);
        return f;
    }

    private static void checkHost(String url) throws IOException {
        URL u = new URL(url);
        if (!"https".equals(u.getProtocol())) throw new IOException("Not https: " + url);
        for (String h : HOSTS) if (u.getHost().equals(h) || u.getHost().endsWith("." + h)) return;
        throw new IOException("Host not allowed: " + url);
    }

    /** Downloads one file, unless it is already there; returns its size. Tries three times. */
    private static long fetch(String url, File dest, AtomicBoolean stop) throws IOException {
        if (dest.isFile() && dest.length() > 0) return dest.length();
        //noinspection ResultOfMethodCallIgnored
        dest.getParentFile().mkdirs();
        File part = new File(dest.getPath() + ".part");
        IOException last = null;
        for (int attempt = 1; attempt <= 3 && !stop.get(); attempt++) {
            HttpURLConnection c = null;
            try {
                c = (HttpURLConnection) new URL(url).openConnection();
                c.setConnectTimeout(15000);
                c.setReadTimeout(30000);
                c.setInstanceFollowRedirects(true);
                int code = c.getResponseCode();
                if (code != 200) throw new IOException("HTTP " + code + " for " + url);
                try (InputStream in = c.getInputStream(); OutputStream out = new FileOutputStream(part)) {
                    byte[] buf = new byte[32 * 1024];
                    int n;
                    while ((n = in.read(buf)) > 0) {
                        if (stop.get()) throw new IOException("cancelled");
                        out.write(buf, 0, n);
                    }
                }
                if (!part.renameTo(dest)) throw new IOException("Could not save " + dest.getName());
                return dest.length();
            } catch (IOException e) {
                last = e;
                //noinspection ResultOfMethodCallIgnored
                part.delete();
                if (stop.get()) break;
                try {
                    Thread.sleep(1000L * attempt);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    break;
                }
            } finally {
                if (c != null) c.disconnect();
            }
        }
        throw last != null ? last : new IOException("cancelled");
    }
}
