import crypto from 'node:crypto'

const clone=v=>structuredClone(v)
const now=()=>new Date().toISOString()
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex')

export function createAssetMaster(input={}){
  if(!input.asset_id||!input.issuer_id||!input.asset_type)throw new TypeError('asset_id, issuer_id and asset_type required')
  const record={
    asset_id:String(input.asset_id).toUpperCase(),
    issuer_id:String(input.issuer_id),
    asset_type:String(input.asset_type),
    protocol:input.protocol||null,
    bitcoin_anchor:input.bitcoin_anchor||null,
    counterparty_asset:input.counterparty_asset||null,
    total_authorized:input.total_authorized??null,
    decimals:Number(input.decimals||0),
    status:input.status||'ACTIVE',
    metadata:clone(input.metadata||{}),
    created_at:input.created_at||now()
  }
  return {...record,digest:hash(record)}
}

export function createOwnershipRecord(input={}){
  if(!input.record_id||!input.asset_id||!input.holder_id||!input.layer)throw new TypeError('record_id, asset_id, holder_id and layer required')
  return {
    record_id:String(input.record_id),
    asset_id:String(input.asset_id).toUpperCase(),
    holder_id:String(input.holder_id),
    layer:String(input.layer),
    quantity:Number(input.quantity||0),
    address:input.address||null,
    custody_account_id:input.custody_account_id||null,
    beneficial_owner_id:input.beneficial_owner_id||null,
    evidence_refs:clone(input.evidence_refs||[]),
    status:input.status||'ACTIVE',
    updated_at:input.updated_at||now()
  }
}

export function createCustodyAccount(input={}){
  if(!input.account_id||!input.owner_id||!input.mode)throw new TypeError('account_id, owner_id and mode required')
  const mode=String(input.mode)
  if(!['SELF_CUSTODY','COMMUNITY_CUSTODY','EXTERNAL_CUSTODIAN'].includes(mode))throw new Error('invalid_custody_mode')
  return {
    account_id:String(input.account_id),
    owner_id:String(input.owner_id),
    mode,
    wallet_or_vault_ref:input.wallet_or_vault_ref||null,
    custodian_id:input.custodian_id||null,
    signer_policy:clone(input.signer_policy||{}),
    private_keys_stored:false,
    status:'ACTIVE',
    created_at:now()
  }
}

export function bindDevice(input={}){
  if(!input.binding_id||!input.account_id||!input.device_id||!input.device_type)throw new TypeError('binding_id, account_id, device_id and device_type required')
  return {
    binding_id:String(input.binding_id),
    account_id:String(input.account_id),
    device_id:String(input.device_id),
    device_type:String(input.device_type),
    identity_ref:input.identity_ref||null,
    guardian_policy_ref:input.guardian_policy_ref||null,
    signing_capability:Boolean(input.signing_capability),
    custody_capability:Boolean(input.custody_capability),
    status:'ACTIVE',
    bound_at:now()
  }
}

export function initiateTransfer(input={}){
  if(!input.transfer_id||!input.asset_id||!input.from_holder||!input.to_holder)throw new TypeError('transfer_id, asset_id, from_holder and to_holder required')
  return {
    transfer_id:String(input.transfer_id),
    asset_id:String(input.asset_id).toUpperCase(),
    quantity:Number(input.quantity||0),
    from_holder:String(input.from_holder),
    to_holder:String(input.to_holder),
    from_address:input.from_address||null,
    to_address:input.to_address||null,
    settlement_instruction_id:input.settlement_instruction_id||null,
    signer:input.signer||'EXTERNAL',
    state:'INITIATED',
    evidence_refs:[],
    created_at:now()
  }
}

