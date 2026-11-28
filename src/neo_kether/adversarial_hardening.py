from dataclasses import dataclass
from typing import Tuple,Any,Optional
import hashlib,json
C=lambda x:json.dumps(x,sort_keys=True,separators=(',',':')).encode()
H=lambda x:hashlib.sha256(x).hexdigest()
class HardeningError(RuntimeError):pass
@dataclass(frozen=True)
class HardenedGrant:
 grant_id:str;subject_id:str;capability:str;targets:Tuple[str,...];parameter_hash:str;max_uses:int;remaining_depth:int;revocation_root:str;parent_id:Optional[str]=None
class AdversarialHardeningKernel:
 def __init__(self): self.g={};self.allocated={};self.revoked=set();self.head=H(b'NEO-HARDENING-v2.4')
 @staticmethod
 def parameter_hash(payload:Any):return H(C(payload))
 def register(self,g):
  if g.grant_id in self.g:raise HardeningError('REPLAY')
  g=HardenedGrant(g.grant_id,g.subject_id,g.capability,tuple(g.targets),g.parameter_hash,g.max_uses,g.remaining_depth,g.revocation_root,g.parent_id)
  self.g[g.grant_id]=g;self.allocated[g.grant_id]=0;return g
 def delegate(self,parent_id,child):
  p=self.g[parent_id]
  if p.remaining_depth<=0 or child.remaining_depth>p.remaining_depth-1:raise HardeningError('DEPTH_ESCALATION')
  if child.capability!=p.capability or not set(child.targets).issubset(p.targets) or child.parameter_hash!=p.parameter_hash:raise HardeningError('SCOPE_ESCALATION')
  if self.allocated[parent_id]+child.max_uses>p.max_uses:raise HardeningError('USAGE_BUDGET_EXCEEDED')
  if child.parent_id!=parent_id:raise HardeningError('PARENT_BINDING')
  self.allocated[parent_id]+=child.max_uses;return self.register(child)
 def authorize(self,gid,payload,target):
  g=self.g[gid]
  if gid in self.revoked:raise HardeningError('INACTIVE')
  if target not in g.targets or self.parameter_hash(payload)!=g.parameter_hash:raise HardeningError('SCOPE')
  return True
 def revocation_proof(self,gid,reason):
  g=self.g[gid];return H(C({'grant_id':gid,'reason':reason,'revocation_root':g.revocation_root}))
 def revoke(self,gid,reason,proof):
  if proof!=self.revocation_proof(gid,reason):raise HardeningError('INVALID_REVOCATION_PROOF')
  self.revoked.add(gid);return True
