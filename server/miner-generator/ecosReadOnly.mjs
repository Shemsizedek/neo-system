import fs from 'node:fs/promises';

const MAX_SNAPSHOT_BYTES = 32768;
const APPROVED_SOURCES = new Set([
  'ECOS_ACCOUNT_APP',
  'ECOS_PERSONAL_ACCOUNT_EXPORT',
  'ECOS_SUPPORT_CONFIRMATION',
]);
const SECRET_KEY = /(password|passphrase|secret|token|cookie|authorization|session|private.?key|seed|mnemonic|otp|2fa)/i;

function finiteNumber(value,{min=-Infinity,max=Infinity,field}={}){
  const n=Number(value);
  if(!Number.isFinite(n) || n<min || n>max) throw new Error(`ECOS_SNAPSHOT_INVALID_${String(field||'NUMBER').toUpperCase()}`);
  return n;
}

function optionalNumber(value,opts){
  if(value===undefined||value===null||value==='') return null;
  return finiteNumber(value,opts);
}

function iso(value,field){
  const t=Date.parse(String(value||''));
  if(!Number.isFinite(t)) throw new Error(`ECOS_SNAPSHOT_INVALID_${field}`);
  return new Date(t).toISOString();
}

function rejectSecrets(value,path='root'){
  if(Array.isArray(value)){ value.forEach((item,i)=>rejectSecrets(item,`${path}[${i}]`)); return; }
  if(!value||typeof value!=='object') return;
  for(const [key,item] of Object.entries(value)){
    if(SECRET_KEY.test(key)) throw new Error('ECOS_SNAPSHOT_SECRET_FIELD_FORBIDDEN');
    rejectSecrets(item,`${path}.${key}`);
  }
}

function safeString(value,max=160){
  if(value===undefined||value===null||value==='') return null;
  const s=String(value).trim();
  if(!s || s.length>max) throw new Error('ECOS_SNAPSHOT_INVALID_STRING');
  return s;
}

export function normalizeEcosSnapshot(input={}, {now=Date.now,maxAgeMs=24*60*60*1000}={}){
  if(!input||typeof input!=='object'||Array.isArray(input)) throw new Error('ECOS_SNAPSHOT_OBJECT_REQUIRED');
  rejectSecrets(input);

  const source=safeString(input.source,64);
  if(!APPROVED_SOURCES.has(source)) throw new Error('ECOS_SNAPSHOT_SOURCE_NOT_APPROVED');

  const observedAt=iso(input.observedAt,'OBSERVED_AT');
  const ageMs=Number(now())-Date.parse(observedAt);
  if(ageMs < -5*60*1000) throw new Error('ECOS_SNAPSHOT_FROM_FUTURE');
  const stale=ageMs>maxAgeMs;

  const account=input.account&&typeof input.account==='object'?input.account:{};
  const contract=input.contract&&typeof input.contract==='object'?input.contract:{};
  const transaction=input.transaction&&typeof input.transaction==='object'?input.transaction:{};

  const totalPowerTh=optionalNumber(account.totalPowerTh,{min:0,max:100000000,field:'TOTAL_POWER_TH'});
  const minedTodayBtc=optionalNumber(account.minedTodayBtc,{min:0,max:21000000,field:'MINED_TODAY_BTC'});
  const minedAllTimeBtc=optionalNumber(account.minedAllTimeBtc,{min:0,max:21000000,field:'MINED_ALL_TIME_BTC'});
  const walletBalanceBtc=optionalNumber(account.walletBalanceBtc,{min:0,max:21000000,field:'WALLET_BALANCE_BTC'});

  const contractId=safeString(contract.contractId,96);
  const contractHashrateTh=optionalNumber(contract.hashrateTh,{min:0,max:100000000,field:'CONTRACT_HASHRATE_TH'});
  const termDays=optionalNumber(contract.termDays,{min:0,max:36500,field:'TERM_DAYS'});
  const contractStatus=safeString(contract.status,48);
  const startAt=contract.startAt?iso(contract.startAt,'CONTRACT_START_AT'):null;
  const endAt=contract.endAt?iso(contract.endAt,'CONTRACT_END_AT'):null;

  const transactionId=safeString(transaction.id,96);
  const transactionType=safeString(transaction.type,96);
  const transactionAmountBtc=optionalNumber(transaction.amountBtc,{min:-21000000,max:21000000,field:'TRANSACTION_AMOUNT_BTC'});
  const transactionOccurredAt=transaction.occurredAt?iso(transaction.occurredAt,'TRANSACTION_OCCURRED_AT'):null;

  const reportedHashrateTh=contractHashrateTh ?? totalPowerTh;
  const contractReportedActive=Boolean(
    reportedHashrateTh>0 &&
    contractStatus &&
    ['ACTIVE','MINING','RUNNING','ENABLED','ONLINE'].includes(contractStatus.toUpperCase())
  );

  return Object.freeze({
    provider:'ECOS',
    source,
    observedAt,
    stale,
    providerApiConnected:false,
    snapshotAvailable:true,
    evidenceClass:'PROVIDER_ACCOUNT_REPORTED',
    contractReportedActive,
    status:contractReportedActive?'CONTRACT_REPORTED_ACTIVE_UNVERIFIED':'ACCOUNT_SNAPSHOT_CAPTURED',
    account:Object.freeze({
      totalPowerTh,
      minedTodayBtc,
      minedAllTimeBtc,
      walletBalanceBtc,
    }),
    contract:Object.freeze({
      contractId,
      status:contractStatus,
      hashrateTh:contractHashrateTh,
      termDays,
      startAt,
      endAt,
    }),
    transaction:Object.freeze({
      id:transactionId,
      type:transactionType,
      amountBtc:transactionAmountBtc,
      occurredAt:transactionOccurredAt,
    }),
    capacity:Object.freeze({
      reportedHashrateTh,
      independentlyVerified:false,
      authoritativeForHashrate:false,
      allocatableHashrateTh:null,
      eligibleForNeoCapacity:false,
      reason:stale?'ECOS_SNAPSHOT_STALE':'ECOS_REPORTED_HASHRATE_NOT_INDEPENDENTLY_VERIFIED',
    }),
    authoritativeForSettlement:false,
    authoritativeForTokenIssuance:false,
    purchasesEnabled:false,
    withdrawalsEnabled:false,
    resaleEnabled:false,
  });
}

