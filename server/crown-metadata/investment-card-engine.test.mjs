import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {buildInvestmentCard,classifyCard,canonicalJson,runCardCommand} from './investment-card-engine.mjs';
test('mock records cannot become verified production cards or proven derived ROI',()=>{const {payload:p}=buildInvestmentCard('MOCKAPEX',{metadata:{deal_id:'NEO-DEAL-MOCK-001',rarity:'LEGENDARY',card_data:{category:'REAL ESTATE (Multifamily)',primary_title:'Apex Multifamily Acquisition',issuer_sponsor:'Shelton Estate & Co. (MOCK DEPLOYMENT)',year:'2024',acquisition_value:28500000,capital_required:12000000,projected_roi_derived:18.5,cap_rate:6.2,status:'FUNDING',neo_score:82,source:'MOCK GENERATION',hash:'PENDING',verification_status:'VERIFIED'}}});assert.equal(p.record_mode,'MOCK');assert.equal(p.card_data.verification_status,'MOCK / UNVERIFIED');assert.equal(p.card_data.status,'MOCK');assert.equal(p.card_data.financial_metrics.projected_roi.status,'REQUIRES VERIFICATION');assert.equal(p.card_data.financial_metrics.neo_score.status,'REQUIRES VERIFICATION');});
test('insurance declarations classify numeric tokens, but identifiers and artwork alone do not',()=>{for(const type of ['real_estate','business_acquisition','private_equity','venture_capital','private_capital','shares','bond','note','investment_pool','portfolio','insurance_policy','insurance_claim','neo_project'])assert.equal(classifyCard('A123456789012345678',{}, {instrument_type:type}).type,type);assert.equal(classifyCard('A123456789012345678').type,'unclassified');assert.equal(classifyCard('NOMNI',{}, {image:'art.jpg'}).type,'unclassified');assert.equal(classifyCard('TESTBOND').status,'PROVISIONAL');assert.equal(classifyCard('NOMNI',null,null).type,'unclassified');});
test('missing figures stay absent and exact decimals survive',()=>{const p=buildInvestmentCard('NOMNI',{ledger:{asset:'NOMNI',supply:'900000000',locked:true},metadata:{current_value:'12345678901234567890.12345678'}}).payload;assert.equal(p.ledger.supply,'900000000');assert.equal(p.card_data.financial_metrics.current_value.value,'12345678901234567890.12345678');assert.equal(p.card_data.year,null);assert.equal(p.card_data.financial_metrics.neo_score.status,'NOT PROVIDED');assert.throws(()=>buildInvestmentCard('TEST',{metadata:{current_value:Infinity}}));assert.throws(()=>buildInvestmentCard('TEST',{metadata:{neo_score:101}}));});
test('DERIVED requires a real formula and retains unverified input labels',()=>{const p=buildInvestmentCard('ESTATE',{metadata:{currency:'USD',acquisition_value:'1000000',net_operating_income:'62000'}}).payload;assert.equal(p.card_data.financial_metrics.cap_rate.value,'6.20');assert.equal(p.card_data.financial_metrics.cap_rate.status,'DERIVED');assert.match(p.card_data.financial_metrics.cap_rate.source,/require verification/);});
test('canonical hashes and full token identities are reproducible',()=>{assert.equal(canonicalJson({b:2,a:1}),canonicalJson({a:1,b:2}));const a=buildInvestmentCard('LONGTOKEN.ONE'),b=buildInvestmentCard('LONGTOKEN.TWO');assert.notEqual(a.payload.card_id,b.payload.card_id);assert.equal(createHash('sha256').update(canonicalJson(a.payload)).digest('hex'),a.integrity.sha256);assert.equal(a.integrity.blockchain_anchor_verified,false);});
test('commands provide batch, prompt, score and honest verification',()=>{assert.equal(runCardCommand('/BATCH',{records:[{asset:'NOMNI'},{asset:'A12345'}]}).length,2);assert.equal(typeof runCardCommand('/PROMPT',{asset:'NOMNI'}).image_prompt,'string');assert.equal(runCardCommand('/SCORE',{asset:'NOMNI'}).status,'NOT PROVIDED');assert.equal(runCardCommand('/VERIFY',{asset:'NOMNI'}).financial_figures_verified,false);assert.throws(()=>runCardCommand('/REAL-ESTATE',{asset:'TEST',resolved:{metadata:{instrument_type:'bond'}}}),/conflicts/);});

test('VERIFY detects tampered exports',()=>{const record=buildInvestmentCard('NOMNI');assert.equal(runCardCommand('/VERIFY',{record}).integrity_valid,true);record.payload.card_data.primary_title='tampered';assert.equal(runCardCommand('/VERIFY',{record}).integrity_valid,false);});
test('HTTP investment export resolves numeric assets and retains media',async()=>{const {createMetadataServer}=await import('./server.mjs');const server=createMetadataServer({store:{get:async()=>null},resolveAsset:async asset=>({ledger:{asset,owner:'issuer',supply:'1',divisible:false,locked:true},metadata:{instrument_type:'insurance_policy'},media:{items:[{kind:'pdf',title:'Public policy terms',url:'https://example.com/policy.pdf'}]}})});await new Promise(r=>server.listen(0,'127.0.0.1',r));try{const r=await fetch('http://127.0.0.1:'+server.address().port+'/assets/A123456789012345678/investment-card.json');assert.equal(r.status,200);const j=await r.json();assert.equal(j.payload.classification.type,'insurance_policy');assert.equal(j.payload.media[0].kind,'pdf');assert.equal(j.payload.execution.on_chain_changes,false);}finally{await new Promise(r=>server.close(r));}});


test('standalone Crown metadata route returns the strict NOMNI TokenScan compatibility envelope',async t=>{
  const {createMetadataServer}=await import('./server.mjs');
  const server=createMetadataServer({store:{get:async()=>null},resolveAsset:async()=>{throw Error('no live query required for pinned asset metadata');}});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  t.after(async()=>await new Promise(r=>server.close(r)));
  const base='http://127.0.0.1:'+server.address().port;
  const response=await fetch(base+'/assets/NOMNI/tokenscan.json',{redirect:'manual'});
  assert.equal(response.status,200);
  assert.equal(response.headers.get('location'),null);
  const info=await response.json();
  assert.equal(info.asset,'NOMNI');
  assert.ok(info.description);
  assert.ok(!Object.keys(info).some(key=>!['asset','description','website','image','pgpsig'].includes(key)));
  assert.equal((await fetch(base+'/assets/NOMNI/tokenscan.json',{method:'POST'})).status,405);
});
