/** Crown Chain cross-domain evidence envelope: data integrity is distinct from legal authority. */
export type CrownDomain='FINANCIAL'|'PROFESSIONAL'|'LEGAL'|'GOVERNMENT'|'SECURITY'
export type CrownDisclosure='PUBLIC'|'RESTRICTED'|'CONFIDENTIAL'
export type CrownClaimStatus='SOURCE_REPORTED'|'INDEPENDENTLY_CORROBORATED'|'DISPUTED'|'UNVERIFIED'
export type CrownUniversalRecord={
 schema:'neo.crown.universal.v1';recordId:string;domain:CrownDomain;recordType:string;
 observedAt:string;sourceReferences:string[];status:CrownClaimStatus;
 disclosure:CrownDisclosure;subjectReference:string;contentDigestSha256:string;
 bitcoinAnchor?:{txid:string;blockHeight:number;blockHash:string;verification:'PENDING'|'CONFIRMED'};
 priorRecordId?:string;relatedRecordIds:string[];
}
export function validatePublicCrownRecord(value:CrownUniversalRecord):boolean{
 return value.schema==='neo.crown.universal.v1'
 && value.disclosure==='PUBLIC'
 && !!value.recordId && !!value.subjectReference
 && value.sourceReferences.length>0
 && /^[a-f0-9]{64}$/i.test(value.contentDigestSha256)
 && Number.isFinite(Date.parse(value.observedAt))
 && (!value.bitcoinAnchor || (
   /^[a-f0-9]{64}$/i.test(value.bitcoinAnchor.txid)
   && /^[a-f0-9]{64}$/i.test(value.bitcoinAnchor.blockHash)
   && Number.isInteger(value.bitcoinAnchor.blockHeight)
   && value.bitcoinAnchor.blockHeight>=0
 ))
}
