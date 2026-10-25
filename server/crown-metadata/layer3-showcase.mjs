import {createHash} from 'node:crypto';
import {buildShowcase} from './showcase-intelligence-v1.mjs';
import {buildInvestmentCard,GENRES,canonicalJson} from './investment-card-engine.mjs';

// NEO Crown Layer 3 is a presentation layer. It does not issue assets, verify legal rights or execute Bitcoin transactions.
export const LAYER3_SCHEMA='NEO-CROWN-LAYER3-SHOWCASE-V1';
export const LAYER3_TYPES=Object.freeze(Object.keys(GENRES));
export const LAYER3_NETWORKS=Object.freeze(['counterparty','runes','ordinals','taproot','other-bitcoin']);
export const LAYER3_STYLES=Object.freeze(['auto','aurum','emerald','azurite','violet','copper']);

const sha=s=>createHash('sha256').update(s,'utf8').digest('hex');
const validAsset=value=>typeof value==='string'&&/^[A-Za-z0-9_.-]{1,255}$/.test(value)&&!value.startsWith('.')&&!value.endsWith('.')&&!value.includes('..');
const display=(value,max=72)=>typeof value==='string'?Array.from(value.trim().replace(/[\u0000-\u001f\u007f]/g,' ')).slice(0,max).join(''):'';
const exactRaw=value=>{
  if(typeof value==='string'&&/^\d{1,100}$/.test(value))return value;
  if(typeof value==='number'&&Number.isSafeInteger(value)&&value>=0)return String(value);
  return null;
};
function kind(type){
  if(!LAYER3_TYPES.includes(type))throw Error('unsupported_instrument_type');
  return type;
}
function finish(style){
  if(!LAYER3_STYLES.includes(style))throw Error('unsupported_card_finish');
  return style;
}
export function normalizeShowcaseInput({asset,mode='observed',instrumentType='unclassified',network='counterparty',title='',style='auto'}={}){
  if(!validAsset(asset))throw Error('invalid_asset');
  if(!['observed','preview'].includes(mode))throw Error('invalid_mode');
  if(!LAYER3_NETWORKS.includes(network))throw Error('unsupported_bitcoin_protocol');
  if(mode==='observed'&&network!=='counterparty')throw Error('unavailable_chain_observer_for_protocol');
  if(mode==='preview'&&!display(title,90)&&title)throw Error('invalid_title');
  return {asset,mode,instrumentType:kind(instrumentType),network,title:display(title,70),style:finish(style)};
}
function template({asset,mode,classification,title,network,style,ledger,showcase=null,investment=null,metadataStatus='NOT_OBSERVED',observedAt=null,metadataUrl=null,metadataHash=null,provenance={}}){
  const observed=mode==='observed';
  const canonicalAsset=ledger?.asset||asset;
  const id='NEO-L3-'+sha(network+':'+canonicalAsset+(observed?'':':PREVIEW:'+classification.type)).slice(0,24).toUpperCase();
  const record={
    schema:LAYER3_SCHEMA,version:'1.0.0',presentation_layer:'NEO Crown Chain / Layer 3',
    card_id:id,asset:canonicalAsset,asset_longname:ledger?.asset_longname||null,
    display_title:title||ledger?.asset_longname||asset,
    mode:observed?'OBSERVED_COUNTERPARTY_ASSET':'UNISSUED_DESIGN_PREVIEW',
    network:observed?'bitcoin-mainnet':'bitcoin-design-preview',protocol:network,
    classification:{
      type:classification.type,label:classification.label,
      status:observed?classification.status:'USER_SELECTED_PREVIEW_STYLE',
      basis:observed?classification.basis:'Presentation category chosen for an unsigned draft',
      supporting_evidence:observed?classification.evidence:null,
      legal_classification_verified:false
    },
    style,
    ledger:{
      asset:observed?canonicalAsset:null,owner:observed?ledger.owner||null:null,
      issuer:observed?ledger.issuer||null:null,
      supply_raw:observed?exactRaw(ledger.supply):null,
      divisible:observed?ledger.divisible??null:null,
      locked:observed?ledger.locked??null:null,
      observed_at:observed?observedAt:null
    },
    instrument:{
      terms_status:observed?showcase?.instrument_terms?.status||'NOT_PROVIDED':'DRAFT_NOT_PROVIDED',
      declared_rights_verified:false,underwriter_verified:false,
      contract_enforceability_verified:false,
      description:observed
        ?(['insurance_policy','insurance_claim'].includes(classification.type)
          ?'Public Counterparty insurance-related instrument presentation. Private insured, beneficiary, policyholder and claimant details are intentionally omitted.'
          :display(showcase?.professional_description?.text||'',450))
        :'Unissued design preview for a proposed '+classification.label.toLowerCase()+'. No token issuance or legal rights are established by this card.',
      issuer_narrative_status:observed?'ISSUER_DESCRIPTION_UNVERIFIED':'DRAFT_DESIGN_ONLY',
      financial_figures_verified:false
    },
    provenance:{
      ledger_observed:observed,
      ledger_source:observed?'https://api.counterparty.io:4000/v2/assets/'+encodeURIComponent(canonicalAsset):null,
      observation_at:observed?observedAt:null,
      metadata_status:metadataStatus,
      metadata_url:observed?metadataUrl:null,
      metadata_sha256:observed?metadataHash:null,
      issuer_signature_verified:false,issuer_control_verified:false,
      issuance_transaction_verified:false,bitcoin_anchor_verified:false,
      asset_title_verified:false,collateral_or_reserves_verified:false,
      ...provenance
    },
    market:{price:null,currency:null,valuation_verified:false,quote_verified:false},
    issuance:{signing_performed:false,broadcast_performed:false,supply_changed:false,safe_to_issue:false},
    artwork:{medium:'deterministic_off_chain_svg',image_generation_api_invoked:false,not_token_or_certificate:true},
    disclosures:[
      observed?'Public Counterparty asset observed; issuance transaction and wallet control not independently verified.':'Design preview only. Asset issuance, ownership and chain existence not verified.',
      'Issuer-linked classification and contractual rights require separate legal and documentary review.',
      'This artwork is not proof of reserve backing, collateral, investment returns, title or token uniqueness.'
    ]
  };
  if(observed&&investment){
    // Value fields remain structured, source-attributed claims and are NEVER visualized as proven financial facts.
    record.instrument.reported_metrics_status=Object.fromEntries(
      Object.entries(investment.card_data.financial_metrics)
        .map(([name,metric])=>[name,metric.status])
    );
  }
  const integrity={algorithm:'SHA-256',sha256:sha(canonicalJson(record)),encoding:'recursively-sorted-key UTF-8 JSON',blockchain_anchor_verified:false,issuer_signature_verified:false};
  return {payload:record,integrity};
}
export function createLayer3Preview(input){
  const request=normalizeShowcaseInput({...input,mode:'preview'});
  const category=GENRES[request.instrumentType];
  return template({
    ...request,classification:{
      type:request.instrumentType,label:category[0],status:'USER_SELECTED_PREVIEW_STYLE',
      basis:'Only a design category has been selected; no legal instrument was verified',evidence:null
    },
    ledger:null,metadataStatus:'NOT_PROVIDED'
  });
}
export function createLayer3Observed(input,resolved){
  const request=normalizeShowcaseInput({...input,mode:'observed'});
  if(!resolved||typeof resolved!=='object'||!resolved.ledger||!validAsset(resolved.ledger.asset)||!resolved.observed_at||!Number.isFinite(Date.parse(resolved.observed_at)))throw Error('counterparty_ledger_not_observed');
  const ledger={...resolved.ledger,supply:exactRaw(resolved.ledger.supply)};
  if(request.asset!==ledger.asset&&request.asset!==ledger.asset_longname)throw Error('counterparty_asset_identity_mismatch');
  const observed={...resolved,ledger};
  const showcase=buildShowcase(ledger.asset,observed);
  const investment=buildInvestmentCard(ledger.asset,observed).payload;
  return template({
    ...request,asset:ledger.asset,classification:investment.classification,
    title:['insurance_policy','insurance_claim'].includes(investment.classification.type)?ledger.asset:investment.card_data.primary_title,ledger,showcase,investment,
    metadataStatus:resolved.metadata_status||'NO_POINTER',
    observedAt:resolved.observed_at,metadataUrl:resolved.metadata_url||null,metadataHash:resolved.metadata_sha256||null,
    provenance:{issuer_description_current:typeof ledger.description==='string'&&ledger.description.length<=255?ledger.description:null}
  });
}
