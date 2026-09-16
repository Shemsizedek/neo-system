package org.neosystem.guardian;

import java.util.Collections;

/**
 * Converts local Work Shield findings into the canonical Guardian security model before
 * they are serialized or forwarded to NEO Hacker / NEOsync. External content remains data,
 * never authority, and this bridge does not authorize remediation.
 */
final class GuardianEventBridge {
    private GuardianEventBridge() {}

    static GuardianSecurityModel.Finding normalize(GuardianWorkShield.Finding finding, String id) {
        if (finding == null) throw new IllegalArgumentException("finding required");
        GuardianSecurityModel.Severity severity = GuardianSecurityModel.Severity.valueOf(finding.severity.name());
        GuardianSecurityModel.EvidenceState state;
        switch (finding.state) {
            case OBSERVATION:
                state = GuardianSecurityModel.EvidenceState.OBSERVATION;
                break;
            case SUSPICION:
                state = GuardianSecurityModel.EvidenceState.SUSPICION;
                break;
            case CORROBORATED_ATTACK:
            default:
                state = GuardianSecurityModel.EvidenceState.CONFIRMED_SECURITY_EVENT;
                break;
        }

        double confidence = parseConfidence(finding.confidence);
        return new GuardianSecurityModel.Finding(
                id == null ? "guardian-work-shield" : id,
                finding.title,
                severity,
                state,
                finding.evidence,
                finding.affected,
                confidence,
                finding.containment == null || finding.containment.isEmpty()
                        ? Collections.emptyList()
                        : Collections.singletonList(finding.containment),
                finding.rotateCredentials,
                finding.remediation,
                finding.verification
        );
    }

    static boolean consequentialActionAllowed(GuardianSecurityModel.Finding finding, boolean humanApproved) {
        if (finding == null) return false;
        if (finding.severity == GuardianSecurityModel.Severity.INFO ||
                finding.severity == GuardianSecurityModel.Severity.LOW) return true;
        return humanApproved;
    }

    private static double parseConfidence(String value) {
        if (value == null) return 0.5d;
        String v = value.trim().toLowerCase();
        if ("high".equals(v)) return 0.9d;
        if ("medium".equals(v)) return 0.6d;
        if ("low".equals(v)) return 0.3d;
        try {
            double n = Double.parseDouble(v);
            return Math.max(0d, Math.min(1d, n));
        } catch (Throwable ignored) {
            return 0.5d;
        }
    }
}
