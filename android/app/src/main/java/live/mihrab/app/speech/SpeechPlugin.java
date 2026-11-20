package live.mihrab.app.speech;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.RecognitionListener;
import android.speech.RecognitionSupport;
import android.speech.RecognitionSupportCallback;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import androidx.activity.result.ActivityResult;
import androidx.annotation.RequiresApi;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Listens to a recitation with Android's own speech recogniser, for the memorisation
 * page (lib/listen.ts). The WebView has no speech recognition of its own.
 *
 * One listening session runs until the recogniser hears a pause; the web side starts
 * the next one, so a long recitation is heard in pieces. Events: "partial" and
 * "result" ({ text }), "error" ({ code, message }) and "end".
 */
@CapacitorPlugin(
    name = "MihrabSpeech",
    permissions = { @Permission(strings = { Manifest.permission.RECORD_AUDIO }, alias = "microphone") }
)
public class SpeechPlugin extends Plugin {

    private final Handler main = new Handler(Looper.getMainLooper());
    private SpeechRecognizer recognizer;
    private SpeechRecognizer modelRecognizer;

    /** A recognition service the app can bind to (live words while reciting). */
    private boolean serviceAvailable() {
        boolean ok = SpeechRecognizer.isRecognitionAvailable(getContext());
        boolean onDevice = Build.VERSION.SDK_INT >= 31 && SpeechRecognizer.isOnDeviceRecognitionAvailable(getContext());
        return ok || onDevice;
    }

    /** The system's own "speak now" screen, which many phones have even without a bindable service. */
    private boolean dialogAvailable() {
        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        return intent.resolveActivity(getContext().getPackageManager()) != null;
    }

    @PluginMethod
    public void available(PluginCall call) {
        boolean service = serviceAvailable();
        boolean dialog = dialogAvailable();
        boolean onDevice = Build.VERSION.SDK_INT >= 33 && SpeechRecognizer.isOnDeviceRecognitionAvailable(getContext());
        JSObject ret = new JSObject();
        ret.put("available", service || dialog);
        ret.put("service", service);
        ret.put("dialog", dialog);
        ret.put("onDevice", onDevice);
        call.resolve(ret);
    }

    /**
     * Listens through the system's "speak now" screen and resolves { text } once it closes.
     * Used when no recognition service can be bound, or when it fails to start.
     */
    @PluginMethod
    public void recognizeDialog(PluginCall call) {
        if (!dialogAvailable()) {
            call.reject("No speech recognition on this phone", "unavailable");
            return;
        }
        Intent intent = recognizerIntent(call.getString("lang", "ar-SA"));
        intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
        intent.putExtra(RecognizerIntent.EXTRA_PROMPT, call.getString("prompt", ""));
        try {
            startActivityForResult(call, intent, "dialogResult");
        } catch (Exception e) {
            call.reject(e.getMessage(), "unavailable");
        }
    }

