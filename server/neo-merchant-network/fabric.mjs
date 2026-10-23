import crypto from 'node:crypto'
const clone=v=>structuredClone(v)
const now=()=>new Date().toISOString()

export function createMerchant(input={}){
  if(!input.merchant_id||!input.name)throw new TypeError('merchant_id and name required')
  return {merchant_id:String(input.merchant_id),name:String(input.name),status:input.status||'ACTIVE',settlement_preferences:clone(input.settlement_preferences||{}),created_at:now()}
}

export function registerDevice(input={}){
  if(!input.device_id||!input.merchant_id||!input.device_type)throw new TypeError('device_id, merchant_id and device_type required')
  return {
    device_id:String(input.device_id),
    merchant_id:String(input.merchant_id),
    device_type:String(input.device_type),
    terminal_id:input.terminal_id||null,
    identity_ref:input.identity_ref||null,
    signer_binding_id:input.signer_binding_id||null,
    vault_binding_id:input.vault_binding_id||null,
    capabilities:[...new Set(input.capabilities||[])],
    private_key_storage:false,
    status:'ACTIVE',
    registered_at:now()
  }
}

export function createPaymentIntent(input={}){
  if(!input.intent_id||!input.merchant_id||!input.amount||!input.asset)throw new TypeError('intent_id, merchant_id, amount and asset required')
  const amount=Number(input.amount)
  if(!Number.isFinite(amount)||amount<=0)throw new Error('invalid_amount')
  return {
    intent_id:String(input.intent_id),
    merchant_id:String(input.merchant_id),
    terminal_id:input.terminal_id||null,
    device_id:input.device_id||null,
    asset:String(input.asset).toUpperCase(),
    amount,
    display_currency:input.display_currency||null,
    display_amount:input.display_amount==null?null:Number(input.display_amount),
    destination:input.destination||null,
    counterparty_asset:input.counterparty_asset||null,
    state:'CREATED',
    signer:'NEOMASK_OR_PAIRED_SIGNER',
    created_at:now()
  }
}

export function reviewPaymentIntent(intent,{guardian,assetRecord,device}={}){
  const reasons=[]
  if(!device||device.status!=='ACTIVE')reasons.push('device_unavailable')
  if(!guardian?.allowed)reasons.push('guardian_block')
  if(['COUNTERPARTY_ASSET','NOMNI','XCP'].includes(intent.asset)&&!assetRecord)reasons.push('asset_registry_missing')
  return {...clone(intent),state:reasons.length?'BLOCKED':'READY_FOR_SIGNATURE',review:{allowed:reasons.length===0,reasons}}
}

export function attachSignature(intent,{signature_ref,signer_id}={}){
  if(intent?.state!=='READY_FOR_SIGNATURE')throw new Error('payment_not_ready_for_signature')
  if(!signature_ref||!signer_id)throw new TypeError('signature_ref and signer_id required')
  return {...clone(intent),state:'SIGNED',signature_ref:String(signature_ref),signer_id:String(signer_id),signed_at:now()}
}

export function createSettlementHandoff(intent,{instruction_id}={}){
  if(intent?.state!=='SIGNED')throw new Error('signed_payment_required')
  if(!instruction_id)throw new TypeError('instruction_id required')
  return {...clone(intent),state:'SUBMITTED_TO_CLEARING',settlement_instruction_id:String(instruction_id),submitted_at:now()}
}

export function finalizeMerchantPayment(intent,{settlementFinal=false,registryUpdated=false,settlementEvidenceRef=null,registryEvidenceRef=null}={}){
  if(intent?.state!=='SUBMITTED_TO_CLEARING')throw new Error('clearing_submission_required')
  if(!settlementFinal)return {...clone(intent),state:'PENDING_SETTLEMENT'}
  if(['COUNTERPARTY_ASSET','NOMNI','XCP'].includes(intent.asset)&&!registryUpdated)return {...clone(intent),state:'PENDING_REGISTER_UPDATE'}
  return {...clone(intent),state:'FINAL',settlement_evidence_ref:settlementEvidenceRef,registry_evidence_ref:registryEvidenceRef,finalized_at:now()}
}

export function createAssetAwareReceipt({payment,merchant,device,items=[]}={}){
  if(payment?.state!=='FINAL')throw new Error('final_payment_required')
  if(!merchant)throw new TypeError('merchant required')
  const record={
    receipt_id:`RCT-${crypto.randomUUID()}`,
    merchant_id:merchant.merchant_id,
    merchant_name:merchant.name,
    terminal_id:payment.terminal_id||device?.terminal_id||null,
    device_id:payment.device_id||device?.device_id||null,
    payment:{intent_id:payment.intent_id,asset:payment.asset,amount:payment.amount,counterparty_asset:payment.counterparty_asset||null},
    items:clone(items),
    settlement_evidence_ref:payment.settlement_evidence_ref||null,
    registry_evidence_ref:payment.registry_evidence_ref||null,
    issued_at:now()
  }
  return record
}

export function merchantNetworkSnapshot({merchants=[],devices=[],intents=[],receipts=[]}={}){
  return {
    estate:'Global Vast Estate',
    fabric:'NEO Counter + ETHA Universal Merchant & Device Network',
    merchants:{total:merchants.length,active:merchants.filter(x=>x.status==='ACTIVE').length},
    devices:{total:devices.length,active:devices.filter(x=>x.status==='ACTIVE').length,etha:devices.filter(x=>String(x.device_type).startsWith('ETHA_')).length,vaults:devices.filter(x=>String(x.device_type).includes('VAULT')).length},
    payments:{total:intents.length,final:intents.filter(x=>x.state==='FINAL').length,pending:intents.filter(x=>!['FINAL','BLOCKED'].includes(x.state)).length,blocked:intents.filter(x=>x.state==='BLOCKED').length},
    receipts:receipts.length,
    private_keys_at_terminal:false,
    generated_at:now()
  }
}
