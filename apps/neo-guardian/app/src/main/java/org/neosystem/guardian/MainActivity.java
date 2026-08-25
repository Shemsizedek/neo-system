package org.neosystem.guardian;

import android.app.Activity;
import android.app.KeyguardManager;
import android.app.admin.DevicePolicyManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.os.Bundle;
import android.provider.Settings;
import android.text.TextUtils;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class MainActivity extends Activity {
    private LinearLayout results;
    private TextView scoreView;
    private int riskPoints;
    private int checks;

    private static final Set<String> HIGH_RISK_PERMISSIONS = new HashSet<>(Arrays.asList(
            "android.permission.READ_SMS",
            "android.permission.RECEIVE_SMS",
            "android.permission.SEND_SMS",
            "android.permission.READ_CALL_LOG",
            "android.permission.WRITE_CALL_LOG",
            "android.permission.RECORD_AUDIO",
            "android.permission.CAMERA",
            "android.permission.ACCESS_FINE_LOCATION",
            "android.permission.READ_CONTACTS",
            "android.permission.WRITE_CONTACTS",
            "android.permission.REQUEST_INSTALL_PACKAGES"
    ));

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(buildUi());
        runSecurityScan();
    }

    private View buildUi() {
        ScrollView scroll = new ScrollView(this);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(dp(20), dp(24), dp(20), dp(32));
        root.setBackgroundColor(Color.rgb(10, 13, 18));

        TextView title = text("NEO GUARDIAN", 28, true);
        title.setTextColor(Color.WHITE);
        root.addView(title);

        TextView sub = text("Local-first Android defensive security scanner", 15, false);
        sub.setTextColor(Color.LTGRAY);
        root.addView(sub);

        scoreView = text("Scanning…", 22, true);
        scoreView.setPadding(0, dp(24), 0, dp(16));
        scoreView.setTextColor(Color.WHITE);
        root.addView(scoreView);

        Button scan = new Button(this);
        scan.setText("RUN SECURITY SCAN");
        scan.setOnClickListener(v -> runSecurityScan());
        root.addView(scan);

        Button settingsButton = new Button(this);
        settingsButton.setText("OPEN ANDROID SECURITY SETTINGS");
        settingsButton.setOnClickListener(v -> startActivity(new Intent(Settings.ACTION_SECURITY_SETTINGS)));
        root.addView(settingsButton);

        TextView privacy = text("Privacy posture: this build declares NO Internet permission, NO microphone access, NO camera access, NO SMS access, and NO location access.", 13, false);
        privacy.setTextColor(Color.rgb(160, 210, 180));
        privacy.setPadding(0, dp(14), 0, dp(14));
        root.addView(privacy);

        results = new LinearLayout(this);
        results.setOrientation(LinearLayout.VERTICAL);
        root.addView(results);
        scroll.addView(root);
        return scroll;
    }

    private void runSecurityScan() {
        results.removeAllViews();
        riskPoints = 0;
        checks = 0;

        checkScreenLock();
        checkAdb();
        checkDeveloperOptions();
        checkEncryption();
        checkBuildIntegrityHints();
        checkNetwork();
        auditInstalledApps();

        int score = Math.max(0, 100 - riskPoints);
        String grade = score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 60 ? "D" : "F";
        scoreView.setText("Security Score: " + score + "/100  •  Grade " + grade);
    }

    private void checkScreenLock() {
        checks++;
        KeyguardManager km = (KeyguardManager) getSystemService(KEYGUARD_SERVICE);
        boolean secure = km != null && km.isDeviceSecure();
        finding("Secure screen lock", secure ? "Enabled" : "Not enabled", secure, secure ? 0 : 20);
    }

    private void checkAdb() {
        checks++;
        boolean adb = Settings.Global.getInt(getContentResolver(), Settings.Global.ADB_ENABLED, 0) == 1;
        finding("USB debugging (ADB)", adb ? "Enabled — disable when not actively developing" : "Disabled", !adb, adb ? 10 : 0);
    }

    private void checkDeveloperOptions() {
        checks++;
        boolean dev = Settings.Global.getInt(getContentResolver(), Settings.Global.DEVELOPMENT_SETTINGS_ENABLED, 0) == 1;
        finding("Developer options", dev ? "Enabled" : "Disabled", !dev, dev ? 5 : 0);
    }

    private void checkEncryption() {
        checks++;
        DevicePolicyManager dpm = (DevicePolicyManager) getSystemService(DEVICE_POLICY_SERVICE);
        boolean encrypted = false;
        if (dpm != null) {
            int status = dpm.getStorageEncryptionStatus();
            encrypted = status == DevicePolicyManager.ENCRYPTION_STATUS_ACTIVE
                    || status == DevicePolicyManager.ENCRYPTION_STATUS_ACTIVE_DEFAULT_KEY
                    || status == DevicePolicyManager.ENCRYPTION_STATUS_ACTIVE_PER_USER;
        }
        finding("Device storage encryption", encrypted ? "Active" : "Could not confirm active encryption", encrypted, encrypted ? 0 : 15);
    }

    private void checkBuildIntegrityHints() {
        checks++;
        String tags = android.os.Build.TAGS;
        boolean testKeys = tags != null && tags.contains("test-keys");
        boolean suspicious = testKeys || "eng".equals(android.os.Build.TYPE);
        finding("OS build integrity hints", suspicious ? "Engineering/test-key build detected" : "No obvious engineering/test-key indicators", !suspicious, suspicious ? 15 : 0);
    }

    private void checkNetwork() {
        checks++;
        ConnectivityManager cm = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
        Network network = cm == null ? null : cm.getActiveNetwork();
        NetworkCapabilities caps = network == null || cm == null ? null : cm.getNetworkCapabilities(network);
        if (caps == null) {
            finding("Network posture", "No active network detected", true, 0);
            return;
        }
        List<String> transports = new ArrayList<>();
        if (caps.hasTransport(NetworkCapabilities.TRANSPORT_VPN)) transports.add("VPN");
        if (caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)) transports.add("Wi‑Fi");
        if (caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)) transports.add("Cellular");
        if (caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)) transports.add("Ethernet");
        boolean vpn = caps.hasTransport(NetworkCapabilities.TRANSPORT_VPN);
        finding("Network posture", TextUtils.join(" + ", transports) + (vpn ? " — VPN active" : " — no VPN detected"), true, 0);
    }

    private void auditInstalledApps() {
        checks++;
        PackageManager pm = getPackageManager();
        List<PackageInfo> packages;
        try {
            packages = pm.getInstalledPackages(PackageManager.GET_PERMISSIONS);
        } catch (Exception e) {
            finding("Installed-app audit", "Android blocked package inventory", false, 5);
            return;
        }

        List<String> flagged = new ArrayList<>();
        for (PackageInfo pi : packages) {
            if (pi.packageName.equals(getPackageName())) continue;
            ApplicationInfo ai = pi.applicationInfo;
            boolean debug = ai != null && (ai.flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
            int dangerousCount = 0;
            if (pi.requestedPermissions != null) {
                for (String p : pi.requestedPermissions) {
                    if (HIGH_RISK_PERMISSIONS.contains(p)) dangerousCount++;
                }
            }
            if (debug || dangerousCount >= 6) {
                String label;
                try { label = String.valueOf(pm.getApplicationLabel(ai)); }
                catch (Exception e) { label = pi.packageName; }
                flagged.add(label + " [" + pi.packageName + "] — " + dangerousCount + " high-impact permissions" + (debug ? ", debuggable" : ""));
            }
        }
        Collections.sort(flagged);
        int penalty = Math.min(15, flagged.size() * 2);
        if (flagged.isEmpty()) {
            finding("Installed-app audit", "No apps crossed Guardian's initial risk threshold", true, 0);
        } else {
            finding("Installed-app audit", flagged.size() + " app(s) deserve manual review", false, penalty);
            for (String item : flagged) addDetail("• " + item);
        }
    }

    private void finding(String name, String detail, boolean good, int penalty) {
        riskPoints += penalty;
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(dp(14), dp(12), dp(14), dp(12));
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.setMargins(0, dp(8), 0, 0);
        card.setLayoutParams(lp);
        card.setBackgroundColor(good ? Color.rgb(18, 48, 34) : Color.rgb(70, 38, 28));

        TextView h = text((good ? "✓ " : "⚠ ") + name, 16, true);
        h.setTextColor(Color.WHITE);
        card.addView(h);
        TextView d = text(detail, 13, false);
        d.setTextColor(Color.LTGRAY);
        card.addView(d);
        results.addView(card);
    }

    private void addDetail(String s) {
        TextView v = text(s, 12, false);
        v.setTextColor(Color.LTGRAY);
        v.setPadding(dp(10), dp(3), 0, 0);
        results.addView(v);
    }

    private TextView text(String value, int sp, boolean bold) {
        TextView t = new TextView(this);
        t.setText(value);
        t.setTextSize(sp);
        if (bold) t.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        t.setGravity(Gravity.START);
        return t;
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}
