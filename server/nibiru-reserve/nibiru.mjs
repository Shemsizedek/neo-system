import crypto from 'node:crypto';
import {createCesAdapter} from '../../apps/neoscan/adapters/ces/adapter.mjs';
import {createReserveLedger} from './ledger.mjs';
import {NIBIRU_ISO_PROFILE,renderPain001,validatePain001Structure} from './iso20022.mjs';

const clean=value=>String(value??'').trim();
const positive=value=>{const amount=Number(value);if(!Number.isFinite(amount)||amount<=0)throw new Error('amount must be positive');return amount};
const currency=value=>{const code=clean(value).toUpperCase();if(!/^[A-Z]{3}$/.test(code))throw new Error('currency must be a three-letter code');return code};

export function createNibiruReserve({now=()=>new Date().toISOString(),cesAdapter=null,ledger=createReserveLedger({now})}={}) {
  const reserveEntries=new Map();
  const messages=new Map();

  function recordCesPosition(input) {
    for(const key of ['cesExchangeId','cesAccountId','unit','externalReference']) if(!clean(input[key])) throw new Error(`${key} is required`);
    const amount=positive(input.amount);
    const entry={
      id:crypto.randomUUID(),type:'CES_POSITION_OBSERVATION',cesExchangeId:clean(input.cesExchangeId),
      cesAccountId:clean(input.cesAccountId),unit:clean(input.unit).toUpperCase(),amount,
      externalReference:clean(input.externalReference),observedAt:now(),status:'UNVERIFIED',
      legalTenderClaim:false,reserveAsset:false,redeemability:'NOT_ESTABLISHED',
      blockchainSettlement:null
    };
    reserveEntries.set(entry.id,entry);return entry;
  }

  function linkBlockchainSettlement(id,input) {
    const entry=reserveEntries.get(id);if(!entry)return null;
    for(const key of ['network','txHash','asset']) if(!clean(input[key]))throw new Error(`${key} is required`);
    entry.blockchainSettlement={network:clean(input.network).toUpperCase(),txHash:clean(input.txHash),asset:clean(input.asset).toUpperCase(),quantity:clean(input.quantity),confirmations:Number(input.confirmations||0),status:'OBSERVED'};
    entry.status='LINKED_NOT_RECONCILED';return entry;
  }

  function createIsoPaymentEnvelope(input) {
    for(const key of ['messageId','debtorName','debtorAccount','creditorName','creditorAccount','purpose','endToEndId']) if(!clean(input[key]))throw new Error(`${key} is required`);
    const amount=positive(input.amount),ccy=currency(input.currency);
    const record={
      id:crypto.randomUUID(),standard:'ISO 20022',alignment:'CANONICAL_DATA_MODEL',
      messageDefinition:clean(input.messageDefinition||NIBIRU_ISO_PROFILE.messageDefinition),messageId:clean(input.messageId),
      creationDateTime:now(),payment:{endToEndId:clean(input.endToEndId),amount:{value:amount,currency:ccy},purpose:clean(input.purpose),remittanceInformation:clean(input.remittanceInformation)},
      parties:{debtor:{name:clean(input.debtorName),account:clean(input.debtorAccount)},creditor:{name:clean(input.creditorName),account:clean(input.creditorAccount)}},
      digitalAssetContext:input.digitalAssetContext?{
        network:clean(input.digitalAssetContext.network).toUpperCase(),asset:clean(input.digitalAssetContext.asset).toUpperCase(),
        address:clean(input.digitalAssetContext.address),txHash:clean(input.digitalAssetContext.txHash)
      }:null,
      compliance:{kycStatus:'NOT_CHECKED',sanctionsStatus:'NOT_CHECKED',travelRuleStatus:'NOT_CHECKED'},
      validation:{isoSchemaValidated:false,railProfileValidated:false,transmissionAuthorized:false},
      status:'DRAFT'
    };
    messages.set(record.id,record);return record;
  }

  function renderIsoPayment(id){
    const record=messages.get(id);if(!record)return null;
    const document=renderPain001(record);const structuralValidation=validatePain001Structure(document);
    return{messageId:record.id,profile:NIBIRU_ISO_PROFILE,document,structuralValidation,transmissionAuthorized:false};
  }

  async function syncCes({token,signal}={}){
    if(!cesAdapter)throw new Error('CES adapter is not connected');
    const balance=await cesAdapter.getBalance({token,signal});
    const entry=recordCesPosition({cesExchangeId:balance.network||'CES',cesAccountId:balance.account,unit:balance.unit,amount:Math.abs(balance.amount),externalReference:balance.reference});
    entry.status='CES_VERIFIED';entry.observedAt=balance.observedAt;
    const journal=ledger.postCesObservation(entry);
    return{entry,journal,adapter:cesAdapter.status()};
  }

  function connectCes(config){return createNibiruReserve({now,cesAdapter:createCesAdapter(config),ledger})}

  function reserveSnapshot() {
    const rows=[...reserveEntries.values()];
    const totals={};
    for(const row of rows) totals[row.unit]=Number(((totals[row.unit]||0)+row.amount).toFixed(8));
    return {service:'nibiru-reserve',generatedAt:now(),positions:rows.length,totals,attestation:'NONE',liabilitiesRecognized:false,warning:'CES positions are accounting observations, not bank deposits, legal tender, or proven reserves.'};
  }

  function capabilities(){return{
    service:'nibiru-reserve-system',release:'ORIGIN_SANDBOX',
    components:['neo-tokenworks','neo-banks','ces-port','bitcoin-counterparty-adapter','iso-20022-translation'],
    ces:{positionObservation:true,writeback:false,liveAdapterConnected:false},
    blockchain:{settlementLink:true,compose:false,sign:false,broadcast:false},
    iso20022:{canonicalModel:true,messageDefinition:NIBIRU_ISO_PROFILE.messageDefinition,xmlGeneration:true,structureValidation:true,officialXsdValidation:false,swiftConnected:false,fednowConnected:false,fedwireConnected:false},
    custody:false,bankingAuthority:false
  }}

  return{recordCesPosition,linkBlockchainSettlement,createIsoPaymentEnvelope,renderIsoPayment,syncCes,connectCes,reserveSnapshot,capabilities,reserveEntries,messages,ledger};
}
