package org.neosystem.guardian;

import android.app.Activity;
import android.app.KeyguardManager;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.ConnectivityManager;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

public class ProductionActivity extends Activity {
    private static final int AUTH_REQUEST = 300;
    private static final int BG = Color.rgb(6, 9, 14);
    private static final int PANEL = Color.rgb(14, 20, 29);
    private static final int PANEL2 = Color.rgb(20, 28, 40);
    private static final int TEXT = Color.rgb(242, 247, 250);
    private static final int MUTED = Color.rgb(153, 168, 187);
    private static final int ACCENT = Color.rgb(75, 220, 170);
    private static final int WARN = Color.rgb(255, 184, 77);
    private static final int BLUE = Color.rgb(105, 169, 255);
    private static final int DANGER = Color.rgb(255, 105, 105);

    private static final String VERSION_API = "https://shemsizedek.github.io/neo-system/guardian/version.json";
    private static final String PRODUCT_URL = "https://shemsizedek.github.io/neo-system/guardian/";
    private static final String PRIVACY_URL = "https://shemsizedek.github.io/neo-system/guardian/privacy.html";
    private static final String TERMS_URL = "https://shemsizedek.github.io/neo-system/guardian/terms.html";
    private static final String SUPPORT_URL = "https://github.com/Shemsizedek/neo-system/issues";
    private static final String SOURCE_URL = "https://github.com/Shemsizedek/neo-system/tree/main/apps/neo-guardian";
    private static final String ANDROID_BULLETINS = "https://source.android.com/docs/security/bulletin";
    private static final String VIRUSTOTAL = "https://www.virustotal.com/gui/home/url";

