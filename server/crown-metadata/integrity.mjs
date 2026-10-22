import {createHash} from 'node:crypto';
export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
export const metadataLeaf=(asset,contentHash)=>sha256(`NEO-CROWN-METADATA-V1\n${asset}\n${contentHash}`);
export function buildCommitment(entries){
 const sorted=[...entries].sort((a,b)=>a.asset.localeCompare(b.asset,'en'));
 if(!sorted.length||new Set(sorted.map(x=>x.asset)).size!==sorted.length)throw new Error('nonempty_unique_assets_required');
 for(const e of sorted)if(!/^[a-f0-9]{64}$/.test(e.hash))throw new Error('invalid_content_hash');
 let levels=[sorted.map(e=>metadataLeaf(e.asset,e.hash))];
 while(levels.at(-1).length>1){const level=levels.at(-1),next=[];for(let i=0;i<level.length;i+=2)next.push(sha256(Buffer.from(level[i]+(level[i+1]||level[i]),'hex')));levels.push(next);}
 return {root:levels.at(-1)[0],entries:sorted.map((e,index)=>{const proof=[];let at=index;for(const level of levels.slice(0,-1)){const other=at%2?at-1:at+1;proof.push({side:at%2?'left':'right',hash:level[other]||level[at]});at=Math.floor(at/2);}return {...e,proof};})};
}
/** Integrity membership alone is not authenticated blockchain anchoring. */
export function verifyMetadataBytes(asset,bytes,envelope){
 if(envelope.asset!==asset||sha256(bytes)!==envelope.info_sha256)return false;
 let h=metadataLeaf(asset,envelope.info_sha256);
 for(const step of envelope.merkle_proof||[]){if(!['left','right'].includes(step.side)||!/^[a-f0-9]{64}$/.test(step.hash))return false;h=sha256(Buffer.from(step.side==='left'?step.hash+h:h+step.hash,'hex'));}
 return h===envelope.merkle_root;
}