export function parseEcosSnapshotJson(raw,options){
  if(typeof raw!=='string') throw new Error('ECOS_SNAPSHOT_JSON_REQUIRED');
  if(Buffer.byteLength(raw)>MAX_SNAPSHOT_BYTES) throw new Error('ECOS_SNAPSHOT_TOO_LARGE');
  if(!raw.trim()) throw new Error('ECOS_SNAPSHOT_JSON_REQUIRED');
  let value;try{value=JSON.parse(raw);}catch{throw new Error('ECOS_SNAPSHOT_JSON_INVALID');}
  return normalizeEcosSnapshot(value,options);
}

export function ecosDevelopmentStatus({env=process.env,now=Date.now}={}){
  if(!env.ECOS_ACCOUNT_SNAPSHOT_JSON) return {
    provider:'ECOS',
    connected:false,
    providerApiConnected:false,
    snapshotAvailable:false,
    status:'ECOS_ACCOUNT_SNAPSHOT_NOT_CONFIGURED',
    purchasesEnabled:false,
    withdrawalsEnabled:false,
    resaleEnabled:false,
    tokenIssuanceEnabled:false,
  };
  try{
    const snapshot=parseEcosSnapshotJson(env.ECOS_ACCOUNT_SNAPSHOT_JSON,{now});
    return {
      provider:'ECOS',
      connected:!snapshot.stale,
      providerApiConnected:false,
      snapshotAvailable:true,
      status:snapshot.status,
      stale:snapshot.stale,
      reportedHashrateTh:snapshot.capacity.reportedHashrateTh,
      eligibleForNeoCapacity:false,
      purchasesEnabled:false,
      withdrawalsEnabled:false,
      resaleEnabled:false,
      tokenIssuanceEnabled:false,
    };
  }catch{
    return {
      provider:'ECOS',
      connected:false,
      providerApiConnected:false,
      snapshotAvailable:false,
      status:'ECOS_ACCOUNT_SNAPSHOT_INVALID',
      purchasesEnabled:false,
      withdrawalsEnabled:false,
      resaleEnabled:false,
      tokenIssuanceEnabled:false,
    };
  }
}

async function main(){
  const file=process.argv[2];
  if(!file) throw new Error('usage: node server/miner-generator/ecosReadOnly.mjs <snapshot.json>');
  const raw=await fs.readFile(file,'utf8');
  console.log(JSON.stringify(parseEcosSnapshotJson(raw),null,2));
}

if(import.meta.url===`file://${process.argv[1]}`) main().catch(error=>{console.error(error.message);process.exitCode=1});