export function authorizeTransfer(transfer,{ownership,eligible=true,approved=false}={}){
  if(!transfer?.transfer_id)throw new TypeError('transfer required')
  if(!ownership||ownership.asset_id!==transfer.asset_id||ownership.holder_id!==transfer.from_holder)return {...clone(transfer),state:'REJECTED',reason:'ownership_not_verified'}
  if(Number(ownership.quantity)<Number(transfer.quantity))return {...clone(transfer),state:'REJECTED',reason:'insufficient_registered_quantity'}
  if(!eligible)return {...clone(transfer),state:'REJECTED',reason:'eligibility_failed'}
  if(!approved)return {...clone(transfer),state:'ELIGIBILITY_CHECKED',reason:'approval_required'}
  return {...clone(transfer),state:'AUTHORIZED',authorized_at:now()}
}

export function observeTransfer(transfer,{reference,source='COUNTERPARTY',verified=false}={}){
  if(!transfer?.transfer_id||!reference)throw new TypeError('transfer and reference required')
  const evidence={reference:String(reference),source,verified:Boolean(verified),recorded_at:now()}
  return {...clone(transfer),state:verified?'OBSERVED':transfer.state,evidence_refs:[...(transfer.evidence_refs||[]),evidence]}
}

export function updateRegisterAfterTransfer({transfer,fromRecord,toRecord}={}){
  if(transfer?.state!=='OBSERVED'||!transfer.evidence_refs?.some(e=>e.verified))throw new Error('verified_transfer_evidence_required')
  const qty=Number(transfer.quantity)
  if(Number(fromRecord.quantity)<qty)throw new Error('insufficient_registered_quantity')
  return {
    from:{...clone(fromRecord),quantity:Number(fromRecord.quantity)-qty,updated_at:now()},
    to:{...clone(toRecord),quantity:Number(toRecord.quantity)+qty,updated_at:now()},
    transfer:{...clone(transfer),state:'REGISTER_UPDATED',register_updated_at:now()}
  }
}

export function createCorporateAction(input={}){
  if(!input.action_id||!input.asset_id||!input.action_type)throw new TypeError('action_id, asset_id and action_type required')
  return {
    action_id:String(input.action_id),
    asset_id:String(input.asset_id).toUpperCase(),
    action_type:String(input.action_type),
    record_date:input.record_date||null,
    effective_date:input.effective_date||null,
    terms:clone(input.terms||{}),
    evidence_refs:clone(input.evidence_refs||[]),
    status:'ANNOUNCED',
    created_at:now()
  }
}

export function calculateCorporateActionEntitlements({action,holders=[]}={}){
  if(!action)return []
  const total=holders.reduce((n,h)=>n+Number(h.quantity||0),0)
  return holders.map(h=>({
    holder_id:h.holder_id,
    asset_id:h.asset_id,
    quantity:Number(h.quantity||0),
    ratio:total?Number(h.quantity||0)/total:0,
    action_id:action.action_id
  }))
}

export function assetRegistrySnapshot({assets=[],ownership=[],custodyAccounts=[],devices=[],transfers=[],corporateActions=[]}={}){
  return {
    estate:'Global Vast Estate',
    fabric:'NEO Sovereign Asset Depository, Registry and Transfer',
    assets:{total:assets.length,bitcoin_native:assets.filter(x=>['BITCOIN_NATIVE','COUNTERPARTY_ASSET'].includes(x.asset_type)).length},
    ownership:{records:ownership.length,beneficial:ownership.filter(x=>x.beneficial_owner_id).length},
    custody:{accounts:custodyAccounts.length,self_custody:custodyAccounts.filter(x=>x.mode==='SELF_CUSTODY').length},
    devices:{bindings:devices.length,neomask:devices.filter(x=>x.device_type==='NEOMASK').length,etha:devices.filter(x=>String(x.device_type).startsWith('ETHA_')).length},
    transfers:{total:transfers.length,final:transfers.filter(x=>x.state==='FINAL').length,pending:transfers.filter(x=>x.state!=='FINAL'&&x.state!=='REJECTED').length},
    corporate_actions:{total:corporateActions.length},
    authority_boundary:'Community registry/depository functions do not establish statutory securities-depository, transfer-agent, bank-custody, broker-dealer, or governmental authority.',
    generated_at:now()
  }
}
