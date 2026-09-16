package org.neosystem.guardian;

import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.content.pm.InstallSourceInfo;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.os.Build;
import android.provider.Settings;
import android.text.TextUtils;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Explicit, local-only Work Shield session. No background service is started here.
 * The caller must opt in by calling start(). State is metadata-only and stored locally.
 */
final class GuardianWorkShieldSession {
    private static final String PREFS = "neo_guardian_work_shield";
    private static final String K_ACTIVE = "active";
    private static final String K_STARTED = "started";
    private static final String K_PATCH = "patch";
    private static final String K_NETWORK = "network";
    private static final String K_VPN = "vpn";
    private static final String K_ACCESSIBILITY = "accessibility";
    private static final String K_PACKAGES = "packages";
    private static final String K_SIDELOAD = "sideload";
    private static final String K_VERSION = "guardianVersion";

    static final class Delta {
        final GuardianSecurityModel.Severity severity;
        final String title;
        final String evidence;
        final String recommendation;

        Delta(GuardianSecurityModel.Severity severity, String title, String evidence, String recommendation) {
            this.severity = severity;
            this.title = title;
            this.evidence = evidence;
            this.recommendation = recommendation;
        }
    }

    static final class State {
        final boolean active;
        final long startedAt;
        final GuardianWorkShield.Snapshot posture;
        final int visiblePackages;
        final int sideloadedPackages;
        final int accessibilityServices;
        final String guardianVersion;

        State(boolean active, long startedAt, GuardianWorkShield.Snapshot posture, int visiblePackages,
              int sideloadedPackages, int accessibilityServices, String guardianVersion) {
            this.active = active;
            this.startedAt = startedAt;
            this.posture = posture;
            this.visiblePackages = visiblePackages;
            this.sideloadedPackages = sideloadedPackages;
            this.accessibilityServices = accessibilityServices;
            this.guardianVersion = guardianVersion;
        }
    }

    private GuardianWorkShieldSession() {}

    static State start(Context context) {
        State current = capture(context);
        SharedPreferences p = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        p.edit()
                .putBoolean(K_ACTIVE, true)
                .putLong(K_STARTED, System.currentTimeMillis())
                .putString(K_PATCH, safe(current.posture.securityPatch))
                .putString(K_NETWORK, safe(current.posture.networkType))
                .putBoolean(K_VPN, current.posture.vpnActive)
                .putInt(K_ACCESSIBILITY, current.accessibilityServices)
                .putInt(K_PACKAGES, current.visiblePackages)
                .putInt(K_SIDELOAD, current.sideloadedPackages)
                .putString(K_VERSION, safe(current.guardianVersion))
                .apply();
        return capture(context);
    }

    static void stop(Context context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putBoolean(K_ACTIVE, false).apply();
    }

    static boolean isActive(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(K_ACTIVE, false);
    }

    static State capture(Context context) {
        SharedPreferences p = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        GuardianWorkShield.Snapshot posture = GuardianWorkShield.capture(context);
        return new State(
                p.getBoolean(K_ACTIVE, false),
                p.getLong(K_STARTED, 0L),
                posture,
                visiblePackageCount(context),
                sideloadedPackageCount(context),
                accessibilityCount(context),
                guardianVersion(context)
        );
    }

