package org.neosystem.guardian;

import android.app.KeyguardManager;
import android.content.Context;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.os.Build;
import android.provider.Settings;
import android.text.TextUtils;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Local-first, permission-respecting posture evaluator for NEO Guardian Work Shield.
 * This class intentionally uses only signals available to an ordinary Android app.
 * It does not bypass the sandbox, read user content, or perform remediation.
 */
public final class GuardianWorkShield {
    public enum Severity { INFO, LOW, MEDIUM, HIGH, CRITICAL }
    public enum State { OBSERVATION, SUSPICION, CONFIRMED_SECURITY_EVENT }

    public static final class Finding {
        public final Severity severity;
        public final State state;
        public final String title;
        public final String evidence;
        public final String affected;
        public final String confidence;
        public final String containment;
        public final boolean rotateCredentials;
        public final String remediation;
        public final String verification;

        Finding(Severity severity, State state, String title, String evidence, String affected,
                String confidence, String containment, boolean rotateCredentials,
                String remediation, String verification) {
            this.severity = severity;
            this.state = state;
            this.title = title;
            this.evidence = evidence;
            this.affected = affected;
            this.confidence = confidence;
            this.containment = containment;
            this.rotateCredentials = rotateCredentials;
            this.remediation = remediation;
            this.verification = verification;
        }
    }

    public static final class Snapshot {
        public final String securityPatch;
        public final boolean secureLock;
        public final boolean adbEnabled;
        public final boolean developerMode;
        public final boolean vpnActive;
        public final String networkType;
        public final String privateDnsMode;

        Snapshot(String securityPatch, boolean secureLock, boolean adbEnabled,
                 boolean developerMode, boolean vpnActive, String networkType,
                 String privateDnsMode) {
            this.securityPatch = securityPatch;
            this.secureLock = secureLock;
            this.adbEnabled = adbEnabled;
            this.developerMode = developerMode;
            this.vpnActive = vpnActive;
            this.networkType = networkType;
            this.privateDnsMode = privateDnsMode;
        }
    }

    private GuardianWorkShield() {}

    public static Snapshot capture(Context context) {
        String patch = Build.VERSION.SECURITY_PATCH;
        boolean lock = false;
        boolean adb = false;
        boolean dev = false;
        boolean vpn = false;
        String networkType = "none";
        String dns = "unknown";

        try {
            KeyguardManager km = (KeyguardManager) context.getSystemService(Context.KEYGUARD_SERVICE);
            lock = km != null && km.isDeviceSecure();
        } catch (Throwable ignored) {}
        try { adb = Settings.Global.getInt(context.getContentResolver(), Settings.Global.ADB_ENABLED, 0) == 1; }
        catch (Throwable ignored) {}
        try { dev = Settings.Global.getInt(context.getContentResolver(), Settings.Global.DEVELOPMENT_SETTINGS_ENABLED, 0) == 1; }
        catch (Throwable ignored) {}
        try {
            ConnectivityManager cm = (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);
            Network n = cm == null ? null : cm.getActiveNetwork();
            NetworkCapabilities caps = n == null || cm == null ? null : cm.getNetworkCapabilities(n);
            if (caps != null) {
                vpn = caps.hasTransport(NetworkCapabilities.TRANSPORT_VPN);
                if (caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)) networkType = "wifi";
                else if (caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)) networkType = "cellular";
                else if (caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)) networkType = "ethernet";
                else networkType = "other";
            }
        } catch (Throwable ignored) {}
        try {
            String value = Settings.Global.getString(context.getContentResolver(), "private_dns_mode");
            if (!TextUtils.isEmpty(value)) dns = value;
        } catch (Throwable ignored) {}
        return new Snapshot(patch, lock, adb, dev, vpn, networkType, dns);
    }

    /** Evaluate current posture without claiming that an anomaly proves compromise. */
    public static List<Finding> evaluate(Snapshot s, boolean requireVpnDuringWork) {
        if (s == null) return Collections.emptyList();
        List<Finding> out = new ArrayList<>();
        if (!s.secureLock) out.add(finding(Severity.HIGH, "Secure device lock is not enabled",
                "Android Keyguard reports no secure device credential", "device", "high",
                "Stop privileged NEO administration until a secure lock is configured.", false,
                "Configure a strong device credential in Android security settings.",
                "Re-run Work Shield and confirm secureLock=true."));
        if (s.adbEnabled) out.add(finding(Severity.MEDIUM, "USB debugging is enabled",
                "ADB_ENABLED=1", "device", "high",
                "Disconnect untrusted USB hosts; do not approve unknown debugging keys.", false,
                "Disable USB debugging when active development does not require it.",
                "Re-run Work Shield and confirm ADB is disabled."));
        if (s.developerMode) out.add(finding(Severity.LOW, "Developer options are enabled",
                "DEVELOPMENT_SETTINGS_ENABLED=1", "device", "high",
                "Review developer settings before sensitive administration.", false,
                "Disable developer options outside authorized development windows when practical.",
                "Re-run Work Shield after the setting is changed."));
        if (requireVpnDuringWork && !s.vpnActive) out.add(finding(Severity.HIGH, "Required VPN is not active",
                "No VPN transport detected on the active Android network", "active network", "medium",
                "Pause sensitive administration or reconnect the approved VPN.", false,
                "Restore the approved VPN and verify the active network before continuing.",
                "Re-run Work Shield and confirm VPN transport is active."));
        if ("wifi".equals(s.networkType) && !s.vpnActive) out.add(finding(Severity.MEDIUM, "Wi-Fi is active without a detected VPN",
                "Active transport=wifi; vpn=false", "active network", "medium",
                "Avoid sensitive NEO administration until the network is trusted or protected.", false,
                "Verify the Wi-Fi network and use the approved VPN when required by policy.",
                "Re-run Work Shield after network/VPN verification."));
        if ("off".equals(s.privateDnsMode)) out.add(finding(Severity.LOW, "Private DNS is disabled",
                "private_dns_mode=off", "DNS configuration", "high",
                "Treat DNS results as less protected on untrusted networks.", false,
                "Enable an approved Private DNS mode if compatible with the current network.",
                "Re-run Work Shield and confirm the expected DNS mode."));
        if (TextUtils.isEmpty(s.securityPatch)) out.add(finding(Severity.MEDIUM, "Android security patch level is unavailable",
                "Build.VERSION.SECURITY_PATCH is empty", "device", "high",
                "Avoid assuming the device is current.", false,
                "Check Android system update status and vendor security support.",
                "Confirm a patch level is reported after updating."));
        if (out.isEmpty()) out.add(finding(Severity.INFO, "No Work Shield posture warning detected",
                "Current locally observable signals meet this baseline", "device", "medium",
                "No containment action is indicated by these signals.", false,
                "Continue normal patching and explicit security review.",
                "Re-run after network, app, or security-configuration changes."));
        return Collections.unmodifiableList(out);
    }

    private static Finding finding(Severity severity, String title, String evidence, String affected,
                                   String confidence, String containment, boolean rotate,
                                   String remediation, String verification) {
        // These baseline checks are observations/suspicions only. CONFIRMED_SECURITY_EVENT is reserved
        // for separately verified evidence and must never be inferred from a single anomaly.
        State state = severity == Severity.INFO ? State.OBSERVATION : State.SUSPICION;
        return new Finding(severity, state, title, evidence, affected, confidence, containment,
                rotate, remediation, verification);
    }
}
