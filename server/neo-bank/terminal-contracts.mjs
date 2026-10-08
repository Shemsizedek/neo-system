// NEOB-003: read-only terminal contracts. Ledger balances are not synthesized from CES credits.
export const VALUE_UNITS=Object.freeze([
  {unit:'CES_NMNI',label:'CES Mutual Credit',source:'ces',status:'unverified'},
  {unit:'VDOLLAR',label:'V-Dollars',source:'neo-vdollar',status:'unverified'},
  {unit:'TIME_HOUR',label:'Time Equity (hours)',source:'neo-time-equity',status:'unverified'},
  {unit:'NOMNI',label:'Counterparty NOMNI',source:'counterparty',status:'unverified'},
  {unit:'BTC',label:'Bitcoin',source:'bitcoin',status:'unverified'},
  {unit:'XCP',label:'Counterparty XCP',source:'counterparty',status:'unverified'}
]);
export function nmniAlias(value){
  if(typeof value!=='string'||!/^NMNI[0-9]{4,}$/.test(value))throw new Error('invalid_nmni_account');
  return 'NEO:'+value;
}
export function terminalCapabilities(role){
  return {mode:'READ_ONLY',actions:{overview:true,activity:true,customerRelations:'planned',teller:'existing-service',conversions:'disabled',offchainEvidence:'disabled'},role:role==='executive-admin'?'executive-admin':'member'};
}
export function terminalOverview(account){
  return {account:{accountNumber:account.accountNumber,displayName:account.displayName,role:account.role,status:account.status},
    routingAlias:/^NMNI[0-9]{4,}$/.test(account.accountNumber)?nmniAlias(account.accountNumber):null,
    ces:{unit:'CES_NMNI',balance:account.balance==null?null:String(account.balance),source:'neo-bank-internal-ledger',externalCesVerified:false},
    instruments:VALUE_UNITS.filter(x=>x.unit!=='CES_NMNI').map(x=>({...x,balance:null,asOf:null})),
    chain:{mode:'off-chain-evidence-planned',bitcoinSettlement:false,counterpartySettlement:false}};
}
