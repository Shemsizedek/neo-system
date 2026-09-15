package org.neosystem.guardian;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public final class GuardianSecurityModel {
    private GuardianSecurityModel() {}

    public enum Severity { INFO, LOW, MEDIUM, HIGH, CRITICAL }
    public enum EvidenceState { OBSERVATION, SUSPICION, CONFIRMED_SECURITY_EVENT }

    public static final class Finding {
        public final String id;
        public final String title;
        public final Severity severity;
        public final EvidenceState state;
        public final String evidence;
        public final String affected;
        public final double confidence;
        public final List<String> containment;
        public final boolean rotateCredentials;
        public final String remediation;
        public final String verification;

        public Finding(String id, String title, Severity severity, EvidenceState state,
                       String evidence, String affected, double confidence,
                       List<String> containment, boolean rotateCredentials,
                       String remediation, String verification) {
            this.id = id;
            this.title = title;
            this.severity = severity;
            this.state = state;
            this.evidence = evidence;
            this.affected = affected;
            this.confidence = Math.max(0.0d, Math.min(1.0d, confidence));
            this.containment = Collections.unmodifiableList(new ArrayList<>(containment == null ? Collections.emptyList() : containment));
            this.rotateCredentials = rotateCredentials;
            this.remediation = remediation;
            this.verification = verification;
        }
    }

    public static Finding observation(String id, String title, Severity severity, String evidence,
                                      String affected, double confidence, String remediation, String verification) {
        return new Finding(id, title, severity, EvidenceState.OBSERVATION, evidence, affected,
                confidence, Collections.emptyList(), false, remediation, verification);
    }

    public static Finding suspicion(String id, String title, Severity severity, String evidence,
                                    String affected, double confidence, List<String> containment,
                                    boolean rotateCredentials, String remediation, String verification) {
        return new Finding(id, title, severity, EvidenceState.SUSPICION, evidence, affected,
                confidence, containment, rotateCredentials, remediation, verification);
    }

    public static String criticalSummary(Finding finding) {
        if (finding == null) return "No finding";
        return "Detected: " + finding.title + "\n" +
                "Evidence: " + finding.evidence + "\n" +
                "Affected: " + finding.affected + "\n" +
                "Confidence: " + Math.round(finding.confidence * 100.0d) + "%\n" +
                "Containment: " + (finding.containment.isEmpty() ? "None automatically selected" : finding.containment) + "\n" +
                "Rotate credentials: " + (finding.rotateCredentials ? "Recommended" : "Not automatically recommended") + "\n" +
                "Remediation: " + finding.remediation + "\n" +
                "Verify: " + finding.verification;
    }
}