    @ActivityCallback
    private void dialogResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        JSObject ret = new JSObject();
        String text = "";
        if (result.getResultCode() == Activity.RESULT_OK && result.getData() != null) {
            ArrayList<String> list = result.getData().getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
            if (list != null && !list.isEmpty()) text = list.get(0);
        }
        ret.put("text", text);
        call.resolve(ret);
    }

    @PluginMethod
    public void start(PluginCall call) {
        if (!serviceAvailable()) {
            call.reject("No speech recognition service to bind to", "unavailable");
            return;
        }
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            requestPermissionForAlias("microphone", call, "afterPermission");
            return;
        }
        begin(call);
    }

    @PermissionCallback
    private void afterPermission(PluginCall call) {
        if (getPermissionState("microphone") == PermissionState.GRANTED) begin(call);
        else call.reject("Microphone permission was denied", "permission");
    }

    private static Intent recognizerIntent(String lang) {
        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, lang);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, lang);
        return intent;
    }

    private void begin(PluginCall call) {
        final String lang = call.getString("lang", "ar-SA");
        // Without a connection, use the phone's own (on-device) recogniser when it has one.
        final boolean offline = Boolean.TRUE.equals(call.getBoolean("preferOffline", false));
        if (!serviceAvailable()) {
            call.reject("No speech recognition service to bind to", "unavailable");
            return;
        }
        main.post(() -> {
            try {
                destroy();
                boolean bindable = SpeechRecognizer.isRecognitionAvailable(getContext());
                String engine;
                if ((offline || !bindable) && Build.VERSION.SDK_INT >= 31 && SpeechRecognizer.isOnDeviceRecognitionAvailable(getContext())) {
                    recognizer = SpeechRecognizer.createOnDeviceSpeechRecognizer(getContext());
                    engine = "on-device";
                } else {
                    recognizer = SpeechRecognizer.createSpeechRecognizer(getContext());
                    engine = "service";
                }
                recognizer.setRecognitionListener(new Listener());
                Intent intent = recognizerIntent(lang);
                intent.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, offline);
                intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
                intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
                intent.putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, getContext().getPackageName());
                // No silence or minimum-length extras: some versions of Google's recogniser return
                // nothing at all when they are set. A pause ends a session and the web side starts the next.
                recognizer.startListening(intent);
                JSObject ret = new JSObject();
                ret.put("engine", engine);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject(e.getMessage(), "start");
            }
        });
    }

    /**
     * Whether the phone can recognise the language without a connection:
     * { status: "installed" | "pending" | "available" | "unsupported" }. "available"
     * means it can be downloaded with downloadModel. Android 13 and later only.
     */
    @PluginMethod
    public void offlineModel(PluginCall call) {
        final String lang = call.getString("lang", "ar-SA");
        if (Build.VERSION.SDK_INT < 33 || !SpeechRecognizer.isOnDeviceRecognitionAvailable(getContext())) {
            JSObject ret = new JSObject();
            ret.put("status", "unsupported");
            call.resolve(ret);
            return;
        }
        main.post(() -> checkModel(call, lang));
    }

    @RequiresApi(33)
    private void checkModel(PluginCall call, String lang) {
        final SpeechRecognizer r = SpeechRecognizer.createOnDeviceSpeechRecognizer(getContext());
        try {
            r.checkRecognitionSupport(recognizerIntent(lang), getContext().getMainExecutor(), new RecognitionSupportCallback() {
                @Override
                public void onSupportResult(RecognitionSupport support) {
                    String status = hasLang(support.getInstalledOnDeviceLanguages(), lang)
                        ? "installed"
                        : hasLang(support.getPendingOnDeviceLanguages(), lang)
                            ? "pending"
                            : hasLang(support.getSupportedOnDeviceLanguages(), lang) ? "available" : "unsupported";
                    r.destroy();
                    JSObject ret = new JSObject();
                    ret.put("status", status);
                    call.resolve(ret);
                }

                @Override
                public void onError(int error) {
                    r.destroy();
                    JSObject ret = new JSObject();
                    ret.put("status", "unsupported");
                    call.resolve(ret);
                }
            });
        } catch (Exception e) {
            r.destroy();
            JSObject ret = new JSObject();
            ret.put("status", "unsupported");
            call.resolve(ret);
        }
    }

    /** Asks the phone to download its offline model for the language (Android 13 and later). */
    @PluginMethod
    public void downloadModel(PluginCall call) {
        final String lang = call.getString("lang", "ar-SA");
        if (Build.VERSION.SDK_INT < 33 || !SpeechRecognizer.isOnDeviceRecognitionAvailable(getContext())) {
            call.reject("Offline speech recognition is not available on this phone", "unsupported");
            return;
        }
        main.post(() -> triggerDownload(call, lang));
    }

    @RequiresApi(33)
    private void triggerDownload(PluginCall call, String lang) {
        try {
            if (modelRecognizer != null) modelRecognizer.destroy();
            // Kept until the next request, so the download it hands to the system is not cut off.
            modelRecognizer = SpeechRecognizer.createOnDeviceSpeechRecognizer(getContext());
            modelRecognizer.triggerModelDownload(recognizerIntent(lang));
            call.resolve();
        } catch (Exception e) {
            call.reject(e.getMessage(), "download");
        }
    }

    /** Matches "ar-SA" with "ar-SA", "ar_SA" or plain "ar". */
    private static boolean hasLang(List<String> langs, String lang) {
        if (langs == null) return false;
        String want = lang.replace('_', '-').toLowerCase(Locale.ROOT);
        String base = want.split("-")[0];
        for (String l : langs) {
            String have = l.replace('_', '-').toLowerCase(Locale.ROOT);
            if (have.equals(want) || have.equals(base)) return true;
        }
        return false;
    }

    @PluginMethod
    public void stop(PluginCall call) {
        main.post(() -> {
            if (recognizer != null) recognizer.stopListening();
            call.resolve();
        });
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        main.post(() -> {
            destroy();
            call.resolve();
        });
    }

    @Override
    protected void handleOnDestroy() {
        main.post(this::destroyAll);
    }

    private void destroyAll() {
        destroy();
        if (modelRecognizer != null) {
            modelRecognizer.destroy();
            modelRecognizer = null;
        }
    }

    private void destroy() {
        if (recognizer != null) {
            recognizer.destroy();
            recognizer = null;
        }
    }

    private static String first(Bundle results) {
        if (results == null) return "";
        ArrayList<String> list = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
        return list == null || list.isEmpty() ? "" : list.get(0);
    }

    private static String errorCode(int error) {
        switch (error) {
            case SpeechRecognizer.ERROR_NO_MATCH:
                return "no-match";
            case SpeechRecognizer.ERROR_SPEECH_TIMEOUT:
                return "no-speech";
            case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS:
                return "permission";
            case SpeechRecognizer.ERROR_NETWORK:
            case SpeechRecognizer.ERROR_NETWORK_TIMEOUT:
            case SpeechRecognizer.ERROR_SERVER:
                return "network";
            case SpeechRecognizer.ERROR_AUDIO:
                return "audio";
            case SpeechRecognizer.ERROR_RECOGNIZER_BUSY:
                return "busy";
            case 12: // ERROR_LANGUAGE_NOT_SUPPORTED (API 31)
            case 13: // ERROR_LANGUAGE_UNAVAILABLE (API 31)
                return "language";
            default:
                return "error-" + error;
        }
    }

    private class Listener implements RecognitionListener {

        @Override
        public void onPartialResults(Bundle partial) {
            JSObject data = new JSObject();
            data.put("text", first(partial));
            notifyListeners("partial", data);
        }

        @Override
        public void onResults(Bundle results) {
            JSObject data = new JSObject();
            data.put("text", first(results));
            notifyListeners("result", data);
            notifyListeners("end", new JSObject());
        }

        @Override
        public void onError(int error) {
            JSObject data = new JSObject();
            data.put("code", errorCode(error));
            data.put("message", "Speech recognizer error " + error);
            notifyListeners("error", data);
            notifyListeners("end", new JSObject());
        }

        @Override
        public void onReadyForSpeech(Bundle params) {
            JSObject data = new JSObject();
            data.put("phase", "ready");
            notifyListeners("status", data);
        }

        @Override
        public void onBeginningOfSpeech() {
            JSObject data = new JSObject();
            data.put("phase", "speech");
            notifyListeners("status", data);
        }

        private long lastLevel = 0;

        /** The microphone level, so the page can show that it hears the person (about 8 times a second). */
        @Override
        public void onRmsChanged(float rmsdB) {
            long now = System.currentTimeMillis();
            if (now - lastLevel < 120) return;
            lastLevel = now;
            JSObject data = new JSObject();
            data.put("level", rmsdB);
            notifyListeners("level", data);
        }

        @Override
        public void onBufferReceived(byte[] buffer) {}

        @Override
        public void onEndOfSpeech() {}

        @Override
        public void onEvent(int eventType, Bundle params) {}
    }
}
