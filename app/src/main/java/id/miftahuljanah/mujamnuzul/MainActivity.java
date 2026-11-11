package id.miftahuljanah.mujamnuzul;

import android.app.Activity;
import android.content.ContentUris;
import android.content.ContentValues;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;

import androidx.webkit.WebViewAssetLoader;

import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/**
 * Aplikasi pembungkus: menampilkan mujam-nuzul.html dari dalam paket aplikasi (offline).
 * Pengembang: Miftahul Janah
 */
public class MainActivity extends Activity {

    private static final String HOST = "appassets.androidplatform.net";
    private static final String START_URL = "https://" + HOST + "/assets/mujam-nuzul.html";

    private static final int REQ_FILE = 1001;
    private static final String AUTO_NAME = "mujam-cadangan-otomatis.json";

    private WebView webView;
    private ValueCallback<Uri[]> fileCb;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        FrameLayout root = new FrameLayout(this);
        webView = new WebView(this);
        root.addView(webView, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        setContentView(root);

        root.setOnApplyWindowInsetsListener((v, insets) -> {
            int l, t, r, b;
            if (Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets i = insets.getInsets(
                        WindowInsets.Type.systemBars() | WindowInsets.Type.ime());
                l = i.left; t = i.top; r = i.right; b = i.bottom;
            } else {
                l = insets.getSystemWindowInsetLeft();
                t = insets.getSystemWindowInsetTop();
                r = insets.getSystemWindowInsetRight();
                b = insets.getSystemWindowInsetBottom();
            }
            v.setPadding(l, t, r, b);
            return insets;
        });

        final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return loader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if (HOST.equals(u.getHost())) {
                    return false;
                }
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, u));
                } catch (Exception ignored) {
                }
                return true;
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> cb,
                                             FileChooserParams params) {
                if (fileCb != null) {
                    fileCb.onReceiveValue(null);
                }
                fileCb = cb;
                Intent i = new Intent(Intent.ACTION_GET_CONTENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("*/*");
                try {
                    startActivityForResult(Intent.createChooser(i, "Pilih berkas cadangan"), REQ_FILE);
                } catch (Exception e) {
                    fileCb = null;
                    return false;
                }
                return true;
            }
        });

        webView.addJavascriptInterface(new Bridge(), "AndroidBridge");

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState);
        } else {
            webView.loadUrl(START_URL);
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == REQ_FILE) {
            if (fileCb != null) {
                Uri[] r = null;
                if (resultCode == RESULT_OK) {
                    r = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
                }
                fileCb.onReceiveValue(r);
                fileCb = null;
            }
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        webView.saveState(outState);
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.removeJavascriptInterface("AndroidBridge");
            webView.destroy();
        }
        super.onDestroy();
    }

    /** Menulis (menimpa) berkas cadangan otomatis di folder Unduhan; mengembalikan label lokasi. */
    private String writeAuto(String content) throws Exception {
        byte[] data = content.getBytes(StandardCharsets.UTF_8);
        if (Build.VERSION.SDK_INT >= 29) {
            Uri coll = MediaStore.Downloads.EXTERNAL_CONTENT_URI;
            Uri uri = null;
            try (Cursor c = getContentResolver().query(coll,
                    new String[]{MediaStore.Downloads._ID},
                    MediaStore.Downloads.DISPLAY_NAME + "=? AND " + MediaStore.Downloads.RELATIVE_PATH + "=?",
                    new String[]{AUTO_NAME, Environment.DIRECTORY_DOWNLOADS + "/"}, null)) {
                if (c != null && c.moveToFirst()) {
                    uri = ContentUris.withAppendedId(coll, c.getLong(0));
                }
            }
            if (uri == null) {
                ContentValues v = new ContentValues();
                v.put(MediaStore.Downloads.DISPLAY_NAME, AUTO_NAME);
                v.put(MediaStore.Downloads.MIME_TYPE, "application/json");
                v.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                uri = getContentResolver().insert(coll, v);
            }
            if (uri == null) {
                throw new IllegalStateException("insert gagal");
            }
            try (OutputStream os = getContentResolver().openOutputStream(uri, "wt")) {
                os.write(data);
            }
            return "Unduhan/" + AUTO_NAME;
        }
        File dir = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
        File f = new File(dir, AUTO_NAME);
        try (FileOutputStream os = new FileOutputStream(f)) {
            os.write(data);
        }
        return f.getAbsolutePath() + " (terhapus bila aplikasi dihapus)";
    }

    /** Dipanggil dari HTML untuk menyimpan berkas (CSV, JSON) ke folder Unduhan. */
    private class Bridge {
        @JavascriptInterface
        public void autoBackup(final String content) {
            new Thread(() -> {
                String label = null;
                try {
                    label = writeAuto(content);
                } catch (Exception ignored) {
                }
                final String js = "window.onAutoBackup&&window.onAutoBackup("
                        + (label == null ? "null" : JSONObject.quote(label)) + ")";
                runOnUiThread(() -> {
                    if (webView != null) {
                        webView.evaluateJavascript(js, null);
                    }
                });
            }).start();
        }

        @JavascriptInterface
        public void saveFile(final String name, final String mime, final String content) {
            String msg;
            try {
                String safe = name.replaceAll("[\\\\/:*?\"<>|]", "_");
                byte[] data = content.getBytes(StandardCharsets.UTF_8);
                if (Build.VERSION.SDK_INT >= 29) {
                    ContentValues v = new ContentValues();
                    v.put(MediaStore.Downloads.DISPLAY_NAME, safe);
                    v.put(MediaStore.Downloads.MIME_TYPE, mime);
                    v.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                    Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
                    if (uri == null) {
                        throw new IllegalStateException("insert gagal");
                    }
                    try (OutputStream os = getContentResolver().openOutputStream(uri)) {
                        os.write(data);
                    }
                    msg = "Tersimpan di folder Unduhan: " + safe;
                } else {
                    File dir = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                    File f = new File(dir, safe);
                    try (FileOutputStream os = new FileOutputStream(f)) {
                        os.write(data);
                    }
                    msg = "Tersimpan: " + f.getAbsolutePath();
                }
            } catch (Exception e) {
                msg = "Gagal menyimpan berkas";
            }
            final String shown = msg;
            runOnUiThread(() -> Toast.makeText(MainActivity.this, shown, Toast.LENGTH_LONG).show());
        }
    }
}
