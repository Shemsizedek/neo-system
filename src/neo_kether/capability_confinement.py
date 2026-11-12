"""NEO Kether Tamerean Capability-Confinement Kernel v1.2."""
from __future__ import annotations
from dataclasses import dataclass, asdict
from typing import Tuple, Dict, Any
import hashlib, json

def _canon(x: Any) -> bytes:
    return json.dumps(x, sort_keys=True, separators=(",", ":")).encode()

def _hash(x: bytes) -> str:
    return hashlib.sha256(x).hexdigest()

class CapabilityError(RuntimeError):
    pass

@dataclass(frozen=True)
class CapabilityGrant:
    grant_id: str
    subject_id: str
    capability: str
    target_scope: Tuple[str, ...]
    parameter_scope_hash: str
    not_before: int
    expires_at: int
    max_uses: int
    policy_hash: str
    revocation_root: str

@dataclass(frozen=True)
class CapabilityUse:
    grant_id: str
    action_id: str
    subject_id: str
    capability: str
    target: str
    parameter_scope_hash: str
    used_at: int
    use_index: int
    receipt_hash: str

class CapabilityConfinementKernel:
    def __init__(self):
        self.grants: Dict[str, CapabilityGrant] = {}
        self.uses: Dict[str, int] = {}
        self.revoked = set()
        self.action_ids = set()
        self._head = _hash(b"NEO-CAPABILITY-GENESIS")

    @property
    def audit_root(self) -> str:
        return self._head

    def register_grant(self, grant: CapabilityGrant):
        if grant.grant_id in self.grants:
            raise CapabilityError("DUPLICATE_GRANT")
        if not grant.subject_id or not grant.capability or not grant.target_scope:
            raise CapabilityError("INCOMPLETE_GRANT")
        if not grant.parameter_scope_hash or not grant.policy_hash or not grant.revocation_root:
            raise CapabilityError("MISSING_SCOPE_BINDING")
        if grant.expires_at <= grant.not_before:
            raise CapabilityError("INVALID_TIME_WINDOW")
        if grant.max_uses < 1:
            raise CapabilityError("INVALID_MAX_USES")
        self.grants[grant.grant_id] = grant
        self.uses[grant.grant_id] = 0
        self._advance("GRANT", asdict(grant))
        return grant

    def revoke(self, grant_id: str, reason_hash: str):
        if grant_id not in self.grants:
            raise CapabilityError("UNKNOWN_GRANT")
        if not reason_hash:
            raise CapabilityError("MISSING_REVOCATION_REASON")
        self.revoked.add(grant_id)
        self._advance("REVOKE", {"grant_id": grant_id, "reason_hash": reason_hash})
        return True

    def authorize_use(self, grant_id: str, action_id: str, subject_id: str,
                      capability: str, target: str, parameter_scope_hash: str,
                      used_at: int) -> CapabilityUse:
        if grant_id not in self.grants:
            raise CapabilityError("UNKNOWN_GRANT")
        if action_id in self.action_ids:
            raise CapabilityError("ACTION_REPLAY")
        grant = self.grants[grant_id]
        if grant_id in self.revoked:
            raise CapabilityError("GRANT_REVOKED")
        if subject_id != grant.subject_id:
            raise CapabilityError("SUBJECT_SCOPE_VIOLATION")
        if capability != grant.capability:
            raise CapabilityError("CAPABILITY_SCOPE_VIOLATION")
        if target not in grant.target_scope:
            raise CapabilityError("TARGET_SCOPE_VIOLATION")
        if parameter_scope_hash != grant.parameter_scope_hash:
            raise CapabilityError("PARAMETER_SCOPE_VIOLATION")
        if used_at < grant.not_before:
            raise CapabilityError("GRANT_NOT_YET_VALID")
        if used_at > grant.expires_at:
            raise CapabilityError("GRANT_EXPIRED")
        if self.uses[grant_id] >= grant.max_uses:
            raise CapabilityError("RATE_LIMIT_EXCEEDED")

        self.uses[grant_id] += 1
        self.action_ids.add(action_id)
        body = {
            "grant_id": grant_id, "action_id": action_id, "subject_id": subject_id,
            "capability": capability, "target": target,
            "parameter_scope_hash": parameter_scope_hash, "used_at": used_at,
            "use_index": self.uses[grant_id],
        }
        receipt_hash = _hash(_canon(body))
        use = CapabilityUse(receipt_hash=receipt_hash, **body)
        self._advance("USE", body)
        return use

    def _advance(self, kind: str, payload: dict):
        self._head = _hash(bytes.fromhex(self._head) + _canon({"kind": kind, "payload": payload}))
