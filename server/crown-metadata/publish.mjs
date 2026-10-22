import {readFile,writeFile,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createAssetRecord} from './engine.mjs';
const prepared=JSON.parse(await readFile('/inventory/prepared.json','utf8'));
const plans=[];
for(const i of prepared){
 const a=i.raw,base=`https://crown.holytemples.org/assets/${a.asset}`;
 const record=createAssetRecord(a,{description:i.description},{origin:'https://crown.holytemples.org',observedAt:i.observed,sourceUrl:`https://tokenscan.io/asset/${a.asset}`,issuerLabel:a.issuer});
 const m=record.manifest;delete m.content_hash;delete m.hash_algorithm;
 m.ledger.source_url=`https://api.counterparty.io:4000/v2/assets/${a.asset}`;m.ledger.issuer=a.issuer;m.ledger.description_locked=a.description_locked;m.ledger.latest_observed_issuance=i.latest_event;
 m.attachments=[{kind:'visual_card',title:'NEO Crown visual card',url:base+'/card.svg'},...i.attachments];
 m.supported_attachment_types=['application/pdf','video/*','image/*','audio/*','text/html','application/xhtml+xml','application/wasm','application/json'];
 m.attachment_policy={execution:'external_link_only',untrusted_html:'never_inline',new_documents:'require_asset_specific_source'};
 m.provenance={metadata_authority:'operator_curated',wallet_control_verified:false,issuance_verified:false,ledger_source:'counterparty_core_api_v2',ledger_issuer_matches_configured_wallet:true,bitcoin_anchor:null};
 if(i.existing)m.issuer_claims.preserved_metadata=i.existing;
 m.display_quantity=a.divisible?`${BigInt(a.supply)/100000000n}.${(BigInt(a.supply)%100000000n).toString().padStart(8,'0')}`:a.supply;
 m.content_hash=createHash('sha256').update(JSON.stringify(m)).digest('hex');m.hash_algorithm='sha256-json-utf8';
 record.enhanced.image=base+'/icon.png';record.enhanced.website=base+'/index.html';
 record.enhanced.description=`${String(i.description).slice(0,1400)}\nAdditional information and visual card: ${base}/index.html`;
 record.icon_base64=i.icon;
 const path=`/records/${a.asset}.json`;await writeFile(path+'.tmp',JSON.stringify(record));await rename(path+'.tmp',path);
 plans.push({asset:a.asset,source:a.owner,quantity:0,description:base+'/info.json',divisible:a.divisible,transfer_destination:null,lock:false,reset:false,expected_previous_description:a.description,description_locked:a.description_locked,state:i.editable?'READY_FOR_SIGNER':'BLOCKED',preserve_supply:a.supply});
}
await writeFile('/inventory/description-update-plans.json',JSON.stringify(plans,null,2));
console.log(JSON.stringify({published:prepared.length,description_updates_prepared:plans.length,broadcast:false}));