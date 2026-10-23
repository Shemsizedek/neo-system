import {createHash} from 'node:crypto';
export const VERSION='NEO-INVESTMENT-CARD-ENGINE-1.0.0';
const text=v=>typeof v==='string'?v.trim().slice(0,2000):'';
const object=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
export function canonicalJson(value){if(value===null||typeof value!=='object')return JSON.stringify(value);if(Array.isArray(value))return '['+value.map(canonicalJson).join(',')+']';return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonicalJson(value[k])).join(',')+'}';}
const sha=v=>createHash('sha256').update(typeof v==='string'?v:canonicalJson(v),'utf8').digest('hex');
export const GENRES=Object.freeze({
 real_estate:['Real estate','Built property, cityscape and a Shelton Estate & Co. treasury vault'],
 business_acquisition:['Business acquisition','Sector-specific operating business and a Shelton Estate & Co. treasury vault'],
 private_equity:['Private equity','Established business portfolio and a Shelton Estate & Co. treasury vault'],
 venture_capital:['Venture capital','Emerging technology campus and a Shelton Estate & Co. treasury vault'],
 private_capital:['Private capital','Private capital deal desk and a Shelton Estate & Co. treasury vault'],
 shares:['Shares','Enterprise headquarters and an equity register beside the treasury vault'],
 bond:['Bond','Treasury architecture, bond documents and maturity calendar'],
 note:['Note','Treasury vault and a signed note document'],
 investment_pool:['Investment pool','Portfolio assets arranged around a central treasury vault'],
 portfolio:['Portfolio','A diversified sector panorama with a central treasury vault'],
 index:['Index','A constellation of index constituents above the treasury vault'],
 insurance_policy:['Insurance policy','Protective shield around insured assets beside a treasury vault'],
 insurance_claim:['Insurance claim','Evidence dossier and claim review desk beside a treasury vault'],
 neo_project:['NEO project','Project-specific infrastructure beside a treasury vault'],
 nft:['NFT / collectible','Collectible-specific visual scene framed by treasury architecture'],
 utility:['Utility token','Service infrastructure and treasury architecture'],
 currency:['Currency token','Monetary instruments and treasury architecture'],
 unclassified:['Unclassified token','A neutral treasury vault and the token identifier']
});
const aliases={stock:'shares',stocks:'shares',share:'shares',equity:'shares',bonds:'bond',notes:'note',pool:'investment_pool',fund:'investment_pool',real_estate_fund:'real_estate',policy:'insurance_policy',claim:'insurance_claim',collectible:'nft',digital_tokenized_assets:'unclassified',tokenized_assets:'unclassified'};
function key(value){return text(value).toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');}
export function classifyCard(asset,ledger={},metadata={}){
 metadata=object(metadata);ledger=object(ledger);const c=object(metadata.card_data);
 for(const value of [metadata.instrument_type,metadata.asset_type,metadata.token_type,object(metadata.properties).instrument_type,c.instrument_type,c.category,metadata.category]){
  const declaration=key(value);let type=aliases[declaration]||declaration;
  if(declaration.startsWith('real_estate_'))type='real_estate';
  if(GENRES[type]&&type!=='unclassified')return {type,label:GENRES[type][0],status:'ISSUER_DECLARED',basis:'Issuer-linked structured metadata',evidence:text(value),legal_classification_verified:false};
 }
 const name=text(ledger.asset_longname)||asset;
 for(const [pattern,type] of [[/BONDS?$/i,'bond'],[/NOTES?$/i,'note'],[/SHARES?$/i,'shares'],[/INDEX$/i,'index']])if(pattern.test(name))return {type,label:GENRES[type][0],status:'PROVISIONAL',basis:'Token-name pattern; supporting terms required',evidence:name,legal_classification_verified:false};
 return {type:'unclassified',label:GENRES.unclassified[0],status:'UNCLASSIFIED',basis:/^A\d+$/.test(asset)?'Numeric identifier alone does not establish insurance or NFT type':'No supported instrument declaration',evidence:null,legal_classification_verified:false};
}
const absent=()=>({value:null,unit:null,status:'NOT PROVIDED',source:null,formula:null,inputs:null});
function metric(value,unit,source){
 const entry=object(value),raw=Object.keys(entry).length?entry.value:value;
 if(raw===undefined||raw===null||raw===''||raw==='NOT PROVIDED'||raw==='PENDING')return absent();
 if(typeof raw==='number'&&(!Number.isFinite(raw)||Math.abs(raw)>Number.MAX_SAFE_INTEGER))throw Error('Unsafe financial number; provide an exact decimal string.');
 if(!['number','string'].includes(typeof raw))throw Error('Financial metric must be a number or decimal string.');
 const number=String(raw).trim();if(!/^-?\d+(?:\.\d+)?$/.test(number)||number.length>100)throw Error('Financial metric must be an exact decimal value.');
 return {value:number,unit:text(entry.unit)||unit,status:'REQUIRES VERIFICATION',source:text(entry.source)||source||null,formula:null,inputs:null};
}
function decimal(v){const [a,b='']=v.split('.');return {n:BigInt(a+b),scale:10n**BigInt(b.length)};}
function percent(a,b){const x=decimal(a),y=decimal(b);if(y.n<=0n||x.n<0n)return null;const n=x.n*y.scale*10000n/(y.n*x.scale);return (n/100n)+'.'+String(n%100n).padStart(2,'0');}
const display=m=>m.status==='NOT PROVIDED'?'NOT PROVIDED':m.value+' '+(m.unit||'')+' ['+m.status+']';
export function buildInvestmentCard(asset,resolved={}){
 if(typeof asset!=='string'||!asset||asset.length>255)throw Error('Asset identifier required.');
 const l=object(resolved.ledger),m=object(resolved.metadata),c=object(m.card_data),classification=classifyCard(asset,l,m),identity=l.asset||asset;
 const source=text(c.source)||text(m.source)||text(resolved.metadata_url)||null;
 const mock=/mock|synthetic|sample|illustrative/i.test([source,c.issuer_sponsor,m.issuer_sponsor,m.deal_id,c.deal_id].join(' '));
 const values={...m,...c},currency=text(values.currency)||null;
 const metrics={};
 for(const [field,unit] of [['acquisition_value',currency],['capital_required',currency],['target_value',currency],['current_value',currency],['projected_roi','percent'],['cap_rate','percent'],['net_operating_income',currency],['neo_score','points out of 100']]){
  metrics[field]=metric(values[field]??(field==='projected_roi'?values.projected_roi_derived:undefined),unit,source);
 }
 // A variable name ending in "_derived" is not proof of a calculation.
 if(metrics.neo_score.value!==null&&(Number(metrics.neo_score.value)<0||Number(metrics.neo_score.value)>100))throw Error('NEO score must be between 0 and 100.');
 if(metrics.cap_rate.status==='NOT PROVIDED'&&metrics.net_operating_income.value!==null&&metrics.acquisition_value.value!==null&&currency){
  const result=percent(metrics.net_operating_income.value,metrics.acquisition_value.value);
  if(result!==null)metrics.cap_rate={value:result,unit:'percent',status:'DERIVED',source:'NEO Crown deterministic calculation; inputs require verification',formula:'net_operating_income / acquisition_value * 100',inputs:['net_operating_income','acquisition_value'],rounding:'Truncated to 2 decimal places'};
 }
 const year=values.year===undefined?null:String(values.year);if(year!==null&&!/^\d{4}$/.test(year))throw Error('Year must be four digits.');
 const title=text(values.primary_title)||l.asset_longname||identity;
 const submittedStatus=text(values.status)||null;
 const allowedStatuses=['FUNDING','FOR SALE','ACQUIRED','ACTIVE','UNDER REVIEW','PRIVATE','PROPOSED','MATURED','EXPIRED','CLOSED','PENDING'];
 const canonicalIdentity='counterparty:mainnet:'+identity;
 const card={schema:'NEO-INVESTMENT-CARD-V1',methodology_version:VERSION,card_id:'NEO-CARD-'+sha(canonicalIdentity),deal_id:text(m.deal_id||c.deal_id)||null,collection:text(m.collection)||'NEO INVESTMENT COLLECTION',series:classification.label,card_number:text(m.card_number)||null,rarity:{label:text(m.rarity)||null,meaning:'Collectible presentation only; not a financial rating'},asset:identity,asset_longname:l.asset_longname||null,network:'Counterparty 2.0 / Bitcoin mainnet',record_mode:mock?'MOCK':'ISSUER_METADATA',classification,card_data:{category:classification.label,primary_title:title,subtitle:text(values.subtitle)||classification.label,issuer_sponsor:text(values.issuer_sponsor||values.issuer)||null,year,asset_business:text(values.asset_business)||null,location:text(values.location)||null,status:mock?'MOCK':allowedStatuses.includes(submittedStatus)?submittedStatus:'NOT PROVIDED',issuer_reported_status:submittedStatus,risk_level:{value:text(values.risk_level)||null,status:values.risk_level?'REQUIRES VERIFICATION':'NOT PROVIDED'},financial_metrics:metrics,verification_status:mock?'MOCK / UNVERIFIED':'UNVERIFIED',source,hash:{issuer_supplied:text(values.hash)||null,verification_status:'REQUIRES VERIFICATION'}},ledger:{owner:l.owner||null,supply:l.supply===undefined||(typeof l.supply==='number'&&!Number.isSafeInteger(l.supply))?null:String(l.supply),divisible:l.divisible??null,supply_locked:l.locked??null,description:l.description||null,status:l.asset?'OBSERVED FROM LEDGER':'NOT PROVIDED'},media:Array.isArray(resolved.media?.items)?resolved.media.items.map(x=>({kind:text(x.kind),title:text(x.title),url:text(x.url)})):[],provenance:{metadata_url:text(resolved.metadata_url)||null,metadata_sha256:text(resolved.metadata_sha256)||null,observed_at:resolved.observed_at||null,issuer_signature_verified:false,financial_figures_verified:false},collector_presentation:{style:'Vertical muted metallic-gold border; charcoal background; vintage financial collectible; warm cinematic lighting',confers_financial_rights:false},integration:{export_url:'https://crown.holytemples.org/assets/'+encodeURIComponent(identity)+'/investment-card.json',token_url:'https://tokenscan.io/asset/'+encodeURIComponent(identity)},execution:{on_chain_changes:false,contract_execution:false}};
 const md=card.card_data;
 card.image_prompt='Create one centered premium vertical collectible investment card with rounded corners, thick muted metallic-gold border, charcoal background, fine vintage texture, cinematic digital painting and warm family-office lighting. Header: '+JSON.stringify(title)+'. Subtitle: '+JSON.stringify(md.subtitle)+'. Scene: '+GENRES[classification.type][1]+', engraved "Shelton Estate & Co.", emitting golden light toward a digital constellation. Stats: year '+(year||'NOT PROVIDED')+'; acquisition '+display(metrics.acquisition_value)+'; projected ROI '+display(metrics.projected_roi)+'. Status badge: '+md.status+'. Clearly display '+md.verification_status+'. Footer "Presented by Shelton Estate & Co.". No verified seal, guaranteed returns, invented figures or fabricated transaction hash. Single card only; crisp legible text.';
 const integrity={algorithm:'SHA-256',sha256:sha(card),encoding:'Recursively sorted-key UTF-8 JSON of payload',blockchain_anchor_verified:false};
 return {payload:card,integrity};
}

export function auditCard(record){const p=record.payload;return {card_id:p.card_id,financial_figures_verified:false,warnings:Object.entries(p.card_data.financial_metrics).filter(([,m])=>m.status!=='NOT PROVIDED').map(([k,m])=>k+': '+m.status),record_mode:p.record_mode};}
export function runCardCommand(command,{asset,resolved={},records=[]}={}){
 const name=String(command).toUpperCase().replace(/^\//,'');
 if(name==='BATCH')return records.map(r=>buildInvestmentCard(r.asset,r.resolved));
 const kinds={'REAL-ESTATE':'real_estate',BUSINESS:'business_acquisition','PRIVATE-CAPITAL':'private_capital',PORTFOLIO:'portfolio'};
 if(kinds[name]){const declared=classifyCard(asset,resolved.ledger,resolved.metadata);if(declared.status==='ISSUER_DECLARED'&&declared.type!==kinds[name])throw Error('Command category conflicts with issuer-linked metadata.');resolved={...resolved,metadata:{...object(resolved.metadata),instrument_type:kinds[name]}};}
 if(!['CARD','REAL-ESTATE','BUSINESS','PRIVATE-CAPITAL','PORTFOLIO','TOKENIZED','SCORE','AUDIT','PROMPT','UPDATE','VERIFY'].includes(name))throw Error('Unsupported card command.');
 const result=buildInvestmentCard(asset,resolved);
 if(name==='PROMPT')return {card_id:result.payload.card_id,image_prompt:result.payload.image_prompt};
 if(name==='AUDIT')return auditCard(result);
 if(name==='SCORE')return result.payload.card_data.financial_metrics.neo_score;
 if(name==='VERIFY')return {integrity_valid:sha(result.payload)===result.integrity.sha256,financial_figures_verified:false,blockchain_anchor_verified:false};
 return result;
}
