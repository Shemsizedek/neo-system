import {createCesAdapter} from '../adapters/ces/adapter.mjs';

export const STATEMENT_SERVICE_SCHEMA='neo.statement.service.v1';
const BTC_DEFAULT='https://mempool.space/api';
const XCP_DEFAULT='https://api.counterparty.io:4000/v2';

async function readJson(url,{fetchImpl=fetch,signal}={}){
  const response=await fetchImpl(url,{headers:{accept:'application/json'},signal});
  if(!response.ok)throw new Error(`upstream returned ${response.status}`);
  return response.json();
}

function bitcoinBalance(data,address){
  const funded=Number(data?.chain_stats?.funded_txo_sum||0);
  const spent=Number(data?.chain_stats?.spent_txo_sum||0);
  return {source:'bitcoin',reference:`address:${address}`,unit:'BTC',amount:(funded-spent)/1e8,observedAt:new Date().toISOString(),verificationStatus:'verified',recordType:'balance'};
}

function counterpartyBalances(data,address){
  const rows=Array.isArray(data?.result)?data.result:[];
  return rows.map(row=>({source:'counterparty',reference:`address:${address}:${row.asset}`,unit:String(row.asset),amount:Number(row.quantity_normalized??row.quantity??0),observedAt:new Date().toISOString(),verificationStatus:'verified',recordType:'balance'}));
}

export function createStatementsService(config={}){
  const btcBase=String(config.bitcoinApi||BTC_DEFAULT).replace(/\/$/,'');
  const xcpBase=String(config.counterpartyApi||XCP_DEFAULT).replace(/\/$/,'');
  const fetchImpl=config.fetchImpl||fetch;
  const cesAdapter=config.cesAdapter||createCesAdapter(config.ces||{});

  async function buildPublicStatement({address,cesToken,includeCes=true,signal}={}){
    const account=String(address||'').trim();
    if(!account)throw new Error('address is required');
    const sources={bitcoin:{status:'unavailable',entries:[]},counterparty:{status:'unavailable',entries:[]},ces:{status:'unavailable',entries:[]},offline:{status:'unavailable',entries:[]}};

    const btcTask=readJson(`${btcBase}/address/${encodeURIComponent(account)}`,{fetchImpl,signal})
      .then(data=>{sources.bitcoin={status:'verified',entries:[bitcoinBalance(data,account)]}})
      .catch(error=>{sources.bitcoin={status:'unavailable',entries:[],error:String(error.message||error)}});

    const xcpTask=readJson(`${xcpBase}/addresses/${encodeURIComponent(account)}/balances`,{fetchImpl,signal})
      .then(data=>{sources.counterparty={status:'verified',entries:counterpartyBalances(data,account)}})
      .catch(error=>{sources.counterparty={status:'unavailable',entries:[],error:String(error.message||error)}});

    const cesTask=(includeCes&&cesAdapter.status().configured&&cesToken)
      ? Promise.all([cesAdapter.getBalance({token:cesToken,signal}),cesAdapter.getTransactions({token:cesToken,signal,limit:100})])
          .then(([balance,transactions])=>{sources.ces={status:'verified',entries:[balance,...transactions]}})
          .catch(error=>{sources.ces={status:'unavailable',entries:[],error:String(error.message||error)}})
      : Promise.resolve();

    await Promise.all([btcTask,xcpTask,cesTask]);
    const verifiedSources=Object.values(sources).filter(source=>source.status==='verified').length;
    return {
      schema:STATEMENT_SERVICE_SCHEMA,
      statementSchema:'neo.statement.v1',
      account,
      generatedAt:new Date().toISOString(),
      reconciliationStatus:verifiedSources>=3?'multi-ledger-verified':verifiedSources>0?'partial':'unavailable',
      sources,
      consolidatedTotal:null,
      consolidationPolicy:'No unlike units are summed without an explicit valuation rate, timestamp, and source.'
    };
  }

  function publicStatus(){
    const ces=cesAdapter.status();
    return {schema:STATEMENT_SERVICE_SCHEMA,readOnly:true,bitcoinApiConfigured:Boolean(btcBase),counterpartyApiConfigured:Boolean(xcpBase),ces:{configured:ces.configured,network:ces.network,account:ces.account,readOnly:true}};
  }

  return {buildPublicStatement,publicStatus};
}
