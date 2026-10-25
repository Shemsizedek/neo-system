import test from 'node:test';
import assert from 'node:assert/strict';
import {LAYER3_TYPES,LAYER3_NETWORKS,LAYER3_STYLES,LAYER3_SCHEMA,normalizeShowcaseInput,createLayer3Preview,createLayer3Observed} from './layer3-showcase.mjs';
import {renderLayer3Svg} from './layer3-artwork.mjs';
import {canonicalJson} from './investment-card-engine.mjs';
import {createHash} from 'node:crypto';

const asset='NOMNI';
const stamp='2026-10-25T22:59:10.000Z';
const observed=()=>({
  requested_asset:asset,canonical_asset:asset,observed_at:stamp,metadata_status:'UNAVAILABLE',
  ledger:{asset,asset_longname:null,owner:'18FyntJG9hdXYvanm67mGgbyo1P7adckvg',issuer:'1NySA74g62Mr28Unp4uCxwtQv9FkD7AVpk',supply:'900719925474099312345',divisible:true,locked:true,description:'https://crown.holytemples.org/assets/NOMNI/tokenscan.json'},
  metadata:null,media:{items:[]},blockchain_anchor_verified:false
});
test('actual on-demand observed Counterparty asset is separated from unsupported ownership and backing claims',()=>{
  const result=createLayer3Observed({asset},observed());
  assert.equal(result.payload.schema,LAYER3_SCHEMA);
  assert.equal(result.payload.mode,'OBSERVED_COUNTERPARTY_ASSET');
  assert.equal(result.payload.network,'bitcoin-mainnet');
  assert.equal(result.payload.provenance.ledger_observed,true);
  assert.equal(result.payload.ledger.supply_raw,'900719925474099312345');
  assert.equal(result.payload.ledger.owner,observed().ledger.owner);
  assert.equal(result.payload.classification.type,'unclassified');
  assert.equal(result.payload.provenance.issuer_signature_verified,false);
  assert.equal(result.payload.provenance.bitcoin_anchor_verified,false);
  assert.equal(result.payload.issuance.safe_to_issue,false);
  assert.equal(result.payload.market.price,null);
  assert.equal(result.integrity.blockchain_anchor_verified,false);
  assert.equal(result.integrity.sha256,createHash('sha256').update(canonicalJson(result.payload)).digest('hex'));
});
test('issuer-declared instrument categories are not independent legal or underwriting verification',()=>{
  for(const type of ['bond','shares','insurance_policy','real_estate','private_equity','currency','utility','nft','investment_pool']){
    const data=observed();data.metadata_status='RESOLVED';data.metadata={instrument_type:type,description:'Issuer claims a contract exists.',projected_roi:'99.9'};
    const result=createLayer3Observed({asset},data);
    assert.equal(result.payload.classification.type,type);
    assert.equal(result.payload.classification.status,'ISSUER_DECLARED');
    assert.equal(result.payload.classification.legal_classification_verified,false);
    assert.equal(result.payload.instrument.reported_metrics_status.projected_roi,'REQUIRES VERIFICATION');
    assert.equal(result.payload.instrument.financial_figures_verified,false);
    assert.equal(result.payload.market.price,null);
  }
});
test('all 18 supported instrument types have immediate deterministic unissued design cards',()=>{
  assert.ok(LAYER3_TYPES.length>=17);
  for(const type of LAYER3_TYPES){
    const one=createLayer3Preview({asset:'NEOASSET',instrumentType:type,title:'Proposed Crown Instrument',style:'auto'});
    const two=createLayer3Preview({asset:'NEOASSET',instrumentType:type,title:'Proposed Crown Instrument',style:'auto'});
    assert.equal(one.payload.mode,'UNISSUED_DESIGN_PREVIEW');
    assert.equal(one.payload.asset,'NEOASSET');
    assert.equal(one.payload.ledger.asset,null);
    assert.equal(one.payload.ledger.owner,null);
    assert.equal(one.payload.classification.status,'USER_SELECTED_PREVIEW_STYLE');
    assert.equal(one.payload.provenance.ledger_observed,false);
    assert.equal(one.payload.issuance.safe_to_issue,false);
    assert.equal(one.integrity.sha256,two.integrity.sha256);
    const svg=renderLayer3Svg(one,{face:'front'});
    assert.match(svg,/NEO CROWN|C R O W N/);
    assert.match(svg,/UNISSUED/);
    assert.match(svg,/NOT PROOF OF RIGHTS/);
    assert.doesNotMatch(svg,/<script|<foreignObject|https?:\/\/[^"]+(?:href|src)/i);
  }
});
test('Bitcoin protocols beyond Counterparty support design previews but not fabricated chain observations',()=>{
  for(const network of LAYER3_NETWORKS){
    const record=createLayer3Preview({asset:'PROPOSED',instrumentType:'note',network});
    assert.equal(record.payload.protocol,network);
    assert.equal(record.payload.provenance.ledger_observed,false);
  }
  for(const network of ['runes','ordinals','taproot','other-bitcoin']){
    assert.throws(()=>normalizeShowcaseInput({asset,network,mode:'observed'}),/unavailable_chain_observer/);
  }
});
test('unsafe or imprecise ledger supply remains null and not a fabricated count',()=>{
  const input=observed();input.ledger.supply=9007199254740999;
  const record=createLayer3Observed({asset},input);
  assert.equal(record.payload.ledger.supply_raw,null);
  assert.match(renderLayer3Svg(record),/NOT VERIFIED/);
});
test('malicious issuer labels and bad strings never become executable SVG or markup',()=>{
  const input=observed();input.metadata={instrument_type:'bond',card_data:{primary_title:'<script>alert("x")</script> & More'}};
  const record=createLayer3Observed({asset},input);
  const svg=renderLayer3Svg(record);
  assert.doesNotMatch(svg,/<script|onload\s*=|<iframe|<foreignObject/i);
  assert.match(svg,/&lt;script&gt;/);
  assert.doesNotMatch(svg,/href="https?:\/\//);
  assert.match(renderLayer3Svg(record,{face:'back'}),/PROVENANCE/);
});
test('SVG export is stable and supports different selected finishes',()=>{
  const cards=LAYER3_STYLES.map(style=>createLayer3Preview({asset:'DEMO',instrumentType:'nft',style}));
  const output=cards.map(card=>renderLayer3Svg(card));
  assert.equal(new Set(output).size,output.length);
  assert.match(output[0],/viewBox="0 0 720 1040"/);
  assert.ok(output.every(xml=>xml.startsWith('<?xml version="1.0"')));
  assert.throws(()=>renderLayer3Svg(cards[0],{face:'invalid'}),/invalid_card_face/);
  assert.throws(()=>renderLayer3Svg({payload:{schema:'unknown'}}),/invalid_layer3_card/);
});
test('bad instrument names and path traversals are rejected before any lookup',()=>{
  for(const bad of ['../NOMNI','./NOMNI','NOMNI..BACKUP','bad/asset','😀','']){
    assert.throws(()=>normalizeShowcaseInput({asset:bad}),/invalid_asset/);
  }
  assert.throws(()=>normalizeShowcaseInput({asset,mode:'something'}),/invalid_mode/);
  assert.throws(()=>normalizeShowcaseInput({asset,instrumentType:'security_verified'}),/unsupported_instrument_type/);
  assert.throws(()=>normalizeShowcaseInput({asset,style:'javascript:evil'}),/unsupported_card_finish/);
});
test('no missing or mismatched live ledger may be represented as an observed issued asset',()=>{
  assert.throws(()=>createLayer3Observed({asset},{}),/counterparty_ledger_not_observed/);
  assert.throws(()=>createLayer3Observed({asset}, {...observed(),ledger:{...observed().ledger,asset:'NOTNOMNI'}}),/counterparty_asset_identity_mismatch/);
  assert.throws(()=>createLayer3Observed({asset}, {...observed(),observed_at:null}),/counterparty_ledger_not_observed/);
});


test('sensitive insurance claimant and policyholder descriptions are excluded from public art and JSON',()=>{
  const raw=observed();
  raw.metadata={instrument_type:'insurance_claim',card_data:{primary_title:'Private Person Claim Docket'},description:'Private Person health condition and claimant identifying details'};
  const record=createLayer3Observed({asset},raw);
  assert.equal(record.payload.classification.type,'insurance_claim');
  assert.equal(record.payload.display_title,asset);
  assert.doesNotMatch(JSON.stringify(record),/Private Person|health condition|Claim Docket/);
  assert.match(record.payload.instrument.description,/intentionally omitted/);
  assert.doesNotMatch(renderLayer3Svg(record),/Private Person/);
});
