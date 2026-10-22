import {readFile,writeFile,readdir,mkdir,rename} from 'node:fs/promises';
import {renderCard} from './engine.mjs';
import {sha256,buildCommitment} from './integrity.mjs';
const root=process.env.CROWN_METADATA_ROOT||'/opt/crown-metadata';
const recordsPath=`${root}/records`, staging=`${root}/staged-rich`;
await mkdir(staging,{recursive:true});
const pilot=JSON.parse(await readFile(`${root}/code/KNOWINDEX-info.draft.json`,'utf8'));
const methodology=await readFile(`${root}/code/METHODOLOGY.md`,'utf8');
const rows=[];
for(const name of (await readdir(recordsPath)).filter(n=>n.endsWith('.json')&&!n.startsWith('_')).sort()){
 const r=JSON.parse(await readFile(`${recordsPath}/${name}`,'utf8')),m=r.manifest,asset=m.ledger.asset,base=`https://crown.holytemples.org/assets/${asset}`;
 const prior=r.enhanced;
 if(asset==='KNOWINDEX'){
  m.card.primary_title='NEO Knowledge / KNOWINDEX';m.card.subtitle='World Library / Global Knowledge Economy';m.card.sector='Knowledge, education and community contributions';
  m.issuer_claims.description=pilot.description;m.issuer_claims.partnership_attribution='Project sponsor statement';m.issuer_claims.initial_share_designation='1,000 shares';
  m.attachments=m.attachments.filter(x=>!['world_library','methodology','external_reference'].includes(x.kind));
  m.attachments.push({kind:'world_library',title:'World Library / Hall of Knowledge',url:pilot.website},{kind:'methodology',title:'NEO Knowledge methodology 0.1.0 draft',url:base+'/methodology.txt'},{kind:'external_reference',title:'GKI 2025 / UNDP and MBRF',url:pilot.files[1].data});r.methodology_text=methodology;
 }
 delete m.content_hash;delete m.hash_algorithm;m.content_hash=sha256(JSON.stringify(m));m.hash_algorithm='sha256-json-utf8';
 r.card_svg=renderCard(m);
 const e={...prior,name:asset==='KNOWINDEX'?pilot.name:asset};
 if(asset==='KNOWINDEX'){e.description=pilot.description;e.website=pilot.website;}
 const legacy=m.issuer_claims.preserved_metadata?.payload||{};
 e.images=[{type:'icon',size:'48x48',data:base+'/icon.png',name:asset+' token icon',hash:sha256(Buffer.from(r.icon_base64,'base64'))},{type:'standard',size:'svg',data:base+'/card.svg',name:asset+' NEO Crown card',hash:sha256(r.card_svg)}];
 for(const item of legacy.images||[]){if(item&&typeof item==='object'&&typeof item.data==='string'&&item.data.startsWith('https://')&&!e.images.some(i=>i.data===item.data))e.images.push(item);}
 e.files=(m.attachments||[]).filter(a=>a.kind!=='visual_card').map(a=>({type:'other',name:a.title||a.kind,data:a.url}));
 for(const item of legacy.files||[]){if(item&&typeof item.data==='string'&&item.data.startsWith('https://')&&!e.files.some(i=>i.data===item.data))e.files.push(item);}
 for(const key of ['audio','video'])if(Array.isArray(legacy[key]))e[key]=legacy[key];
 if(asset==='KNOWINDEX')e.files.push({type:'other',name:'NEO Knowledge methodology 0.1.0 draft',data:base+'/methodology.txt',hash:sha256(methodology)});
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 e.html=`<section><h2>${esc(e.name)}</h2><p>${esc(e.description)}</p><p><a href="${esc(base+'/card.svg')}">Open visual data card</a></p><p><a href="${esc(e.website)}">${asset==='KNOWINDEX'?'World Library / Hall of Knowledge':'Additional information'}</a></p><p><a href="${esc(base+'/verification.json')}">Crown integrity evidence</a></p></section>`;
 r.enhanced=e;const infoBytes=JSON.stringify(e);rows.push({asset,hash:sha256(infoBytes),record:r,path:name});
 await writeFile(`${staging}/${name}`,JSON.stringify(r));
}
const tree=buildCommitment(rows);const createdAt=new Date().toISOString();
for(const row of rows){const entry=tree.entries.find(e=>e.asset===row.asset);row.record.verification={schema:'NEO-CROWN-INTEGRITY-V1',asset:row.asset,info_url:`https://crown.holytemples.org/assets/${row.asset}/info.json`,info_sha256:row.hash,byte_encoding:'UTF-8',hash_scope:'exact HTTP info.json response bytes',merkle_root:tree.root,merkle_proof:entry.proof,created_at:createdAt,blockchain_anchor:{status:'NOT_BROADCAST',tx_hash:null,block_index:null},issuer_signature_verified:false};await writeFile(`${staging}/${row.path}`,JSON.stringify(row.record));}
const commitment={schema:'NEO-CROWN-COMMITMENT-V1',merkle_root:tree.root,asset_count:rows.length,created_at:createdAt,proposed_broadcast_text:`CROWN/1:${tree.root}`,anchor_status:'NOT_BROADCAST',tx_hash:null,leaf_rule:'SHA256(UTF8(NEO-CROWN-METADATA-V1\\n + asset + \\n + info_sha256))',node_rule:'SHA256(left 32 bytes || right 32 bytes); duplicate odd last node',consumer_contract:'Prime / Oracle may verify exact metadata bytes and membership. Treat as unanchored issuer metadata until an authenticated chain commitment is independently confirmed.'};
await writeFile(`${staging}/_commitment.json`,JSON.stringify(commitment));console.log(JSON.stringify({staged:rows.length,root:tree.root}));
