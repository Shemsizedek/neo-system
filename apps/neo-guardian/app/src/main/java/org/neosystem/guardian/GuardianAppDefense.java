package org.neosystem.guardian;

import android.app.admin.DevicePolicyManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.os.Build;
import android.provider.Settings;
import android.text.TextUtils;

import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/** Evidence-first app/privilege inventory. Package metadata is evidence, never proof of surveillance. */
final class GuardianAppDefense {
    static final class AppSignal {
        final String packageName;
        final String installer;
        final boolean systemApp;
        final boolean accessibilityEnabled;
        final boolean deviceAdminActive;
        final List<String> dangerousGranted;

        AppSignal(String p, String i, boolean s, boolean a, boolean d, List<String> g) {
            packageName=p; installer=i; systemApp=s; accessibilityEnabled=a; deviceAdminActive=d;
            dangerousGranted=Collections.unmodifiableList(g);
        }

        String canonical() {
            return packageName+"|installer="+installer+"|system="+systemApp+"|accessibility="+accessibilityEnabled+
                    "|admin="+deviceAdminActive+"|dangerous="+TextUtils.join(",", dangerousGranted);
        }
    }

    static final class Inventory {
        final List<AppSignal> apps;
        final String digest;
        Inventory(List<AppSignal> a, String d) { apps=Collections.unmodifiableList(a); digest=d; }
        String canonical() {
            StringBuilder b=new StringBuilder();
            for (AppSignal s:apps) b.append(s.canonical()).append('\n');
            return b.toString();
        }
    }

    private GuardianAppDefense() {}

    static Inventory capture(Context context) {
        List<AppSignal> out=new ArrayList<>();
        try {
            PackageManager pm=context.getPackageManager();
            Set<String> accessibility=enabledAccessibilityPackages(context);
            Set<String> admins=activeAdminPackages(context);
            List<PackageInfo> packages;
            if (Build.VERSION.SDK_INT>=33) packages=pm.getInstalledPackages(PackageManager.PackageInfoFlags.of(PackageManager.GET_PERMISSIONS));
            else packages=pm.getInstalledPackages(PackageManager.GET_PERMISSIONS);
            for (PackageInfo pi:packages) {
                if (pi.packageName==null || pi.applicationInfo==null) continue;
                boolean system=(pi.applicationInfo.flags & ApplicationInfo.FLAG_SYSTEM)!=0;
                String installer="unknown";
                try {
                    if (Build.VERSION.SDK_INT>=30) {
                        String source=pm.getInstallSourceInfo(pi.packageName).getInstallingPackageName();
                        if (source!=null) installer=source;
                    } else {
                        String source=pm.getInstallerPackageName(pi.packageName);
                        if (source!=null) installer=source;
                    }
                } catch (Throwable ignored) {}
                List<String> granted=new ArrayList<>();
                if (pi.requestedPermissions!=null && pi.requestedPermissionsFlags!=null) {
                    for (int i=0;i<pi.requestedPermissions.length;i++) {
                        if ((pi.requestedPermissionsFlags[i] & PackageInfo.REQUESTED_PERMISSION_GRANTED)==0) continue;
                        try {
                            android.content.pm.PermissionInfo info=pm.getPermissionInfo(pi.requestedPermissions[i],0);
                            int protection=info.protectionLevel & android.content.pm.PermissionInfo.PROTECTION_MASK_BASE;
                            if (protection==android.content.pm.PermissionInfo.PROTECTION_DANGEROUS) granted.add(pi.requestedPermissions[i]);
                        } catch (Throwable ignored) {}
                    }
                }
                Collections.sort(granted);
                out.add(new AppSignal(pi.packageName,installer,system,accessibility.contains(pi.packageName),admins.contains(pi.packageName),granted));
            }
        } catch (Throwable ignored) {}
        Collections.sort(out,(a,b)->a.packageName.compareTo(b.packageName));
        StringBuilder canonical=new StringBuilder(); for(AppSignal s:out) canonical.append(s.canonical()).append('\n');
        return new Inventory(out,sha256(canonical.toString()));
    }

