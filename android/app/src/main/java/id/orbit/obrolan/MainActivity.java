package id.orbit.obrolan;

import android.Manifest;
import android.app.Activity;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.google.firebase.messaging.FirebaseMessaging;

import java.util.ArrayList;
import java.util.List;

/** Orbit: membungkus aplikasi web (WebView) dan menerima panggilan/pesan lewat Firebase Cloud Messaging. */
public class MainActivity extends Activity {
    static final String HOST = "orbit-obrolan.vercel.app";
    static final String URL = "https://" + HOST + "/";
    /** true selama layar Orbit terlihat; notifikasi tidak dibuat bila aplikasi sedang dibuka */
    static volatile boolean visible = false;

    private WebView web;
    private ValueCallback<Uri[]> fileCb;
    private PermissionRequest pendingReq;
    private String[] pendingRes;

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#0B141A"));
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setUserAgentString(s.getUserAgentString() + " OrbitApp/2");
        CookieManager.getInstance().setAcceptCookie(true);
        web.addJavascriptInterface(new Bridge(), "OrbitNative");

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                if (HOST.equals(u.getHost())) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignored) { }
                return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest req) {
                runOnUiThread(() -> handlePermission(req));
            }

            @Override
            public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
                if (fileCb != null) fileCb.onReceiveValue(null);
                fileCb = cb;
                try {
                    startActivityForResult(p.createIntent(), 1);
                } catch (Exception e) {
                    fileCb = null;
                    return false;
                }
                return true;
            }
        });

        if (Build.VERSION.SDK_INT >= 33
                && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 1);
        }
        askFullScreenIntent();

        FirebaseMessaging.getInstance().getToken().addOnSuccessListener(t ->
                getSharedPreferences("orbit", MODE_PRIVATE).edit().putString("fcm", t).apply());

        handle(getIntent());
        web.loadUrl(URL);
    }

    /** Android 14+: izin layar penuh untuk panggilan masuk perlu diberikan pengguna (sekali). */
    private void askFullScreenIntent() {
        if (Build.VERSION.SDK_INT < 34) return;
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        SharedPreferences p = getSharedPreferences("orbit", MODE_PRIVATE);
        if (!nm.canUseFullScreenIntent() && !p.getBoolean("fsi_asked", false)) {
            p.edit().putBoolean("fsi_asked", true).apply();
            try {
                startActivity(new Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT,
                        Uri.parse("package:" + getPackageName())));
            } catch (Exception ignored) { }
        }
    }

    private void handlePermission(PermissionRequest req) {
        if (!HOST.equals(req.getOrigin().getHost())) { req.deny(); return; }
        List<String> need = new ArrayList<>();
        for (String r : req.getResources()) {
            if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(r)) need.add(Manifest.permission.RECORD_AUDIO);
            if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(r)) need.add(Manifest.permission.CAMERA);
        }
        List<String> missing = new ArrayList<>();
        for (String p : need) if (checkSelfPermission(p) != PackageManager.PERMISSION_GRANTED) missing.add(p);
        if (missing.isEmpty()) {
            req.grant(req.getResources());
        } else {
            pendingReq = req;
            pendingRes = req.getResources();
            requestPermissions(missing.toArray(new String[0]), 2);
        }
    }

    @Override
    public void onRequestPermissionsResult(int code, String[] perms, int[] res) {
        super.onRequestPermissionsResult(code, perms, res);
        if (code != 2 || pendingReq == null) return;
        List<String> ok = new ArrayList<>();
        for (String r : pendingRes) {
            if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(r)
                    && checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) ok.add(r);
            if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(r)
                    && checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) ok.add(r);
        }
        if (ok.isEmpty()) pendingReq.deny(); else pendingReq.grant(ok.toArray(new String[0]));
        pendingReq = null;
        pendingRes = null;
    }

    @Override
    protected void onActivityResult(int code, int res, Intent data) {
        super.onActivityResult(code, res, data);
        if (code == 1 && fileCb != null) {
            fileCb.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(res, data));
            fileCb = null;
        }
    }

    @Override
    protected void onNewIntent(Intent i) {
        super.onNewIntent(i);
        setIntent(i);
        handle(i);
    }

    /** Dibuka dari notifikasi panggilan: tampil di atas layar kunci dan segera cek undangan panggilan. */
    private void handle(Intent i) {
        if (i != null && i.getBooleanExtra("call", false)) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
            if (web != null) web.evaluateJavascript("try{pollSig()}catch(e){}", null);
        }
    }

    @Override
    protected void onStart() {
        super.onStart();
        visible = true;
        ((NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE)).cancel(Notifier.CALL_ID);
    }

    @Override
    protected void onStop() {
        super.onStop();
        visible = false;
        setShowWhenLocked(false);
        setTurnScreenOn(false);
    }

    @Override
    public void onBackPressed() {
        web.evaluateJavascript(
                "(function(){try{if(document.querySelector('#cl:not([hidden])'))return 'call';"
                        + "if(document.getElementById('app').classList.contains('op')){back();return 'back'}}catch(e){}return 'exit'})()",
                v -> { if (v != null && v.contains("exit")) moveTaskToBack(true); });
    }

    /** Jembatan JavaScript: window.OrbitNative */
    private class Bridge {
        @JavascriptInterface
        public String getToken() {
            return getSharedPreferences("orbit", MODE_PRIVATE).getString("fcm", "");
        }

        @JavascriptInterface
        public void clearCall() {
            ((NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE)).cancel(Notifier.CALL_ID);
        }

        @JavascriptInterface
        public String version() { return "2"; }
    }
}
