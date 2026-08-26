package io.neo.omnitrix;

import android.app.*;
import android.content.*;
import android.graphics.Color;
import android.net.nsd.NsdManager;
import android.net.nsd.NsdServiceInfo;
import android.os.Bundle;
import android.text.InputType;
import android.view.*;
import android.webkit.*;
import android.widget.*;

import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends Activity {
    private static final String NOOGLE = "https://shemsizedek.github.io/neo-system/noogle/";
    private static final String SERVICE_TYPE = "_neo-miner._tcp.";

    private WebView web;
    private EditText addressBar;
    private String pendingNoogleQuery;
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private NsdManager nsd;
    private NsdManager.DiscoveryListener discoveryListener;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.rgb(8, 17, 14));
        buildUi();
        configureWeb();
        web.loadUrl(NOOGLE);
    }

    private void buildUi() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.rgb(247, 249, 248));

        LinearLayout bar = new LinearLayout(this);
        bar.setGravity(Gravity.CENTER_VERTICAL);
        bar.setPadding(dp(8), dp(7), dp(8), dp(7));
        bar.setBackgroundColor(Color.WHITE);

        TextView brand = new TextView(this);
        brand.setText("◎");
        brand.setTextSize(24);
        brand.setGravity(Gravity.CENTER);
        brand.setContentDescription("Omnitrix");
        brand.setOnClickListener(v -> web.loadUrl(NOOGLE));
        bar.addView(brand, new LinearLayout.LayoutParams(dp(42), dp(44)));

        Button back = smallButton("‹");
        back.setOnClickListener(v -> { if (web.canGoBack()) web.goBack(); });
        bar.addView(back);

        Button forward = smallButton("›");
        forward.setOnClickListener(v -> { if (web.canGoForward()) web.goForward(); });
        bar.addView(forward);

        Button reload = smallButton("↻");
        reload.setOnClickListener(v -> web.reload());
        bar.addView(reload);

        addressBar = new EditText(this);
        addressBar.setSingleLine(true);
        addressBar.setHint("Search Noogle or enter a web address");
        addressBar.setTextSize(15);
        addressBar.setPadding(dp(14), 0, dp(14), 0);
        addressBar.setBackgroundResource(android.R.drawable.edit_text);
        addressBar.setImeOptions(2);
        addressBar.setOnEditorActionListener((v, actionId, event) -> {
            navigate(addressBar.getText().toString());
            return true;
        });
        LinearLayout.LayoutParams addressLp = new LinearLayout.LayoutParams(0, dp(44), 1f);
        addressLp.setMargins(dp(6), 0, dp(6), 0);
        bar.addView(addressBar, addressLp);

        Button miner = smallButton("⚡");
        miner.setContentDescription("NEO Miner");
        miner.setOnClickListener(v -> showMinerPanel());
        bar.addView(miner);
        root.addView(bar, new LinearLayout.LayoutParams(-1, dp(58)));

        web = new WebView(this);
        root.addView(web, new LinearLayout.LayoutParams(-1, 0, 1f));

        LinearLayout dock = new LinearLayout(this);
        dock.setGravity(Gravity.CENTER);
        dock.setPadding(dp(6), dp(4), dp(6), dp(4));
        dock.setBackgroundColor(Color.WHITE);
        addDock(dock, "Noogle", v -> web.loadUrl(NOOGLE));
        addDock(dock, "Bitcoin", v -> web.loadUrl("https://mempool.space/"));
        addDock(dock, "XCP", v -> web.loadUrl("https://tokenscan.io/"));
        addDock(dock, "Miner", v -> showMinerPanel());
        addDock(dock, "Theme", v -> cycleTheme());
        root.addView(dock, new LinearLayout.LayoutParams(-1, dp(54)));

        setContentView(root);
    }

    private void configureWeb() {
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setBuiltInZoomControls(true);
        s.setDisplayZoomControls(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setSafeBrowsingEnabled(true);
        CookieManager.getInstance().setAcceptCookie(true);
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                UriSafety safety = UriSafety.check(req.getUrl().toString());
                if (safety.allowed) return false;
                Toast.makeText(MainActivity.this, "Blocked unsafe URL scheme", Toast.LENGTH_SHORT).show();
                return true;
            }
            @Override public void onPageFinished(WebView view, String url) {
                addressBar.setText(url);
                if (pendingNoogleQuery != null && url.startsWith(NOOGLE)) {
                    String q = pendingNoogleQuery.replace("\\", "\\\\").replace("'", "\\'");
                    pendingNoogleQuery = null;
                    view.evaluateJavascript("(function(){var i=document.getElementById('queryInput');var f=document.getElementById('searchForm');if(i&&f){i.value='" + q + "';f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));return 'ok';}return 'missing';})()", null);
                }
            }
        });
    }

    private void navigate(String raw) {
        String value = raw == null ? "" : raw.trim();
        if (value.isEmpty()) return;
        if (value.matches("(?i)^https://.+")) {
            web.loadUrl(value);
        } else if (value.matches("(?i)^http://.+")) {
            Toast.makeText(this, "Omnitrix requires HTTPS for direct browsing", Toast.LENGTH_LONG).show();
        } else if (value.matches("^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}(/.*)?$")) {
            web.loadUrl("https://" + value);
        } else {
            pendingNoogleQuery = value;
            if (web.getUrl() != null && web.getUrl().startsWith(NOOGLE)) {
                web.loadUrl(NOOGLE);
            } else {
                web.loadUrl(NOOGLE);
            }
        }
    }

    private void showMinerPanel() {
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setPadding(dp(18), dp(8), dp(18), 0);

        TextView intro = new TextView(this);
        intro.setText("Connect your NEO Miner or compatible adapter. Omnitrix only accepts authenticated HTTPS adapters you control.");
        intro.setTextSize(14);
        intro.setPadding(0, 0, 0, dp(12));
        box.addView(intro);

        EditText endpoint = new EditText(this);
        endpoint.setHint("https://miner.local:9443");
        endpoint.setSingleLine(true);
        box.addView(endpoint);

        EditText token = new EditText(this);
        token.setHint("Session access token");
        token.setSingleLine(true);
        token.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
        box.addView(token);

        TextView status = new TextView(this);
        status.setText("Status: Not connected");
        status.setPadding(0, dp(12), 0, dp(8));
        box.addView(status);

        Button discover = new Button(this);
        discover.setText("Find nearby NEO Miner adapters");
        discover.setOnClickListener(v -> discoverMiner(endpoint, status));
        box.addView(discover);

        LinearLayout actions = new LinearLayout(this);
        Button check = new Button(this); check.setText("Telemetry");
        Button start = new Button(this); start.setText("Start");
        Button stop = new Button(this); stop.setText("Stop");
        actions.addView(check, new LinearLayout.LayoutParams(0, -2, 1));
        actions.addView(start, new LinearLayout.LayoutParams(0, -2, 1));
        actions.addView(stop, new LinearLayout.LayoutParams(0, -2, 1));
        box.addView(actions);

        check.setOnClickListener(v -> adapterCall(endpoint.getText().toString(), token.getText().toString(), "GET", "/v1/status", status));
        start.setOnClickListener(v -> adapterCall(endpoint.getText().toString(), token.getText().toString(), "POST", "/v1/mining/start", status));
        stop.setOnClickListener(v -> adapterCall(endpoint.getText().toString(), token.getText().toString(), "POST", "/v1/mining/stop", status));

        AlertDialog dialog = new AlertDialog.Builder(this)
            .setTitle("NEO Miner")
            .setView(box)
            .setNegativeButton("Close", null)
            .create();
        dialog.setOnDismissListener(d -> stopDiscovery());
        dialog.show();
    }

    private void discoverMiner(EditText endpoint, TextView status) {
        stopDiscovery();
        nsd = (NsdManager) getSystemService(Context.NSD_SERVICE);
        status.setText("Status: Discovering secure local adapters…");
        discoveryListener = new NsdManager.DiscoveryListener() {
            @Override public void onDiscoveryStarted(String type) { }
            @Override public void onServiceFound(NsdServiceInfo service) {
                if (!service.getServiceType().startsWith("_neo-miner._tcp")) return;
                nsd.resolveService(service, new NsdManager.ResolveListener() {
                    @Override public void onResolveFailed(NsdServiceInfo serviceInfo, int errorCode) { }
                    @Override public void onServiceResolved(NsdServiceInfo resolved) {
                        String host = resolved.getHost() == null ? "" : resolved.getHost().getHostAddress();
                        int port = resolved.getPort();
                        runOnUiThread(() -> {
                            endpoint.setText("https://" + host + ":" + port);
                            status.setText("Status: Adapter found — authenticate to connect");
                        });
                    }
                });
            }
            @Override public void onServiceLost(NsdServiceInfo service) { }
            @Override public void onDiscoveryStopped(String type) { }
            @Override public void onStartDiscoveryFailed(String type, int errorCode) { runOnUiThread(() -> status.setText("Status: Discovery unavailable")); }
            @Override public void onStopDiscoveryFailed(String type, int errorCode) { }
        };
        nsd.discoverServices(SERVICE_TYPE, NsdManager.PROTOCOL_DNS_SD, discoveryListener);
    }

    private void stopDiscovery() {
        if (nsd != null && discoveryListener != null) {
            try { nsd.stopServiceDiscovery(discoveryListener); } catch (Exception ignored) { }
        }
        discoveryListener = null;
    }

    private void adapterCall(String base, String token, String method, String path, TextView status) {
        base = base == null ? "" : base.trim();
        token = token == null ? "" : token.trim();
        if (!base.toLowerCase(Locale.US).startsWith("https://") || token.length() < 8) {
            status.setText("Status: HTTPS endpoint and access token required");
            return;
        }
        final String url = base.replaceAll("/+$", "") + path;
        final String bearer = token;
        status.setText("Status: Connecting…");
        io.execute(() -> {
            try {
                HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
                c.setRequestMethod(method);
                c.setConnectTimeout(7000);
                c.setReadTimeout(9000);
                c.setRequestProperty("Accept", "application/json");
                c.setRequestProperty("Authorization", "Bearer " + bearer);
                if ("POST".equals(method)) { c.setDoOutput(true); c.getOutputStream().write("{}".getBytes(StandardCharsets.UTF_8)); }
                int code = c.getResponseCode();
                InputStream stream = code >= 200 && code < 400 ? c.getInputStream() : c.getErrorStream();
                String body = read(stream);
                String display = body.length() > 420 ? body.substring(0, 420) + "…" : body;
                runOnUiThread(() -> status.setText("Status: HTTP " + code + "\n" + display));
            } catch (Exception e) {
                runOnUiThread(() -> status.setText("Status: Connection failed — " + e.getMessage()));
            }
        });
    }

    private String read(InputStream in) throws IOException {
        if (in == null) return "No response body";
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[2048];
        int n;
        while ((n = in.read(buf)) > 0 && out.size() < 16384) out.write(buf, 0, n);
        return out.toString(StandardCharsets.UTF_8.name());
    }

    private void cycleTheme() {
        int current = getWindow().getStatusBarColor();
        if (current == Color.rgb(8, 17, 14)) {
            getWindow().setStatusBarColor(Color.BLACK);
            web.evaluateJavascript("document.documentElement.style.filter='grayscale(.12) contrast(1.05)'", null);
            Toast.makeText(this, "Omnitrix Graphite skin", Toast.LENGTH_SHORT).show();
        } else {
            getWindow().setStatusBarColor(Color.rgb(8, 17, 14));
            web.evaluateJavascript("document.documentElement.style.filter=''", null);
            Toast.makeText(this, "Omnitrix NEO skin", Toast.LENGTH_SHORT).show();
        }
    }

    private Button smallButton(String label) {
        Button b = new Button(this);
        b.setText(label);
        b.setTextSize(18);
        b.setAllCaps(false);
        b.setMinWidth(0);
        b.setMinimumWidth(0);
        b.setPadding(0, 0, 0, 0);
        b.setBackgroundColor(Color.TRANSPARENT);
        b.setLayoutParams(new LinearLayout.LayoutParams(dp(38), dp(44)));
        return b;
    }

    private void addDock(LinearLayout dock, String label, View.OnClickListener action) {
        Button b = new Button(this);
        b.setText(label);
        b.setTextSize(11);
        b.setAllCaps(false);
        b.setOnClickListener(action);
        b.setBackgroundColor(Color.TRANSPARENT);
        dock.addView(b, new LinearLayout.LayoutParams(0, -1, 1f));
    }

    private int dp(int value) { return (int) (value * getResources().getDisplayMetrics().density + .5f); }

    @Override public void onBackPressed() {
        if (web.canGoBack()) web.goBack(); else super.onBackPressed();
    }

    @Override protected void onDestroy() {
        stopDiscovery();
        io.shutdownNow();
        if (web != null) web.destroy();
        super.onDestroy();
    }

    private static final class UriSafety {
        final boolean allowed;
        UriSafety(boolean allowed) { this.allowed = allowed; }
        static UriSafety check(String url) {
            if (url == null) return new UriSafety(false);
            String u = url.toLowerCase(Locale.US);
            return new UriSafety(u.startsWith("https://") || u.startsWith("about:blank"));
        }
    }
}
