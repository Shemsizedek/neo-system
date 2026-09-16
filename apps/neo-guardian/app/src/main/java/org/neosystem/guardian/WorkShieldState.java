package org.neosystem.guardian;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;

public final class WorkShieldState {
    private WorkShieldState() {}

    public static final class Snapshot {
        public final String networkType;
        public final boolean vpnActive;
        public final String securityPatch;
        public final int installedPackageCount;
        public final int accessibilityServiceCount;
        public final String guardianVersion;

        public Snapshot(String networkType, boolean vpnActive, String securityPatch,
                        int installedPackageCount, int accessibilityServiceCount,
                        String guardianVersion) {
            this.networkType = networkType;
            this.vpnActive = vpnActive;
            this.securityPatch = securityPatch;
            this.installedPackageCount = installedPackageCount;
            this.accessibilityServiceCount = accessibilityServiceCount;
            this.guardianVersion = guardianVersion;
        }
    }

    public static final class Change {
        public final String id;
        public final GuardianSecurityModel.Severity severity;
        public final String evidence;

        Change(String id, GuardianSecurityModel.Severity severity, String evidence) {
            this.id = id;
            this.severity = severity;
            this.evidence = evidence;
        }
    }

    public static List<Change> compare(Snapshot before, Snapshot after) {
        if (before == null || after == null) return Collections.emptyList();
        List<Change> out = new ArrayList<>();
        if (!Objects.equals(before.networkType, after.networkType))
            out.add(new Change("network.changed", GuardianSecurityModel.Severity.MEDIUM, before.networkType + " → " + after.networkType));
        if (before.vpnActive && !after.vpnActive)
            out.add(new Change("vpn.disconnected", GuardianSecurityModel.Severity.HIGH, "VPN transport disappeared during Work Shield"));
        if (!Objects.equals(before.securityPatch, after.securityPatch))
            out.add(new Change("patch.changed", GuardianSecurityModel.Severity.MEDIUM, before.securityPatch + " → " + after.securityPatch));
        if (after.installedPackageCount > before.installedPackageCount)
            out.add(new Change("apps.installed", GuardianSecurityModel.Severity.MEDIUM, "Installed package count increased by " + (after.installedPackageCount - before.installedPackageCount)));
        if (after.accessibilityServiceCount > before.accessibilityServiceCount)
            out.add(new Change("accessibility.expanded", GuardianSecurityModel.Severity.HIGH, "Enabled accessibility service count increased"));
        if (!Objects.equals(before.guardianVersion, after.guardianVersion))
            out.add(new Change("guardian.version.changed", GuardianSecurityModel.Severity.LOW, before.guardianVersion + " → " + after.guardianVersion));
        return Collections.unmodifiableList(out);
    }
}
