"""NEO Kether Tamerean Delegation-of-Authority Kernel v1.3."""
from __future__ import annotations
from dataclasses import dataclass, asdict
from typing import Tuple, Dict, Any, Optional, Set
import hashlib, json

def canon(x:Any)->bytes:
    return json.dumps(x,sort_keys=True,separators=(",",":")).encode()

def H(x:bytes)->str:
    return hashlib.sha256(x).hexdigest()

class DelegationError(RuntimeError):
    pass

@dataclass(frozen=True)
class DelegableGrant:
    grant_id:str
    subject_id:str
    capability:str
    targets:Tuple[str,...]
    parameter_scope_hash:str
    not_before:int
    expires_at:int
    max_uses:int
    max_delegation_depth:int
    authority_level:int
    parent_grant_id:Optional[str]
    policy_hash:str

@dataclass(frozen=True)
class DelegationRecord:
    parent_grant_id:str
    child_grant_id:str
    delegated_by:str
    delegated_to:str
    depth:int
    record_hash:str

class DelegationOfAuthorityKernel:
    def __init__(self):
        self.grants:Dict[str,DelegableGrant]={}
        self.children:Dict[str,Set[str]]={}
        self.revoked:Set[str]=set()
        self.records:Dict[str,DelegationRecord]={}
        self._head=H(b"NEO-DELEGATION-GENESIS")

    @property
    def audit_root(self)->str:
        return self._head

    def register_root(self,g:DelegableGrant):
        if g.parent_grant_id is not None: raise DelegationError("ROOT_CANNOT_HAVE_PARENT")
        if g.grant_id in self.grants: raise DelegationError("DUPLICATE_GRANT")
        self._validate_basic(g)
        self.grants[g.grant_id]=g
        self.children[g.grant_id]=set()
        self._advance("ROOT",asdict(g))
        return g

    def delegate(self,parent_id:str,child:DelegableGrant,delegated_by:str)->DelegationRecord:
        if parent_id not in self.grants: raise DelegationError("UNKNOWN_PARENT")
        if parent_id in self.revoked: raise DelegationError("PARENT_REVOKED")
        if child.grant_id in self.grants: raise DelegationError("DUPLICATE_GRANT")
        if child.parent_grant_id != parent_id: raise DelegationError("PARENT_BINDING_MISMATCH")
        parent=self.grants[parent_id]
        self._validate_basic(child)
        depth=self.depth(parent_id)+1
        if depth > parent.max_delegation_depth: raise DelegationError("DELEGATION_DEPTH_EXCEEDED")
        if child.max_delegation_depth > max(0,parent.max_delegation_depth-1): raise DelegationError("CHILD_DELEGATION_DEPTH_ESCALATION")
        if child.subject_id == parent.subject_id: raise DelegationError("DELEGATION_REQUIRES_DISTINCT_CHILD_SUBJECT")
        if delegated_by != parent.subject_id: raise DelegationError("DELEGATOR_NOT_PARENT_SUBJECT")
        if child.capability != parent.capability: raise DelegationError("CAPABILITY_ESCALATION")
        if not set(child.targets).issubset(set(parent.targets)): raise DelegationError("TARGET_ESCALATION")
        if child.parameter_scope_hash != parent.parameter_scope_hash: raise DelegationError("PARAMETER_SCOPE_ESCALATION")
        if child.not_before < parent.not_before or child.expires_at > parent.expires_at: raise DelegationError("TIME_SCOPE_ESCALATION")
        if child.max_uses > parent.max_uses: raise DelegationError("USAGE_ESCALATION")
        if child.authority_level > parent.authority_level: raise DelegationError("AUTHORITY_LEVEL_ESCALATION")
        if child.policy_hash != parent.policy_hash: raise DelegationError("POLICY_LINEAGE_MISMATCH")
        self.grants[child.grant_id]=child
        self.children.setdefault(parent_id,set()).add(child.grant_id)
        self.children.setdefault(child.grant_id,set())
        body={"parent_grant_id":parent_id,"child_grant_id":child.grant_id,"delegated_by":delegated_by,"delegated_to":child.subject_id,"depth":depth}
        rec=DelegationRecord(record_hash=H(canon(body)),**body)
        self.records[child.grant_id]=rec
        self._advance("DELEGATE",body)
        return rec

    def revoke(self,grant_id:str,reason_hash:str)->Tuple[str,...]:
        if grant_id not in self.grants: raise DelegationError("UNKNOWN_GRANT")
        if not reason_hash: raise DelegationError("MISSING_REVOCATION_REASON")
        affected=[]
        stack=[grant_id]
        while stack:
            current=stack.pop()
            if current in self.revoked: continue
            self.revoked.add(current)
            affected.append(current)
            stack.extend(sorted(self.children.get(current,set()),reverse=True))
        self._advance("REVOKE_SUBTREE",{"grant_id":grant_id,"reason_hash":reason_hash,"affected":affected})
        return tuple(affected)

    def is_active(self,grant_id:str,at_time:int)->bool:
        if grant_id not in self.grants or grant_id in self.revoked: return False
        grant=self.grants[grant_id]
        current=grant.parent_grant_id
        while current is not None:
            if current in self.revoked: return False
            current=self.grants[current].parent_grant_id
        return grant.not_before <= at_time <= grant.expires_at

    def depth(self,grant_id:str)->int:
        if grant_id not in self.grants: raise DelegationError("UNKNOWN_GRANT")
        depth=0
        current=self.grants[grant_id].parent_grant_id
        seen=set()
        while current is not None:
            if current in seen: raise DelegationError("DELEGATION_CYCLE")
            seen.add(current)
            depth+=1
            current=self.grants[current].parent_grant_id
        return depth

    def _validate_basic(self,g:DelegableGrant):
        if not g.grant_id or not g.subject_id or not g.capability or not g.targets: raise DelegationError("INCOMPLETE_GRANT")
        if not g.parameter_scope_hash or not g.policy_hash: raise DelegationError("MISSING_SCOPE_BINDING")
        if g.expires_at <= g.not_before: raise DelegationError("INVALID_TIME_WINDOW")
        if g.max_uses < 1 or g.max_delegation_depth < 0: raise DelegationError("INVALID_LIMIT")
        if g.authority_level < 0: raise DelegationError("INVALID_AUTHORITY_LEVEL")

    def _advance(self,kind:str,payload:dict):
        self._head=H(bytes.fromhex(self._head)+canon({"kind":kind,"payload":payload}))
