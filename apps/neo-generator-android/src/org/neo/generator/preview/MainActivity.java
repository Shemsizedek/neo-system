package org.neo.generator.preview;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

/** Preview companion: bundled planning UI only, no native hashing or signing bridge. */
public final class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String HOME = "https://" + HOST + "/neo/index.html";
    private static final Set<String> ASSETS = new HashSet<>(Arrays.asList("index.html", "styles.css", "core.js", "app.js"));
    private static final Set<String> EXTERNAL_HOSTS = new HashSet<>(Arrays.asList(
        "www.nicehash.com", "www.bitdeer.com", "help.bitfufu.com", "ecos.am", "github.com", "shemsizedek.github.io"
    ));
    private WebView web;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.rgb(16, 27, 20));
        getWindow().setNavigationBarColor(Color.rgb(16, 27, 20));
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(246, 248, 243));
        WebView.setWebContentsDebuggingEnabled(false);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setGeolocationEnabled(false);
        settings.setSaveFormData(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setSafeBrowsingEnabled(true);
        CookieManager.getInstance().setAcceptCookie(false);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, false);
        web.setWebChromeClient(new WebChromeClient() {
            @Override public void onPermissionRequest(PermissionRequest request) { request.deny(); }
        });
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return navigate(request.getUrl());
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return navigate(Uri.parse(url));
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (!"GET".equals(request.getMethod()) || !isLocal(uri)) return blocked();
                String name = uri.getPath().substring("/neo/".length());
                if (!ASSETS.contains(name) || uri.getQuery() != null) return blocked();
                String mime = name.endsWith(".css") ? "text/css" : name.endsWith(".js") ? "application/javascript" : "text/html";
                try { return new WebResourceResponse(mime, "UTF-8", getAssets().open(name)); }
                catch (IOException ignored) { return blocked(); }
            }
        });
        // There is deliberately no addJavascriptInterface, wallet signer, file chooser or background service.
        if (Build.VERSION.SDK_INT >= 30) {
            web.setOnApplyWindowInsetsListener((view, insets) -> {
                android.graphics.Insets bars = insets.getInsets(android.view.WindowInsets.Type.systemBars());
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
                return insets;
            });
        }
        setContentView(web);
        web.loadUrl(HOME);
    }

    private boolean isLocal(Uri uri) {
        return "https".equals(uri.getScheme()) && HOST.equals(uri.getHost()) && uri.getPort() == -1
            && uri.getUserInfo() == null && uri.getPath() != null && uri.getPath().startsWith("/neo/");
    }
    private boolean navigate(Uri uri) {
        if (isLocal(uri) && "/neo/index.html".equals(uri.getPath()) && uri.getQuery() == null) return false;
        if ("https".equals(uri.getScheme()) && uri.getUserInfo() == null && uri.getPort() == -1 && EXTERNAL_HOSTS.contains(uri.getHost())) {
            try {
                Intent intent = new Intent(Intent.ACTION_VIEW, uri);
                intent.addCategory(Intent.CATEGORY_BROWSABLE);
                startActivity(intent);
            } catch (ActivityNotFoundException ignored) {
                Toast.makeText(this, "Install a browser to open this link.", Toast.LENGTH_LONG).show();
            }
        } else {
            Toast.makeText(this, "This link is not approved for the preview.", Toast.LENGTH_SHORT).show();
        }
        return true;
    }
    private WebResourceResponse blocked() {
        return new WebResourceResponse("text/plain", "UTF-8", 403, "Blocked", null,
            new ByteArrayInputStream("Resource blocked".getBytes(StandardCharsets.UTF_8)));
    }
    @Override public void onBackPressed() {
        if (web != null && web.canGoBack()) web.goBack(); else super.onBackPressed();
    }
    @Override protected void onDestroy() {
        if (web != null) { web.stopLoading(); web.destroy(); web = null; }
        super.onDestroy();
    }
}