    static List<GuardianWorkShield.Finding> compare(Inventory before, Inventory now) {
        if (before==null || now==null) return Collections.emptyList();
        java.util.Map<String,AppSignal> oldMap=new java.util.HashMap<>(), newMap=new java.util.HashMap<>();
        for(AppSignal s:before.apps) oldMap.put(s.packageName,s); for(AppSignal s:now.apps) newMap.put(s.packageName,s);
        List<GuardianWorkShield.Finding> out=new ArrayList<>();
        for(AppSignal n:now.apps) {
            AppSignal o=oldMap.get(n.packageName);
            if(o==null) {
                boolean unknownInstaller="unknown".equals(n.installer) || n.installer.length()==0;
                out.add(GuardianWorkShield.externalFinding(unknownInstaller?GuardianWorkShield.Severity.HIGH:GuardianWorkShield.Severity.MEDIUM,
                        "New installed application observed", "package="+n.packageName+"; installer="+n.installer,
                        n.packageName, "medium", "Do not grant new privileges until the install source and purpose are verified.", false,
                        "Review the app, installer source, permissions, accessibility and device-admin status.",
                        "Confirm the package and installer against an authorized software inventory."));
            } else {
                if(!o.accessibilityEnabled && n.accessibilityEnabled) out.add(privilege(n,"Accessibility service became enabled"));
                if(!o.deviceAdminActive && n.deviceAdminActive) out.add(privilege(n,"Device-admin privilege became active"));
                Set<String> oldPerm=new HashSet<>(o.dangerousGranted);
                List<String> added=new ArrayList<>(); for(String p:n.dangerousGranted) if(!oldPerm.contains(p)) added.add(p);
                if(!added.isEmpty()) out.add(GuardianWorkShield.externalFinding(GuardianWorkShield.Severity.HIGH,
                        "Dangerous permission set increased", "package="+n.packageName+"; newlyGranted="+TextUtils.join(",",added),
                        n.packageName,"high","Pause sensitive work if this privilege change was unexpected.",false,
                        "Review and revoke permissions that were not explicitly authorized.","Re-capture inventory and confirm only approved grants remain."));
            }
        }
        return Collections.unmodifiableList(out);
    }

    private static GuardianWorkShield.Finding privilege(AppSignal n,String title) {
        return GuardianWorkShield.externalFinding(GuardianWorkShield.Severity.HIGH,title,
                "package="+n.packageName+"; accessibility="+n.accessibilityEnabled+"; admin="+n.deviceAdminActive,
                n.packageName,"high","Pause sensitive NEO administration if the privilege change was unexpected.",false,
                "Open Android security settings and disable unapproved elevated access.","Re-capture inventory and verify the elevated access is removed or documented." );
    }

    private static Set<String> enabledAccessibilityPackages(Context c) {
        Set<String> out=new HashSet<>();
        try {
            String raw=Settings.Secure.getString(c.getContentResolver(),Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES);
            if(raw!=null) for(String item:raw.split(":")) { ComponentName n=ComponentName.unflattenFromString(item); if(n!=null) out.add(n.getPackageName()); }
        } catch(Throwable ignored) {}
        return out;
    }
    private static Set<String> activeAdminPackages(Context c) {
        Set<String> out=new HashSet<>();
        try {
            DevicePolicyManager dpm=(DevicePolicyManager)c.getSystemService(Context.DEVICE_POLICY_SERVICE);
            List<ComponentName> admins=dpm==null?null:dpm.getActiveAdmins();
            if(admins!=null) for(ComponentName n:admins) out.add(n.getPackageName());
        } catch(Throwable ignored) {}
        return out;
    }
    private static String sha256(String s) {
        try { byte[] d=MessageDigest.getInstance("SHA-256").digest(s.getBytes(java.nio.charset.StandardCharsets.UTF_8)); StringBuilder b=new StringBuilder(); for(byte x:d)b.append(String.format("%02x",x)); return b.toString(); }
        catch(Throwable t){return "unavailable";}
    }
}
