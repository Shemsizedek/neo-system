import crypto from 'node:crypto';

const stable=value=>{if(Array.isArray(value))return value.map(stable);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])]));return value};
export const canonicalAttestationPayload=attestation=>Buffer.from(JSON.stringify(stable({
  id:attestation.id,unit:attestation.unit,backingValue:attestation.backingValue,liabilitiesValue:attestation.liabilitiesValue,
  asOf:attestation.asOf,custodianRef:attestation.custodianRef,auditorRef:attestation.auditorRef,statementHash:attestation.statementHash
})));

export function createAttestationRegistry({now=()=>new Date().toISOString(),trustedPublicKeys={}}={}){
  const attestations=new Map();
  function verify(input){
    for(const key of ['id','unit','asOf','custodianRef','auditorRef','statementHash','keyId','signature'])if(!String(input[key]??'').trim())throw new Error(`${key} is required`);
    const publicKey=trustedPublicKeys[input.keyId];if(!publicKey)throw new Error('attestation key is not trusted');
    const backingValue=Number(input.backingValue),liabilitiesValue=Number(input.liabilitiesValue);
    if(!Number.isFinite(backingValue)||backingValue<0||!Number.isFinite(liabilitiesValue)||liabilitiesValue<0)throw new Error('attestation values must be non-negative');
    const candidate={...input,unit:String(input.unit).toUpperCase(),backingValue,liabilitiesValue};
    const signatureValid=crypto.verify(null,canonicalAttestationPayload(candidate),publicKey,Buffer.from(input.signature,'base64'));
    if(!signatureValid)throw new Error('attestation signature is invalid');
    const asOfTime=Date.parse(input.asOf),currentTime=Date.parse(now());
    if(!Number.isFinite(asOfTime)||asOfTime>currentTime)throw new Error('attestation asOf is invalid');
    const row={...candidate,signatureValid:true,coverageRatio:liabilitiesValue===0?null:Number((backingValue/liabilitiesValue).toFixed(8)),verifiedAt:now(),status:'CRYPTOGRAPHICALLY_VERIFIED_NOT_LEGALLY_ENDORSED'};
    attestations.set(row.id,row);return row;
  }
  return{verify,attestations};
}
