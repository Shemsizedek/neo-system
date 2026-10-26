import {createHash} from 'node:crypto';
import {LAYER3_SCHEMA,LAYER3_STYLES} from './layer3-showcase.mjs';

const PALETTES=Object.freeze({
  aurum:{accent:'#E4C48C',light:'#FFF0C9',deep:'#71502C'},
  emerald:{accent:'#83D1AD',light:'#D6F9D9',deep:'#225A46'},
  azurite:{accent:'#90BDEB',light:'#DAEEFF',deep:'#274D7A'},
  violet:{accent:'#CDA8E9',light:'#F2DAFF',deep:'#614076'},
  copper:{accent:'#DAAA7A',light:'#FFE5C3',deep:'#805236'}
});
const TYPE_STYLE=Object.freeze({
  real_estate:'aurum',business_acquisition:'copper',private_equity:'emerald',
  venture_capital:'azurite',private_capital:'aurum',shares:'emerald',
  bond:'aurum',note:'azurite',investment_pool:'violet',portfolio:'violet',
  index:'azurite',insurance_policy:'emerald',insurance_claim:'copper',
  neo_project:'aurum',nft:'violet',utility:'azurite',currency:'aurum',unclassified:'copper'
});
export const CARD_SIZE=Object.freeze({width:720,height:1040});
const clean=value=>Array.from(String(value??'').replace(/[\u0000-\u001f\u007f-\u009f]/g,' ')).join('');
const x=value=>clean(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[ch]));
const cut=(value,n=32)=>{const pieces=Array.from(clean(value));return pieces.length<=n?pieces.join(''):pieces.slice(0,n-1).join('')+'…';};
const hex=value=>createHash('sha256').update(String(value)).digest('hex');
const text=(px,py,label,size=18,fill='#F1EADC',opts='')=>`<text x="${px}" y="${py}" fill="${fill}" font-family="'Trebuchet MS',Arial,sans-serif" font-size="${size}" ${opts}>${x(label)}</text>`;
const line=(x1,y1,x2,y2,color,width=1,opacity=1)=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}" opacity="${opacity}"/>`;

