from dataclasses import dataclass
from enum import Enum
from typing import Dict,Tuple
import hashlib,json
C=lambda x:json.dumps(x,sort_keys=True,separators=(",",":")).encode()
H=lambda b:hashlib.sha256(b).hexdigest()
class DistributedTxError(RuntimeError):pass
class GlobalState(str,Enum):
 PREPARING="PREPARING";PREPARED="PREPARED";COMMITTED="COMMITTED";ABORTED="ABORTED";IN_DOUBT="IN_DOUBT"
@dataclass(frozen=True)
class Participant:
 participant_id:str;transaction_hash:str;capability_hash:str
@dataclass(frozen=True)
class PrepareCertificate:
 transaction_id:str;participant_id:str;coordinator_epoch:int;prepared:bool;certificate_hash:str
@dataclass(frozen=True)
class Decision:
 transaction_id:str;coordinator_epoch:int;decision:str;prepare_root:str;decision_hash:str
class DistributedTransactionKernel:
 def __init__(self):
  self.transactions={};self.states={};self.prepares={};self.decisions={};self.observed={};self.epochs={}
  self._audit=H(b"NEO-DISTRIBUTED-TX-v2.3")
 @property
 def audit_root(self):return self._audit
 def begin(self,txid,participants:Tuple[Participant,...],epoch:int):
  if txid in self.transactions:raise DistributedTxError("TX_REPLAY")
  if epoch<0 or len(participants)<2:raise DistributedTxError("INVALID_TRANSACTION")
  ids=[p.participant_id for p in participants]
  if len(ids)!=len(set(ids)):raise DistributedTxError("DUPLICATE_PARTICIPANT")
  if any(p.transaction_hash!=txid for p in participants):raise DistributedTxError("TRANSACTION_IDENTITY_MISMATCH")
  self.transactions[txid]=participants;self.states[txid]=GlobalState.PREPARING;self.prepares[txid]={};self.observed[txid]={};self.epochs[txid]=epoch
  self._adv("BEGIN",{"tx":txid,"participants":ids,"epoch":epoch})
 def prepare(self,txid,pid,epoch,prepared,proof_hash):
  self._check(txid,epoch)
  if self.states[txid]!=GlobalState.PREPARING:raise DistributedTxError("NOT_PREPARING")
  if pid in self.prepares[txid]:raise DistributedTxError("PREPARE_REPLAY")
  if pid not in [p.participant_id for p in self.transactions[txid]]:raise DistributedTxError("UNKNOWN_PARTICIPANT")
  if not proof_hash:raise DistributedTxError("MISSING_PREPARE_PROOF")
  b={"transaction_id":txid,"participant_id":pid,"coordinator_epoch":epoch,"prepared":bool(prepared),"proof_hash":proof_hash}
  cert=PrepareCertificate(txid,pid,epoch,bool(prepared),H(C(b)));self.prepares[txid][pid]=cert;self._adv("PREPARE",b)
  if not prepared:self.states[txid]=GlobalState.ABORTED
  elif len(self.prepares[txid])==len(self.transactions[txid]):self.states[txid]=GlobalState.PREPARED
  return cert
 def decide(self,txid,epoch,decision):
  self._check(txid,epoch)
  if txid in self.decisions:raise DistributedTxError("DECISION_REPLAY")
  if decision not in ("COMMIT","ABORT"):raise DistributedTxError("INVALID_DECISION")
  ps=self.prepares[txid]
  if decision=="COMMIT":
   if self.states[txid]!=GlobalState.PREPARED or not all(x.prepared for x in ps.values()):raise DistributedTxError("GLOBAL_PREPARE_INCOMPLETE")
  root=H(C(sorted((k,v.certificate_hash) for k,v in ps.items())))
  b={"transaction_id":txid,"coordinator_epoch":epoch,"decision":decision,"prepare_root":root}
  d=Decision(txid,epoch,decision,root,H(C(b)));self.decisions[txid]=d
  self.states[txid]=GlobalState.COMMITTED if decision=="COMMIT" else GlobalState.ABORTED
  self._adv("DECISION",b);return d
 def observe(self,txid,pid,decision_hash):
  if txid not in self.decisions:raise DistributedTxError("NO_GLOBAL_DECISION")
  if pid not in [p.participant_id for p in self.transactions[txid]]:raise DistributedTxError("UNKNOWN_PARTICIPANT")
  if pid in self.observed[txid]:raise DistributedTxError("OBSERVATION_REPLAY")
  if decision_hash!=self.decisions[txid].decision_hash:raise DistributedTxError("DECISION_MISMATCH")
  self.observed[txid][pid]=decision_hash;self._adv("OBSERVE",{"tx":txid,"participant":pid,"decision_hash":decision_hash})
 def globally_observed(self,txid):
  return txid in self.decisions and len(self.observed[txid])==len(self.transactions[txid])
 def coordinator_timeout(self,txid,epoch):
  self._check(txid,epoch)
  if txid in self.decisions:return False
  self.states[txid]=GlobalState.IN_DOUBT;self._adv("IN_DOUBT",{"tx":txid,"epoch":epoch});return True
 def recover_decision(self,txid,epoch,decision_hash):
  self._check(txid,epoch)
  if txid not in self.decisions:raise DistributedTxError("NO_DURABLE_DECISION")
  if self.decisions[txid].decision_hash!=decision_hash:raise DistributedTxError("DECISION_MISMATCH")
  return self.decisions[txid]
 def _check(self,txid,epoch):
  if txid not in self.transactions:raise DistributedTxError("UNKNOWN_TRANSACTION")
  if epoch!=self.epochs[txid]:raise DistributedTxError("COORDINATOR_EPOCH_MISMATCH")
 def _adv(self,k,p):self._audit=H(bytes.fromhex(self._audit)+C({"kind":k,"payload":p}))
