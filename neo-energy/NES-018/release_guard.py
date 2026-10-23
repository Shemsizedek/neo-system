"""Fail-closed NEO Energy deployment gate. Evaluates evidence only; never deploys."""
REQUIRED={
 "identity": ("trusted_neopass_verification","server_side_site_grants","tenant_isolation_tests"),
 "data": ("db_migration_verified","backup_restore_tested","audit_log_enabled"),
 "security": ("tls_verified","rate_limits_enabled","privacy_review"),
 "simulation": ("simulator_ci_green","gateway_ci_green")
}
PHYSICAL=("utility_permission","engineer_of_record_approval","site_commissioning_signed",
          "protection_tests_signed","operator_authorization")

def readiness(evidence, *, request_field_control=False):
    if not isinstance(evidence,dict): raise ValueError("evidence must be a mapping")
    missing={domain:[key for key in keys if evidence.get(key) is not True]
             for domain,keys in REQUIRED.items()}
    missing={k:v for k,v in missing.items() if v}
    if request_field_control:
        missing["physical_control"]=[k for k in PHYSICAL if evidence.get(k) is not True]
        if not missing["physical_control"]: del missing["physical_control"]
    return {"ready":not bool(missing),"missing":missing,
            "mode":"FIELD_CONTROL_REVIEW" if request_field_control else "CUSTOMER_PREVIEW_REVIEW",
            "deployment_executed":False,
            "field_control_enabled":False,
            "billing_enabled":False}
