package org.neosystem.guardian;

import org.json.JSONObject;

/** Sanitized Guardian -> NEO Hacker/NOUS envelope. Evidence text is inert data, never executable instruction. */
final class GuardianNousEnvelope {
    private GuardianNousEnvelope() {}
    static String from(GuardianWorkShield.Finding f,String sourceId,String previousHash) {
        try {
            JSONObject o=new JSONObject();
            o.put("schema","neo.guardian.hacker.event.v1");
            o.put("source",sourceId);
            o.put("source_trust","UNTRUSTED_OBSERVATION");
            o.put("instruction_policy","DATA_ONLY_NO_EXECUTION");
            o.put("sink_policy","ANALYSIS_ONLY_NO_TOOL_AUTHORITY");
            o.put("plan_drift","DENY");
            o.put("nous_meta_state","N0");
            o.put("classification",f.state.name());
            o.put("severity",f.severity.name());
            o.put("title",sanitize(f.title));
            o.put("evidence",sanitize(f.evidence));
            o.put("affected",sanitize(f.affected));
            o.put("confidence",sanitize(f.confidence));
            o.put("containment",sanitize(f.containment));
            o.put("remediation",sanitize(f.remediation));
            o.put("verification",sanitize(f.verification));
            o.put("corroboration_required",true);
            o.put("corroborated_attack_rule","at_least_2_independent_channels_and_2_sources");
            o.put("previous_event_hash",previousHash==null?"GENESIS":previousHash);
            o.put("human_999_required_for_consequential_action",true);
            return o.toString();
        } catch(Throwable t){return "{\"schema\":\"neo.guardian.hacker.event.v1\",\"error\":\"serialization_failed\"}";}
    }
    private static String sanitize(String s){if(s==null)return "";return s.replace('\u0000',' ').replace('\r',' ').trim();}
}