    static List<Delta> evaluateChanges(Context context) {
        SharedPreferences p = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        if (!p.getBoolean(K_ACTIVE, false)) return Collections.emptyList();
        State now = capture(context);
        List<Delta> out = new ArrayList<>();

        String oldNetwork = p.getString(K_NETWORK, "unknown");
        if (!safe(now.posture.networkType).equals(oldNetwork)) {
            out.add(new Delta(GuardianSecurityModel.Severity.MEDIUM,
                    "Active network changed during Work Shield",
                    "network: " + oldNetwork + " -> " + safe(now.posture.networkType),
                    "Pause sensitive administration until the new network is verified."));
        }

        boolean oldVpn = p.getBoolean(K_VPN, false);
        if (oldVpn && !now.posture.vpnActive) {
            out.add(new Delta(GuardianSecurityModel.Severity.HIGH,
                    "VPN disconnected during Work Shield",
                    "vpn: true -> false",
                    "Pause privileged NEO administration and restore the approved VPN before continuing."));
        }

        int oldPackages = p.getInt(K_PACKAGES, now.visiblePackages);
        if (now.visiblePackages > oldPackages) {
            out.add(new Delta(GuardianSecurityModel.Severity.MEDIUM,
                    "New application installation observed",
                    "visiblePackages: " + oldPackages + " -> " + now.visiblePackages,
                    "Review recent installs and their permissions before continuing sensitive work."));
        }

        int oldSideload = p.getInt(K_SIDELOAD, now.sideloadedPackages);
        if (now.sideloadedPackages > oldSideload) {
            out.add(new Delta(GuardianSecurityModel.Severity.HIGH,
                    "New sideloaded application observed",
                    "sideloadedPackages: " + oldSideload + " -> " + now.sideloadedPackages,
                    "Verify the installer and signing source; remove the app if it is not explicitly authorized."));
        }

        int oldAccessibility = p.getInt(K_ACCESSIBILITY, now.accessibilityServices);
        if (now.accessibilityServices > oldAccessibility) {
            out.add(new Delta(GuardianSecurityModel.Severity.HIGH,
                    "Accessibility privilege expansion observed",
                    "enabledAccessibilityServices: " + oldAccessibility + " -> " + now.accessibilityServices,
                    "Review newly enabled accessibility services immediately."));
        }

        String oldPatch = p.getString(K_PATCH, "");
        String patch = safe(now.posture.securityPatch);
        if (!oldPatch.isEmpty() && !patch.isEmpty() && patch.compareTo(oldPatch) < 0) {
            out.add(new Delta(GuardianSecurityModel.Severity.HIGH,
                    "Security patch regression observed",
                    "patch: " + oldPatch + " -> " + patch,
                    "Do not perform privileged administration until the device build and update state are verified."));
        }

        String oldVersion = p.getString(K_VERSION, "");
        if (!oldVersion.isEmpty() && !oldVersion.equals(now.guardianVersion)) {
            out.add(new Delta(GuardianSecurityModel.Severity.LOW,
                    "Guardian version changed during Work Shield",
                    "guardianVersion: " + oldVersion + " -> " + now.guardianVersion,
                    "Verify the installed build came from the canonical Guardian release path."));
        }

        return Collections.unmodifiableList(out);
    }

    private static int visiblePackageCount(Context context) {
        try {
            return context.getPackageManager().getInstalledPackages(0).size();
        } catch (Throwable ignored) { return 0; }
    }

    private static int sideloadedPackageCount(Context context) {
        try {
            PackageManager pm = context.getPackageManager();
            List<PackageInfo> packages = pm.getInstalledPackages(0);
            int count = 0;
            for (PackageInfo info : packages) {
                ApplicationInfo ai = info.applicationInfo;
                if (ai != null && (ai.flags & ApplicationInfo.FLAG_SYSTEM) != 0) continue;
                String installer = null;
                try {
                    if (Build.VERSION.SDK_INT >= 30) {
                        InstallSourceInfo source = pm.getInstallSourceInfo(info.packageName);
                        installer = source.getInstallingPackageName();
                    } else {
                        installer = pm.getInstallerPackageName(info.packageName);
                    }
                } catch (Throwable ignored) {}
                if (TextUtils.isEmpty(installer)) count++;
            }
            return count;
        } catch (Throwable ignored) { return 0; }
    }

    private static int accessibilityCount(Context context) {
        try {
            boolean enabled = Settings.Secure.getInt(context.getContentResolver(), Settings.Secure.ACCESSIBILITY_ENABLED, 0) == 1;
            String services = Settings.Secure.getString(context.getContentResolver(), Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES);
            if (!enabled || TextUtils.isEmpty(services)) return 0;
            Set<String> unique = new HashSet<>();
            Collections.addAll(unique, services.split(":"));
            unique.remove("");
            return unique.size();
        } catch (Throwable ignored) { return 0; }
    }

    private static String guardianVersion(Context context) {
        try { return context.getPackageManager().getPackageInfo(context.getPackageName(), 0).versionName; }
        catch (Throwable ignored) { return "unknown"; }
    }

    private static String safe(String value) { return value == null ? "" : value; }
}
