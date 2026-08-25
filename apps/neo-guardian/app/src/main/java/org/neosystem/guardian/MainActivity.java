package org.neosystem.guardian;

import android.app.Activity;
import android.app.KeyguardManager;
import android.app.admin.DevicePolicyManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.graphics.Color;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.text.TextUtils;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import java.io.File;
import java.security.KeyStore;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Enumeration;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class MainActivity extends Activity {
    private static final String PREFS = "guardian_history";
    private static final String HISTORY = "scan_history";

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
            "android.permission.REQUEST_INSTALL_PACKAGES",
            "android.permission.SYSTEM_ALERT_WINDOW",
            "android.permission.BIND_ACCESSIBILITY_SERVICE"
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

        TextView title = text("NEO GUARDIAN v1.1", 28, true);
        title.setTextColor(Color.WHITE);
        root.addView(title);

        TextView sub = text("Advanced local-first Android defensive security center", 15, false);
        sub.setTextColor(Color.LTGRAY);
        root.addView(sub);

        scoreView = text("Scanning…", 22, true);
        scoreView.setPadding(0, dp(24), 0, dp(16));
        scoreView.setTextColor(Color.WHITE);
        root.addView(scoreView);

        Button scan = button("RUN ADVANCED SECURITY SCAN");
        scan.setOnClickListener(v -> runSecurityScan());
        root.addView(scan);

        Button lockdown = button("OPEN LOCKDOWN CENTER");
        lockdown.setOnClickListener(v -> showLockdownCenter());
        root.addView(lockdown);

        Button history = button("SHOW LOCAL SCAN HISTORY");
        history.setOnClickListener(v -> showHistory());
        root.addView(history);

        TextView privacy = text("Privacy posture: no Internet, microphone, camera, SMS, contacts, or location permission. Scan history stays on this device.", 13, false);
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
        checkSecurityPatch();
        checkBuildIntegrityHints();
        checkRootIndicators();
        checkAccessibilityExposure();
        checkDeviceAdmins();
        checkNetworkAndVpn();
        checkPrivateDns();
        checkCertificateStore();
        checkGuardianSignature();
        auditInstalledApps();

        int score = Math.max(0, 100 - Math.min(100, riskPoints));
        String grade = score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 60 ? "D" : "F";
        scoreView.setText("Security Score: " + score + "/100  •  Grade " + grade + "  •  " + checks + " checks");
        recordHistory(score, grade);
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

    private void checkSecurityPatch() {
        checks++;
        String patch = Build.VERSION.SECURITY_PATCH;
        boolean current = false;
        String detail = "Security patch: " + (TextUtils.isEmpty(patch) ? "unknown" : patch);
        if (!TextUtils.isEmpty(patch)) {
            try {
                LocalDate patchDate = LocalDate.parse(patch);
                long age = ChronoUnit.DAYS.between(patchDate, LocalDate.now());
                current = age <= 120;
                detail += " (" + age + " days old)";
            } catch (Exception ignored) { }
        }
        finding("Android security patch", detail, current, current ? 0 : 10);
    }

    private void checkBuildIntegrityHints() {
        checks++;
        String tags = Build.TAGS;
        boolean testKeys = tags != null && tags.contains("test-keys");
        boolean suspicious = testKeys || "eng".equals(Build.TYPE);
        finding("OS build integrity hints", suspicious ? "Engineering/test-key build detected" : "No obvious engineering/test-key indicators", !suspicious, suspicious ? 15 : 0);
    }

    private void checkRootIndicators() {
        checks++;
        String[] paths = {
                "/system/bin/su", "/system/xbin/su", "/sbin/su", "/vendor/bin/su",
                "/data/local/bin/su", "/data/local/xbin/su", "/system/app/Superuser.apk"
        };
        List<String> found = new ArrayList<>();
        for (String path : paths) if (new File(path).exists()) found.add(path);
        boolean suspicious = !found.isEmpty();
        finding("Root indicators", suspicious ? "Potential root artifacts found: " + TextUtils.join(", ", found) : "No common su/root artifacts detected", !suspicious, suspicious ? 20 : 0);
    }

    private void checkAccessibilityExposure() {
        checks++;
        boolean enabled = Settings.Secure.getInt(getContentResolver(), Settings.Secure.ACCESSIBILITY_ENABLED, 0) == 1;
        String services = Settings.Secure.getString(getContentResolver(), Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES);
        if (!enabled || TextUtils.isEmpty(services)) {
            finding("Accessibility services", "No enabled accessibility services detected", true, 0);
            return;
        }
        String[] items = services.split(":");
        finding("Accessibility services", items.length + " enabled service(s) — verify every one is intentional", false, Math.min(12, items.length * 4));
        for (String item : items) addDetail("• " + item);
    }

    private void checkDeviceAdmins() {
        checks++;
        DevicePolicyManager dpm = (DevicePolicyManager) getSystemService(DEVICE_POLICY_SERVICE);
        List<ComponentName> admins = dpm == null ? null : dpm.getActiveAdmins();
        if (admins == null || admins.isEmpty()) {
            finding("Device administrators", "No active third-party device administrators reported", true, 0);
            return;
        }
        finding("Device administrators", admins.size() + " active administrator(s) — verify every entry", false, Math.min(10, admins.size() * 3));
        for (ComponentName admin : admins) addDetail("• " + admin.flattenToShortString());
    }

    private void checkNetworkAndVpn() {
        checks++;
        ConnectivityManager cm = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
        Network network = cm == null ? null : cm.getActiveNetwork();
        NetworkCapabilities caps = network == null || cm == null ? null : cm.getNetworkCapabilities(network);
        if (caps == null) {
            finding("Network / VPN posture", "No active network detected", true, 0);
            return;
        }
        List<String> transports = new ArrayList<>();
        if (caps.hasTransport(NetworkCapabilities.TRANSPORT_VPN)) transports.add("VPN");
        if (caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)) transports.add("Wi‑Fi");
        if (caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)) transports.add("Cellular");
        if (caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)) transports.add("Ethernet");
        boolean vpn = caps.hasTransport(NetworkCapabilities.TRANSPORT_VPN);
        finding("Network / VPN posture", TextUtils.join(" + ", transports) + (vpn ? " — VPN active" : " — no VPN detected"), true, 0);
    }

    private void checkPrivateDns() {
        checks++;
        String mode = Settings.Global.getString(getContentResolver(), "private_dns_mode");
        String specifier = Settings.Global.getString(getContentResolver(), "private_dns_specifier");
        if (TextUtils.isEmpty(mode)) mode = "unknown";
        boolean secureMode = "hostname".equals(mode) || "opportunistic".equals(mode);
        String detail = "Mode: " + mode;
        if (!TextUtils.isEmpty(specifier)) detail += " • provider: " + specifier;
        finding("Private DNS", detail, secureMode, secureMode ? 0 : 4);
    }

    private void checkCertificateStore() {
        checks++;
        int userCerts = 0;
        int total = 0;
        try {
            KeyStore ks = KeyStore.getInstance("AndroidCAStore");
            ks.load(null);
            Enumeration<String> aliases = ks.aliases();
            while (aliases.hasMoreElements()) {
                String alias = aliases.nextElement();
                total++;
                if (alias != null && alias.startsWith("user:")) userCerts++;
            }
            boolean clean = userCerts == 0;
            finding("Trusted certificate store", total + " CA entries; " + userCerts + " user-added certificate(s)", clean, clean ? 0 : Math.min(12, userCerts * 4));
        } catch (Exception e) {
            finding("Trusted certificate store", "Android did not expose certificate inventory", true, 0);
        }
    }

    private void checkGuardianSignature() {
        checks++;
        try {
            PackageInfo info = getPackageManager().getPackageInfo(getPackageName(), PackageManager.GET_SIGNING_CERTIFICATES);
            Signature[] signatures = info.signingInfo == null ? null : info.signingInfo.getApkContentsSigners();
            if (signatures == null || signatures.length == 0) {
                finding("Guardian APK signature", "Unable to read signing certificate", false, 5);
                return;
            }
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(signatures[0].toByteArray());
            finding("Guardian APK signature", "SHA-256 certificate: " + hex(digest), true, 0);
        } catch (Exception e) {
            finding("Guardian APK signature", "Unable to calculate certificate fingerprint", false, 5);
        }
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
                for (String p : pi.requestedPermissions) if (HIGH_RISK_PERMISSIONS.contains(p)) dangerousCount++;
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
            finding("Installed-app audit", "No apps crossed Guardian's review threshold", true, 0);
        } else {
            finding("Installed-app audit", flagged.size() + " app(s) deserve manual review; a flag is not proof of malware", false, penalty);
            for (String item : flagged) addDetail("• " + item);
        }
    }

    private void showLockdownCenter() {
        results.removeAllViews();
        addSection("LOCKDOWN CENTER", "Use this checklist when you suspect compromise or want maximum defensive posture.");
        addDetail("1. Disable USB debugging and Developer options unless actively required.");
        addDetail("2. Review every Accessibility service; disable anything you do not recognize or need.");
        addDetail("3. Review Device admin apps and remove unexpected administrators.");
        addDetail("4. Verify VPN and Private DNS configuration.");
        addDetail("5. Install Android security/system updates.");
        addDetail("6. Review unknown apps, sideloaded apps, and apps with broad permissions.");
        addDetail("7. Change critical account passwords from a trusted device if compromise is suspected.");
        addDetail("8. Preserve evidence before factory reset if you may need professional incident response.");

        Button security = button("ANDROID SECURITY SETTINGS");
        security.setOnClickListener(v -> safeStart(new Intent(Settings.ACTION_SECURITY_SETTINGS)));
        results.addView(security);

        Button accessibility = button("ACCESSIBILITY SETTINGS");
        accessibility.setOnClickListener(v -> safeStart(new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)));
        results.addView(accessibility);

        Button admins = button("DEVICE ADMIN SETTINGS");
        admins.setOnClickListener(v -> safeStart(new Intent(Settings.ACTION_DEVICE_ADMIN_SETTINGS)));
        results.addView(admins);

        Button vpn = button("VPN SETTINGS");
        vpn.setOnClickListener(v -> safeStart(new Intent(Settings.ACTION_VPN_SETTINGS)));
        results.addView(vpn);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            Button dns = button("PRIVATE DNS SETTINGS");
            dns.setOnClickListener(v -> safeStart(new Intent(Settings.ACTION_PRIVATE_DNS_SETTINGS)));
            results.addView(dns);
        }
    }

    private void recordHistory(int score, String grade) {
        SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        String previous = prefs.getString(HISTORY, "");
        String line = System.currentTimeMillis() + "," + score + "," + grade;
        String combined = line + (TextUtils.isEmpty(previous) ? "" : "\n" + previous);
        String[] lines = combined.split("\n");
        StringBuilder trimmed = new StringBuilder();
        for (int i = 0; i < Math.min(10, lines.length); i++) {
            if (i > 0) trimmed.append('\n');
            trimmed.append(lines[i]);
        }
        prefs.edit().putString(HISTORY, trimmed.toString()).apply();
    }

    private void showHistory() {
        results.removeAllViews();
        addSection("LOCAL SCAN HISTORY", "Only score, grade, and timestamp are stored locally.");
        String raw = getSharedPreferences(PREFS, MODE_PRIVATE).getString(HISTORY, "");
        if (TextUtils.isEmpty(raw)) {
            addDetail("No scan history yet.");
            return;
        }
        for (String line : raw.split("\n")) {
            String[] parts = line.split(",");
            if (parts.length != 3) continue;
            try {
                java.text.DateFormat fmt = java.text.DateFormat.getDateTimeInstance();
                String date = fmt.format(new java.util.Date(Long.parseLong(parts[0])));
                addDetail("• " + date + " — " + parts[1] + "/100, Grade " + parts[2]);
            } catch (Exception ignored) { }
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

    private void addSection(String title, String detail) {
        TextView h = text(title, 20, true);
        h.setTextColor(Color.WHITE);
        h.setPadding(0, dp(14), 0, dp(4));
        results.addView(h);
        TextView d = text(detail, 13, false);
        d.setTextColor(Color.LTGRAY);
        results.addView(d);
    }

    private void addDetail(String s) {
        TextView v = text(s, 12, false);
        v.setTextColor(Color.LTGRAY);
        v.setPadding(dp(10), dp(5), 0, 0);
        results.addView(v);
    }

    private Button button(String label) {
        Button b = new Button(this);
        b.setText(label);
        return b;
    }

    private void safeStart(Intent intent) {
        try { startActivity(intent); }
        catch (Exception e) { startActivity(new Intent(Settings.ACTION_SETTINGS)); }
    }

    private String hex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) sb.append(String.format("%02X", b));
        return sb.toString();
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
