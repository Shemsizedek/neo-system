import { createEvidenceVault } from '../neo-evidence-vault/store.mjs';

export function createTmnlfEvidenceBridge(path=process.env.NEO_EVIDENCE_DB_PATH||'data/neo-evidence-vault.sqlite'){
 const vault=createEvidenceVault(path);
 const assetForMatter=matterId=>`TMNLF:${String(matterId).toUpperCase()}`;
 const register=(matterId,input,actor='tmnlf')=>vault.createEvidence({asset:assetForMatter(matterId),title:input.label||input.title,sourceType:input.sourceType||'TMNLF_INTAKE',sourceUrl:input.sourceUrl,jurisdiction:input.jurisdiction,claimType:input.claimType,note:input.note},actor);
 const list=matterId=>vault.listEvidence(assetForMatter(matterId));
 const audit=matterId=>vault.listAudit(assetForMatter(matterId));
 return {register,list,audit,review:vault.reviewEvidence,close:vault.close};
}