    private LinearLayout content;
    private TextView statusChip;
    private boolean authenticated;
    private String livePublicIp = "Not checked";

    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        try {
            setContentView(buildShell());
            showLockGate();
        } catch (Throwable t) {
            TextView fallback = new TextView(this);
            fallback.setText("NEO Guardian failed to initialize safely. Reopen the app or reinstall the latest production build.");
            fallback.setTextColor(TEXT);
            fallback.setTextSize(18);
            fallback.setPadding(dp(24), dp(48), dp(24), dp(24));
            fallback.setBackgroundColor(BG);
            setContentView(fallback);
        }
    }

    private View buildShell() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(BG);
        root.addView(buildHeader());

        ScrollView scroll = new ScrollView(this);
        content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setPadding(dp(18), dp(16), dp(18), dp(28));
        scroll.addView(content);
        root.addView(scroll, new LinearLayout.LayoutParams(-1, 0, 1));
        root.addView(buildNav());
        return root;
    }

    private View buildHeader() {
        LinearLayout header = new LinearLayout(this);
        header.setGravity(Gravity.CENTER_VERTICAL);
        header.setPadding(dp(18), dp(18), dp(18), dp(14));
        header.setBackgroundColor(PANEL);
        ImageView logo = new ImageView(this);
        logo.setImageResource(R.drawable.neo_guardian_logo);
        header.addView(logo, new LinearLayout.LayoutParams(dp(54), dp(54)));
        LinearLayout titles = new LinearLayout(this);
        titles.setOrientation(LinearLayout.VERTICAL);
        titles.setPadding(dp(12), 0, 0, 0);
        titles.addView(txt("NEO Guardian", 24, true, TEXT));
        titles.addView(txt("Production Security Center • v3.0", 12, false, MUTED));
        header.addView(titles, new LinearLayout.LayoutParams(0, -2, 1));
        statusChip = txt("LOCKED", 11, true, WARN);
        statusChip.setGravity(Gravity.CENTER);
        statusChip.setPadding(dp(10), dp(7), dp(10), dp(7));
        statusChip.setBackground(round(Color.rgb(52, 42, 20), 18));
        header.addView(statusChip);
        return header;
    }

    private View buildNav() {
        LinearLayout nav = new LinearLayout(this);
        nav.setPadding(dp(8), dp(8), dp(8), dp(10));
        nav.setBackgroundColor(PANEL);
        String[] names = {"HOME", "LIVE", "DEFENSE", "HELP"};
        for (String name : names) {
            Button b = navButton(name);
            b.setOnClickListener(v -> {
                if (!authenticated) { showLockGate(); return; }
                if (name.equals("HOME")) showHome();
                else if (name.equals("LIVE")) showLiveCenter();
                else if (name.equals("DEFENSE")) showDefense();
                else showHelp();
            });
            nav.addView(b, new LinearLayout.LayoutParams(0, dp(52), 1));
        }
        return nav;
    }

    private void showLockGate() {
        authenticated = false;
        content.removeAllViews();
        statusChip.setText("LOCKED");
        statusChip.setTextColor(WARN);
        hero("Protected production console", "Unlock Guardian with your phone's trusted device authentication before accessing live network intelligence and defense controls.");
        actionCard("Device authentication", "Uses Android's secure credential confirmation. Guardian does not store your PIN, password, pattern, fingerprint, or face data.", "UNLOCK GUARDIAN", v -> requestAuthentication());
        infoCard("NO HIDDEN MONITORING", "Live requests run only when you tap a live function. Guardian does not continuously transmit device data in the background.", ACCENT);
    }

    private void requestAuthentication() {
        try {
            KeyguardManager km = (KeyguardManager) getSystemService(KEYGUARD_SERVICE);
            if (km == null || !km.isDeviceSecure()) { authenticated = true; showHome(); return; }
            Intent i = km.createConfirmDeviceCredentialIntent("Unlock NEO Guardian", "Authenticate to access your production security center.");
            if (i != null) startActivityForResult(i, AUTH_REQUEST); else { authenticated = true; showHome(); }
        } catch (Throwable t) {
            Toast.makeText(this, "Android authentication service unavailable", Toast.LENGTH_SHORT).show();
        }
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == AUTH_REQUEST) {
            if (resultCode == RESULT_OK) { authenticated = true; showHome(); }
            else showLockGate();
        }
    }

    private void showHome() {
        content.removeAllViews();
        statusChip.setText("ONLINE");
        statusChip.setTextColor(ACCENT);
        hero("Guardian production center", "Local device defense plus opt-in live network intelligence, update checks, actionable Android controls, and public support/legal surfaces.");
        sectionTitle("Core operations");
        actionCard("Local defense console", "Open Guardian's full on-device scan, app review, encrypted findings, diagnostics, and incident-response tools.", "OPEN DEFENSE", v -> launchLocalDefense());
        actionCard("Live network center", "Check active transport, VPN posture, public IP, API health, and production update status.", "OPEN LIVE CENTER", v -> showLiveCenter());
        actionCard("Production update check", "Query Guardian's live GitHub Pages version endpoint and compare it with this installed build.", "CHECK UPDATE", v -> checkForUpdates());
        sectionTitle("Production posture");
        infoCard("HTTPS ONLY", "Guardian blocks cleartext traffic and uses HTTPS for production API and support endpoints.", ACCENT);
        infoCard("OPT-IN NETWORKING", "Internet permission enables live features, but no background analytics or advertising SDK is included.", BLUE);
    }

    private void showLiveCenter() {
        content.removeAllViews();
        statusChip.setText("LIVE");
        statusChip.setTextColor(BLUE);
        hero("Live network intelligence", "These checks execute only when requested. Results are displayed locally and are not automatically uploaded to NEO services.");
        addConnectionPosture();
        infoCard("PUBLIC IP", livePublicIp, livePublicIp.equals("Not checked") ? MUTED : ACCENT);
        actionCard("Resolve public IP", "Uses the public ipify HTTPS API to show the Internet-facing IPv4/IPv6 address seen by the service.", "RUN LIVE API", v -> resolvePublicIp());
        actionCard("Check Guardian update feed", "Queries the live production version endpoint hosted with Guardian's public page.", "CHECK VERSION", v -> checkForUpdates());
        actionCard("URL reputation review", "Open VirusTotal's public URL review interface in your trusted browser. Guardian does not upload a URL until you choose to submit it there.", "OPEN VIRUSTOTAL", v -> openUrl(VIRUSTOTAL));
    }

    private void addConnectionPosture() {
        try {
            ConnectivityManager cm = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
            android.net.Network n = cm == null ? null : cm.getActiveNetwork();
            NetworkCapabilities c = (n == null || cm == null) ? null : cm.getNetworkCapabilities(n);
            if (c == null) { infoCard("NETWORK", "No active network detected", WARN); return; }
            String type = c.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) ? "Wi-Fi" : c.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) ? "Cellular" : c.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) ? "Ethernet" : "Other";
            boolean vpn = c.hasTransport(NetworkCapabilities.TRANSPORT_VPN);
            infoCard("NETWORK", type + (vpn ? " • VPN active" : " • no VPN transport detected"), vpn ? ACCENT : BLUE);
        } catch (Throwable t) {
            infoCard("NETWORK", "Android blocked connection inspection on this device", WARN);
        }
    }

    private void resolvePublicIp() {
        statusChip.setText("REQUESTING");
        statusChip.setTextColor(WARN);
        new Thread(() -> {
            try {
                String response = httpsGet("https://api64.ipify.org?format=json");
                JSONObject o = new JSONObject(response);
                livePublicIp = o.optString("ip", "Unavailable");
                runOnUiThread(() -> { statusChip.setText("LIVE"); statusChip.setTextColor(ACCENT); showLiveCenter(); });
            } catch (Throwable t) {
                runOnUiThread(() -> { statusChip.setText("API ERROR"); statusChip.setTextColor(DANGER); Toast.makeText(this, "Live IP lookup failed. Check network access.", Toast.LENGTH_LONG).show(); });
            }
        }).start();
    }

    private void checkForUpdates() {
        statusChip.setText("CHECKING");
        statusChip.setTextColor(WARN);
        new Thread(() -> {
            try {
                JSONObject o = new JSONObject(httpsGet(VERSION_API));
                String latest = o.optString("version", "unknown");
                String download = o.optString("download_url", PRODUCT_URL);
                String notes = o.optString("notes", "Production release information available.");
                String installed = getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
                boolean current = installed.equals(latest);
                runOnUiThread(() -> {
                    statusChip.setText(current ? "CURRENT" : "UPDATE");
                    statusChip.setTextColor(current ? ACCENT : WARN);
                    content.removeAllViews();
                    hero(current ? "Guardian is current" : "Guardian update available", "Installed: " + installed + " • Latest: " + latest);
                    infoCard("RELEASE NOTES", notes, current ? ACCENT : WARN);
                    actionCard("Production release page", "Open the official Guardian page for release information and supported downloads.", "OPEN RELEASE", v -> openUrl(download));
                    actionCard("Back to home", "Return to the Guardian production dashboard.", "HOME", v -> showHome());
                });
            } catch (Throwable t) {
                runOnUiThread(() -> {
                    statusChip.setText("OFFLINE");
                    statusChip.setTextColor(DANGER);
                    Toast.makeText(this, "Update service unavailable. Try again when connected.", Toast.LENGTH_LONG).show();
                });
            }
        }).start();
    }

    private void showDefense() {
        content.removeAllViews();
        statusChip.setText("DEFENSE");
        statusChip.setTextColor(ACCENT);
        hero("Rapid defense actions", "Trusted Android controls and Guardian's local defense console. These actions are visible and user-controlled.");
        actionCard("Full Guardian scan", "Run the existing v2 local-first scanner and encrypted incident console.", "OPEN SCANNER", v -> launchLocalDefense());
        actionCard("App permissions", "Review installed apps, permissions, sideloading, and uninstall controls.", "OPEN APPS", v -> safeStart(Settings.ACTION_APPLICATION_SETTINGS));
        actionCard("Accessibility services", "Review apps with powerful accessibility privileges.", "OPEN ACCESSIBILITY", v -> safeStart(Settings.ACTION_ACCESSIBILITY_SETTINGS));
        actionCard("VPN settings", "Review active and stored VPN profiles.", "OPEN VPN", v -> safeStart(Settings.ACTION_VPN_SETTINGS));
        actionCard("Security settings", "Review device lock, credentials, security controls, and updates.", "OPEN SECURITY", v -> safeStart(Settings.ACTION_SECURITY_SETTINGS));
        actionCard("Android security bulletins", "Open Google's Android security bulletin index in your browser.", "OPEN BULLETINS", v -> openUrl(ANDROID_BULLETINS));
        actionCard("Share posture summary", "Share a non-secret diagnostic summary using Android's standard sharesheet.", "SHARE", v -> shareSummary());
    }

    private void showHelp() {
        content.removeAllViews();
        statusChip.setText("SUPPORT");
        statusChip.setTextColor(BLUE);
        hero("Support & trust center", "Public product information, privacy terms, source code, issue reporting, and update information are one tap away.");
        actionCard("Guardian product page", "Open the public production landing page.", "OPEN WEBSITE", v -> openUrl(PRODUCT_URL));
        actionCard("Privacy policy", "Review exactly what Guardian accesses and what live features transmit.", "PRIVACY", v -> openUrl(PRIVACY_URL));
        actionCard("Terms of use", "Review production terms and security limitations.", "TERMS", v -> openUrl(TERMS_URL));
        actionCard("Report a problem", "Open the neo-system issue tracker for reproducible bugs and product feedback.", "SUPPORT", v -> openUrl(SUPPORT_URL));
        actionCard("Source code", "Inspect Guardian's public Android source.", "VIEW SOURCE", v -> openUrl(SOURCE_URL));
    }

    private void launchLocalDefense() {
        try { startActivity(new Intent(this, MainActivity.class)); }
        catch (Throwable t) { Toast.makeText(this, "Local defense console unavailable", Toast.LENGTH_LONG).show(); }
    }

    private void shareSummary() {
        String body = "NEO Guardian device posture\n" +
                "Device: " + Build.MANUFACTURER + " " + Build.MODEL + "\n" +
                "Android: " + Build.VERSION.RELEASE + " (API " + Build.VERSION.SDK_INT + ")\n" +
                "Security patch: " + Build.VERSION.SECURITY_PATCH + "\n" +
                "Public IP check: " + livePublicIp + "\n" +
                "Generated locally by NEO Guardian v3.0";
        Intent i = new Intent(Intent.ACTION_SEND);
        i.setType("text/plain");
        i.putExtra(Intent.EXTRA_SUBJECT, "NEO Guardian posture summary");
        i.putExtra(Intent.EXTRA_TEXT, body);
        startActivity(Intent.createChooser(i, "Share Guardian summary"));
    }

    private String httpsGet(String endpoint) throws Exception {
        URL u = new URL(endpoint);
        HttpURLConnection c = (HttpURLConnection) u.openConnection();
        c.setConnectTimeout(8000);
        c.setReadTimeout(8000);
        c.setRequestMethod("GET");
        c.setRequestProperty("Accept", "application/json,text/plain;q=0.9,*/*;q=0.5");
        c.setRequestProperty("User-Agent", "NEO-Guardian/3.0 Android");
        int code = c.getResponseCode();
        if (code < 200 || code >= 300) throw new IllegalStateException("HTTP " + code);
        BufferedReader r = new BufferedReader(new InputStreamReader(c.getInputStream(), StandardCharsets.UTF_8));
        StringBuilder out = new StringBuilder();
        String line;
        while ((line = r.readLine()) != null) out.append(line);
        r.close();
        c.disconnect();
        return out.toString();
    }

    private void safeStart(String action) {
        try { startActivity(new Intent(action)); }
        catch (Throwable t) { try { startActivity(new Intent(Settings.ACTION_SETTINGS)); } catch (Throwable ignored) {} }
    }

    private void openUrl(String url) {
        try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); }
        catch (Throwable t) { Toast.makeText(this, "No browser is available for this link", Toast.LENGTH_LONG).show(); }
    }

    private void hero(String title, String body) {
        LinearLayout card = panel(PANEL2);
        TextView a = txt(title, 22, true, TEXT);
        TextView b = txt(body, 14, false, MUTED);
        b.setPadding(0, dp(8), 0, 0);
        card.addView(a); card.addView(b); content.addView(card);
    }

    private void sectionTitle(String s) {
        TextView t = txt(s, 14, true, MUTED);
        t.setPadding(dp(2), dp(22), 0, dp(6));
        content.addView(t);
    }

    private void actionCard(String title, String body, String cta, View.OnClickListener listener) {
        LinearLayout card = panel(PANEL);
        TextView a = txt(title, 17, true, TEXT);
        TextView b = txt(body, 13, false, MUTED);
        b.setPadding(0, dp(5), 0, dp(10));
        Button button = primary(cta);
        button.setOnClickListener(listener);
        card.addView(a); card.addView(b); card.addView(button); content.addView(card);
    }

    private void infoCard(String title, String body, int accent) {
        LinearLayout card = panel(PANEL);
        TextView a = txt(title, 14, true, accent);
        TextView b = txt(body, 13, false, MUTED);
        b.setPadding(0, dp(5), 0, 0);
        card.addView(a); card.addView(b); content.addView(card);
    }

    private LinearLayout panel(int color) {
        LinearLayout x = new LinearLayout(this);
        x.setOrientation(LinearLayout.VERTICAL);
        x.setPadding(dp(16), dp(15), dp(16), dp(15));
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-1, -2);
        lp.setMargins(0, dp(8), 0, 0);
        x.setLayoutParams(lp);
        x.setBackground(round(color, 18));
        return x;
    }

    private GradientDrawable round(int color, int radius) {
        GradientDrawable g = new GradientDrawable();
        g.setColor(color);
        g.setCornerRadius(dp(radius));
        return g;
    }

    private TextView txt(String s, int sp, boolean bold, int color) {
        TextView t = new TextView(this);
        t.setText(s);
        t.setTextSize(sp);
        t.setTextColor(color);
        if (bold) t.setTypeface(Typeface.DEFAULT_BOLD);
        return t;
    }

    private Button primary(String s) {
        Button b = new Button(this);
        b.setText(s);
        b.setTextColor(Color.rgb(4, 20, 16));
        b.setTextSize(12);
        b.setTypeface(Typeface.DEFAULT_BOLD);
        b.setBackground(round(ACCENT, 14));
        return b;
    }

    private Button navButton(String s) {
        Button b = new Button(this);
        b.setText(s);
        b.setTextColor(TEXT);
        b.setTextSize(10);
        b.setBackgroundColor(Color.TRANSPARENT);
        return b;
    }

    private int dp(int n) { return (int) (n * getResources().getDisplayMetrics().density + 0.5f); }
}