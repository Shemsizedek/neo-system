"""GEM-105: gate enabling review execution on independently durable, isolated storage.

Environment checks are informational only; no credentials returned or writes made.
A live approval endpoint is not mounted by this module.
"""
import os
def readiness(environ=None):
    env=os.environ if environ is None else environ
    checks={
      "isolated_database":env.get("GEM_APPROVAL_DB_ISOLATED")=="verified",
      "durable_database":env.get("GEM_APPROVAL_DB_PERSISTENCE")=="verified",
      "google_subject_binding":env.get("GEM_APPROVAL_GOOGLE_SESSION")=="verified",
      "atomic_consumption":env.get("GEM_APPROVAL_ATOMIC_CONSUME")=="verified",
      "csrf_and_origin":env.get("GEM_APPROVAL_CSRF_ORIGIN")=="verified",
      "audit_logging":env.get("GEM_APPROVAL_AUDIT")=="verified",
      "ci_passed":env.get("GEM_APPROVAL_CI")=="verified",
      "operator_review":env.get("GEM_APPROVAL_OPERATOR_REVIEW")=="verified",
    }
    return {"ready":all(checks.values()),"checks":checks,"github_write_enabled":False,
            "message":"Readiness assertions are not proof of deployment authorization."}
def require_execution_gate(environ=None):
    # Intentionally closed, even when a caller claims every check passed.
    raise PermissionError("GitHub draft PR execution requires deployed trusted authorization, not environment assertions")
