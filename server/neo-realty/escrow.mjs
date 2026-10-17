import { randomUUID, createHash } from 'node:crypto';
export const STATES=Object.freeze(['DRAFT','QUOTE_RECORDED','ESCROW_PLEDGED_SIM','ESCROW_FUNDED_SIM','TITLE_REVIEW','RELEASE_BLOCKED']);
export function validateQuote({usd,usdPerNomni}) {
 if(!Number.isFinite(usd)||usd<=0||!Number.isFinite(usdPerNomni)||usdPerNomni<=0) throw new Error('Positive finite values required');
 return {usd,usdPerNomni,nomni:usd/usdPerNomni,marketRateVerified:false};
}
export function createPilot({parcel='746204926616',ownerStake=20,usd=75000,usdPerNomni=1}={}) {
 if(!Number.isFinite(ownerStake)||ownerStake<0||ownerStake>100) throw new Error('Owner stake out of bounds');
 const quote=validateQuote({usd,usdPerNomni});
 return {id:randomUUID(),parcel,status:'DRAFT',sandbox:true,ownerStake,quote,titleVerified:false,events:[]};
}
export function transition(pilot,type) {
 const types=['QUOTE_RECORDED','ESCROW_PLEDGED_SIM','ESCROW_FUNDED_SIM','TITLE_REVIEW','RELEASE_BLOCKED'];
 const next=types[pilot.events.length];
 if(type!==next) throw new Error('Invalid transition; expected '+(next||'none'));
 if(!pilot.sandbox) throw new Error('Production escrow disabled');
 const prev=pilot.events.at(-1)?.hash||'GENESIS';
 const event={sequence:pilot.events.length+1,type,timestamp:new Date().toISOString(),previousHash:prev,simulation:true};
 event.hash=createHash('sha256').update(JSON.stringify(event)).digest('hex');
 pilot.events.push(event);pilot.status=type;return event;
}
export function verifyChain(pilot) {
 let prev='GENESIS';
 for(const e of pilot.events){const {hash,...rest}=e;
 if(rest.previousHash!==prev||createHash('sha256').update(JSON.stringify(rest)).digest('hex')!==hash)return false;
 prev=hash;} return true;
}