function motif(type,accent,light){
  const rim=`<circle cx="360" cy="412" r="158" fill="none" stroke="${accent}" stroke-width="1.6" opacity=".55"/><circle cx="360" cy="412" r="138" fill="none" stroke="${accent}" stroke-width="1" opacity=".4"/>`;
  if(['real_estate','business_acquisition','private_equity','venture_capital','private_capital','neo_project'].includes(type)){
    const city=Array.from({length:9},(_,i)=>{const n=(i*31)%79,h=70+n,w=26+(i%3)*8,px=210+i*35;return `<rect x="${px}" y="${505-h}" width="${w}" height="${h}" rx="2" fill="${accent}" opacity="${.13+(i%3)*.05}" stroke="${accent}" stroke-width="1.5"/><rect x="${px+8}" y="${510-h}" width="5" height="7" fill="${light}" opacity=".75"/>`;}).join('');
    return rim+city+line(192,512,528,512,accent,3,.8);
  }
  if(['bond','note'].includes(type)){
    return rim+`<rect x="250" y="330" width="220" height="165" rx="9" fill="${accent}" fill-opacity=".08" stroke="${accent}" stroke-width="3"/><rect x="265" y="346" width="190" height="133" rx="5" fill="none" stroke="${light}" opacity=".36"/>`+
    Array.from({length:4},(_,i)=>line(290,374+i*21,431-(i%2)*45,374+i*21,light,2,.7)).join('')+
    `<circle cx="423" cy="461" r="18" fill="none" stroke="${accent}" stroke-width="3"/>`;
  }
  if(['insurance_policy','insurance_claim'].includes(type)){
    return rim+`<path d="M360 313 L451 343 L445 423 Q434 479 360 508 Q286 479 275 423 L269 343 Z" fill="${accent}" fill-opacity=".09" stroke="${accent}" stroke-width="4"/><path d="M315 411 l31 31 69-76" stroke="${light}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
  }
  if(type==='shares'){
    const dots=[[360,335],[297,399],[423,399],[274,467],[330,478],[392,478],[451,467]];
    return rim+line(360,335,297,399,accent,3)+line(360,335,423,399,accent,3)+line(297,399,274,467,accent,3)+line(297,399,330,478,accent,3)+line(423,399,392,478,accent,3)+line(423,399,451,467,accent,3)+dots.map(([px,py])=>`<circle cx="${px}" cy="${py}" r="13" fill="#15282E" stroke="${light}" stroke-width="3"/><circle cx="${px}" cy="${py}" r="4" fill="${accent}"/>`).join('');
  }
  if(type==='nft'){
    return rim+`<polygon points="360,289 475,407 360,528 245,407" fill="${accent}" fill-opacity=".12" stroke="${accent}" stroke-width="4"/><polygon points="360,328 431,407 360,485 289,407" fill="none" stroke="${light}" stroke-width="2"/><path d="M245 407 H475 M360 289 V528" stroke="${light}" opacity=".45" stroke-width="2"/>`;
  }
  if(['index','investment_pool','portfolio','utility','currency'].includes(type)){
    return rim+`<ellipse cx="360" cy="412" rx="124" ry="51" transform="rotate(-30 360 412)" fill="none" stroke="${accent}" stroke-width="3"/><ellipse cx="360" cy="412" rx="112" ry="47" transform="rotate(58 360 412)" fill="none" stroke="${light}" stroke-width="2" opacity=".7"/><circle cx="360" cy="412" r="42" fill="${accent}" fill-opacity=".15" stroke="${accent}" stroke-width="3"/>`+text(360,423,'N',42,light,'text-anchor="middle" font-family="Georgia,serif"');
  }
  return rim+`<path d="M360 294 L391 380 L484 395 L412 452 L435 533 L360 488 L285 533 L308 452 L236 395 L329 380 Z" fill="${accent}" fill-opacity=".1" stroke="${accent}" stroke-width="3"/>`+text(360,438,'N',90,light,'text-anchor="middle" font-family="Georgia,serif"');
}
function pattern(hashstr,accent){
  return Array.from({length:32},(_,i)=>{
    const a=parseInt(hashstr.slice(i%24,i%24+2),16);
    const b=parseInt(hashstr.slice((i+17)%48,(i+17)%48+2),16);
    const px=60+(i%8)*86+(a%17),py=205+Math.floor(i/8)*104+(b%21),r=1+(a%3);
    return `<circle cx="${px}" cy="${py}" r="${r}" fill="${accent}" opacity="${.12+(b%30)/130}"/>`;
  }).join('');
}
function backdrop(record,theme){
  const hashstr=hex(record.card_id);
  return `<defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0B1119"/><stop offset=".54" stop-color="#17242C"/><stop offset="1" stop-color="#080E14"/></linearGradient>
    <radialGradient id="halo" cx="50%" cy="39%" r="52%"><stop offset="0" stop-color="${theme.deep}" stop-opacity=".68"/><stop offset=".58" stop-color="${theme.deep}" stop-opacity=".12"/><stop offset="1" stop-color="#090F14" stop-opacity="0"/></radialGradient>
    <linearGradient id="goldline" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${theme.light}"/><stop offset=".55" stop-color="${theme.accent}"/><stop offset="1" stop-color="${theme.deep}"/></linearGradient>
    <pattern id="mesh" width="45" height="45" patternUnits="userSpaceOnUse"><path d="M45 0 H0 V45" fill="none" stroke="${theme.accent}" stroke-opacity=".09" stroke-width=".7"/></pattern>
  </defs>
  <rect width="720" height="1040" fill="#070D14"/><rect x="12" y="12" width="696" height="1016" rx="28" fill="url(#bg)" stroke="url(#goldline)" stroke-width="7"/>
  <rect x="29" y="29" width="662" height="982" rx="19" fill="url(#mesh)" stroke="${theme.accent}" stroke-opacity=".45" stroke-width="1"/>
  <ellipse cx="360" cy="422" rx="292" ry="315" fill="url(#halo)"/>${pattern(hashstr,theme.accent)}
  <path d="M66 161 H654 M66 879 H654" stroke="${theme.accent}" stroke-opacity=".5" stroke-width="1.5"/>
  <path d="M67 64 h35 M67 64 v35 M653 64 h-35 M653 64 v35 M67 976 h35 M67 976 v-35 M653 976 h-35 M653 976 v-35" fill="none" stroke="${theme.accent}" stroke-width="2" opacity=".8"/>`;
}
function themeFor(record){
  const key=record.style==='auto'?TYPE_STYLE[record.classification.type]||'aurum':record.style;
  if(!LAYER3_STYLES.includes(record.style)||!PALETTES[key])throw Error('invalid_showcase_style');
  return PALETTES[key];
}
function front(r,theme){
  const brandAsset=r.asset==='NOMNI'?'NEO Crown':r.asset;
  const title=Array.from(r.display_title||brandAsset);
  const lines=title.length<=26?[title.join('')]:[title.slice(0,26).join(''),cut(title.slice(26).join(''),27)];
  const badge=r.mode==='OBSERVED_COUNTERPARTY_ASSET'?'OBSERVED COUNTERPARTY ASSET':'UNISSUED · DESIGN PREVIEW';
  const sup=r.ledger.supply_raw===null?'NOT VERIFIED':cut(r.ledger.supply_raw,23);
  const lock=r.ledger.locked===true?'LOCKED (LEDGER)':r.ledger.locked===false?'UNLOCKED (LEDGER)':'NOT VERIFIED';
  return text(68,101,'NEO',37,theme.light,'font-family="Georgia,serif" font-weight="bold"')+
    text(155,94,'C R O W N   C H A I N',15,theme.accent,'font-weight="bold" letter-spacing="1.5"')+
    text(155,118,'LAYER 3 · BITCOIN INSTRUMENTS',11,'#AEBDBA','letter-spacing="1"')+
    text(651,94,'144',19,theme.light,'text-anchor="end"')+
    text(360,207,badge,14,theme.light,'text-anchor="middle" letter-spacing="1.7" font-weight="bold"')+
    motif(r.classification.type,theme.accent,theme.light)+
    text(360,584,r.classification.label.toUpperCase(),16,theme.accent,'text-anchor="middle" letter-spacing="1.4"')+
    lines.map((s,i)=>text(360,646+i*49,s,lines.length>1?32:40,theme.light,'text-anchor="middle" font-weight="bold" font-family="Georgia,serif"')).join('')+
    text(360,lines.length>1?753:704,'NEO CROWN PRESENTATION · '+cut(brandAsset,35),13,'#B8C7C3','text-anchor="middle" letter-spacing=".5"')+
    `<rect x="68" y="760" width="584" height="100" rx="11" fill="#0D161E" fill-opacity=".84" stroke="${theme.accent}" stroke-opacity=".3"/>`+
    text(92,789,'CLASSIFICATION',10,'#AAB8B7','letter-spacing="1.2"')+
    text(92,817,cut(r.classification.status.replaceAll('_',' '),25),17,theme.light)+
    text(370,789,'RAW SUPPLY · IF OBSERVED',10,'#AAB8B7','letter-spacing="1.2"')+
    text(370,817,sup,16,theme.light)+
    text(92,845,'LOCK STATUS: '+lock,11,theme.accent)+
    text(360,916,'SHOWCASE ART · NOT PROOF OF RIGHTS, RESERVES OR PRICE',12,'#D3C3A7','text-anchor="middle"')+
    text(360,944,cut(r.card_id,39),11,'#AAB9BB','text-anchor="middle" letter-spacing="1"')+
    text(360,985,'OFF-CHAIN DESIGN · '+(r.mode==='UNISSUED_DESIGN_PREVIEW'?'NOT ISSUED':'LEDGER-OBSERVED'),12,theme.accent,'text-anchor="middle"');
}
function back(r,theme){
  const fields=[
    ['ON-CHAIN ASSET CODE',cut(r.asset,42)],
    ['PRESENTATION CLASS',cut(r.classification.label,40)],
    ['CLASSIFICATION EVIDENCE',cut(r.classification.status.replaceAll('_',' '),39)],
    ['BITCOIN / TOKEN STANDARD',cut(r.protocol.toUpperCase(),35)],
    ['LEDGER OBSERVED',r.provenance.ledger_observed?'YES · COUNTERPARTY ASSET':'NO · DESIGN PREVIEW'],
    ['ISSUER (PUBLIC SOURCE)',cut(r.ledger.issuer||'NOT VERIFIED',39)],
    ['CURRENT OWNER (PUBLIC SOURCE)',cut(r.ledger.owner||'NOT VERIFIED',39)],
    ['SUPPLY (RAW UNITS)',cut(r.ledger.supply_raw||'NOT VERIFIED',37)],
    ['ISSUER TERMS STATUS',cut(r.instrument.terms_status.replaceAll('_',' '),39)],
    ['METADATA RESOLUTION',cut(r.provenance.metadata_status.replaceAll('_',' '),39)]
  ];
  return text(69,97,'NEO',35,theme.light,'font-family="Georgia,serif" font-weight="bold"')+
    text(154,94,'LAYER 3 / PROVENANCE',13,theme.accent,'font-weight="bold"')+
    text(69,211,'EVIDENCE BEFORE CLAIMS',27,theme.light,'font-family="Georgia,serif"')+
    text(69,248,'Presentation metadata · not a signed ownership certificate',13,'#B5C1BD')+
    fields.map(([k,v],i)=>{const y=300+i*55;return text(73,y,k,11,theme.accent,'letter-spacing=".7"')+text(73,y+23,v,17,'#F1E7D3');}).join('')+
    `<rect x="70" y="875" width="580" height="102" rx="10" fill="#101A22" stroke="${theme.accent}" stroke-opacity=".7"/>`+
    text(92,901,'IMPORTANT',11,theme.accent,'font-weight="bold" letter-spacing="1.4"')+
    text(92,925,'No token issuance, legal rights, backing, valuation, or wallet control',12,'#E3D3B5')+
    text(92,945,'is certified by this showcase. Check authoritative source records.',12,'#E3D3B5')+
    text(360,996,cut(r.card_id,48),10,'#B8C7C3','text-anchor="middle" letter-spacing=".8"');
}
export function renderLayer3Svg(record,{face='front'}={}){
  const data=record?.payload||record;
  if(!data||data.schema!==LAYER3_SCHEMA)throw Error('invalid_layer3_card');
  if(face!=='front'&&face!=='back')throw Error('invalid_card_face');
  const theme=themeFor(data);
  const content=face==='front'?front(data,theme):back(data,theme);
  return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="720" height="1040" viewBox="0 0 720 1040" role="img" aria-label="${x('NEO Crown '+(data.asset==='NOMNI'?'NEO Crown':data.asset)+' '+face+' showcase')}">${backdrop(data,theme)}${content}</svg>`;
}
