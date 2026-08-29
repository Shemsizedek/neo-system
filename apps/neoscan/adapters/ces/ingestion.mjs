export const CES_INGESTION_SCHEMA='neo.ces.ingestion.v1';

function clean(value){return String(value??'').trim();}
function finite(value){const n=Number(value);return Number.isFinite(n)?n:null;}

export function normalizeCesSnapshot(input={}){
  const account=clean(input.account);
  const network=clean(input.network)||null;
  const observedAt=clean(input.observedAt||input.timestamp||new Date().toISOString());
  if(!account)throw new Error('CES snapshot account is required');

  const balances=(Array.isArray(input.balances)?input.balances:[]).map((row,index)=>{
    const unit=clean(row.unit??row.currency??row.asset);
    const amount=finite(row.amount??row.balance??row.quantity);
    if(!unit||amount===null)throw new Error(`CES balance ${index} is invalid`);
    return {source:'ces',recordType:'balance',reference:clean(row.reference??row.id??`snapshot:${account}:${unit}`),unit,amount,observedAt:clean(row.observedAt??row.timestamp??observedAt),verificationStatus:'imported',network,account};
  });

  const transactions=(Array.isArray(input.transactions)?input.transactions:[]).map((row,index)=>{
    const reference=clean(row.reference??row.id??row.transaction_id);
    const unit=clean(row.unit??row.currency??row.asset);
    const amount=finite(row.amount??row.quantity??row.value);
    const txObservedAt=clean(row.observedAt??row.timestamp??row.created_at??observedAt);
    if(!reference||!unit||amount===null||!txObservedAt)throw new Error(`CES transaction ${index} is invalid`);
    return {source:'ces',recordType:'transaction',reference,unit,amount,observedAt:txObservedAt,verificationStatus:'imported',network,account};
  });

  return {schema:CES_INGESTION_SCHEMA,source:'ces',readOnly:true,account,network,observedAt,balances,transactions,provenance:{method:clean(input.provenance?.method)||'authorized-export',reference:clean(input.provenance?.reference)||null}};
}

export function createCesIngestionStore(){
  let snapshot=null;
  return {
    ingest(input){snapshot=normalizeCesSnapshot(input);return snapshot;},
    current(){return snapshot;},
    status(){return {schema:CES_INGESTION_SCHEMA,readOnly:true,loaded:Boolean(snapshot),account:snapshot?.account||null,network:snapshot?.network||null,observedAt:snapshot?.observedAt||null};}
  };
}
