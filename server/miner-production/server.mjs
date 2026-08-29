import http from 'node:http'
import crypto from 'node:crypto'
import {evaluateProductionReadiness,buildProductionHealthSnapshot,assertLiveContractActivation} from './readiness.mjs'
import {collectLiveProbe} from './liveClients.mjs'
import {liveProviderSnapshot} from './providers.mjs'
import {createContract,confirmPayment,reserveCapacity,activateContract,markSettlementPending,settleContract} from './contracts.mjs'
import {createInfrastructureRecord,markInfrastructureVerified,onboardingSummary} from './onboarding.mjs'
import {createEnrollmentChallenge,verifyEnrollmentChallenge,enrollMiner,registerTelemetry,verifyStratumShare,applyShareResult,fleetSnapshot} from './fleet.mjs'
import {reconcilePoolPayout,createHashVaultCredit,hashVaultSnapshot,assertNoDuplicateCredit} from './hashvault.mjs'
import {createPayoutRequest,approvePayout,markBroadcast,confirmPayout,createSettlementReceipt,publicReceipt} from './payouts.mjs'
import {treasuryPolicy,evaluateTreasuryPayout,buildUnsignedPayout,assertExternalSignerResult,coldReserveAction} from './treasury.mjs'
import {bitcoinRpcClient,createPayoutPsbt,exportSignerEnvelope,finalizeSignedPsbt,broadcastFinalizedTransaction,transactionStatus} from './bitcoinWallet.mjs'
import {PersistentStateStore,hydrateMap} from './persistentStore.mjs'

const PORT=Number(process.env.PORT||8890)
const API_TOKEN=process.env.NEO_MINER_API_TOKEN||''
const state=new PersistentStateStore(process.env.NEO_MINER_DB_PATH||'./data/neo-miner.sqlite')
const contracts=hydrateMap(state,'contract')
const verifiedShares=hydrateMap(state,'verified_share',v=>v.shareId)
const payoutReconciliations=hydrateMap(state,'payout_reconciliation',v=>v.payoutId)
const payoutRequests=hydrateMap(state,'payout')
const receipts=hydrateMap(state,'receipt',v=>v.receiptId)
const signingIntents=hydrateMap(state,'signing_intent',v=>v.intentId)
const signedTransactions=hydrateMap(state,'signed_transaction',v=>v.intentId)
const psbts=hydrateMap(state,'psbt',v=>v.psbtId)
const finalizedTransactions=hydrateMap(state,'finalized_transaction',v=>v.psbtId)
const hashVaultEntries=state.list('hashvault_entry')
const infrastructure=new Map(),challenges=new Map(),fleet=new Map()

function configFromEnv(){return {bitcoin:{enabled:process.env.BITCOIN_ENABLED==='true',rpcUrl:process.env.BITCOIN_RPC_URL,secretRef:process.env.BITCOIN_RPC_AUTH?'env://BITCOIN_RPC_AUTH':'',auth:process.env.BITCOIN_RPC_AUTH},counterparty:{enabled:process.env.COUNTERPARTY_ENABLED==='true',apiUrl:process.env.COUNTERPARTY_API_URL},pool:{enabled:process.env.MINING_POOL_ENABLED==='true',endpoint:process.env.MINING_POOL_ENDPOINT},miners:{enabled:process.env.MINER_AGENTS_ENABLED==='true',verifiedAgentCount:fleetSnapshot([...fleet.values()]).verifiedIdentities||Number(process.env.VERIFIED_MINER_AGENTS||0)},fx:{enabled:process.env.FX_ENABLED==='true',apiUrl:process.env.FX_API_URL,source:process.env.FX_SOURCE,apiKey:process.env.FX_API_KEY,base:process.env.FX_BASE||'USD',quote:process.env.FX_PROBE_QUOTE||'EUR'},payments:{enabled:process.env.PAYMENTS_ENABLED==='true',provider:process.env.PAYMENT_PROVIDER,secretRef:process.env.PAYMENT_PROVIDER_SECRET?'env://PAYMENT_PROVIDER_SECRET':'',webhookSignatureVerification:process.env.PAYMENT_WEBHOOK_VERIFY==='true'},storage:{contracts:'PERSISTENT',settlements:'PERSISTENT'},compliance:{enabled:process.env.COMPLIANCE_ENABLED==='true',activationPolicy:process.env.COMPLIANCE_POLICY||'FAIL_CLOSED'}}}
async function runtimeReadiness(){const config=configFromEnv();const configured=evaluateProductionReadiness(config);if(!configured.ready)return {...configured,liveProbe:null};const liveProbe=await collectLiveProbe(config);if(!liveProbe.ok)return {...configured,ready:false,mode:'BLOCKED',missing:[...configured.missing,'live_probe'],liveProbe};return {...configured,liveProbe}}
const json=(res,status,body)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store','access-control-allow-origin':process.env.CORS_ORIGIN||'https://shemsizedek.github.io'});res.end(JSON.stringify(body))}
const authorized=req=>Boolean(API_TOKEN)&&req.headers.authorization===`Bearer ${API_TOKEN}`
const readBody=req=>new Promise((resolve,reject)=>{let raw='';req.on('data',c=>{raw+=c;if(raw.length>100_000)reject(new Error('body too large'))});req.on('end',()=>{try{resolve(raw?JSON.parse(raw):{})}catch(e){reject(e)}});req.on('error',reject)})
const idem=(req,body={})=>String(req.headers['idempotency-key']||body.idempotencyKey||'')
const persist=(kind,key,value,action)=>{state.put(kind,key,value,{action});return value}
const setPersistent=(map,kind,key,value,action)=>{persist(kind,key,value,action);map.set(String(key),value);return value}
const store=c=>setPersistent(contracts,'contract',c.id,c,`CONTRACT_${c.state}`)
const getContract=id=>{const c=contracts.get(id);if(!c)throw new Error('CONTRACT_NOT_FOUND');return c}
const verifyMinerSignature=({publicKey,message,signature})=>{try{return crypto.verify(null,Buffer.from(message),publicKey,Buffer.from(signature,'base64'))}catch{return false}}
const allAttributions=()=>[...payoutReconciliations.values()].flatMap(r=>r.attributions||[])
const customerEntries=id=>hashVaultEntries.filter(e=>e.customerId===id)
const customerBalance=id=>customerEntries(id).reduce((s,e)=>s+Number(e.netBtc||0),0)-[...payoutRequests.values()].filter(p=>p.customerId===id&&['APPROVED','BROADCAST','CONFIRMING','CONFIRMED'].includes(p.state)).reduce((s,p)=>s+Number(p.amountBtc||0),0)
const treasuryConfig=()=>treasuryPolicy({dailyLimitBtc:process.env.TREASURY_DAILY_LIMIT_BTC,hotWalletFloorBtc:process.env.TREASURY_HOT_FLOOR_BTC,hotWalletTargetBtc:process.env.TREASURY_HOT_TARGET_BTC,coldReserveMinimumBtc:process.env.TREASURY_COLD_MIN_BTC,requiredConfirmations:process.env.PAYOUT_CONFIRMATIONS,signingMode:process.env.TREASURY_SIGNING_MODE||'EXTERNAL_SIGNER'})
const utcDay=s=>new Date(s).toISOString().slice(0,10)
const dailyBroadcastBtc=()=>{const today=utcDay(new Date());return [...payoutRequests.values()].filter(p=>p.broadcastAt&&utcDay(p.broadcastAt)===today).reduce((s,p)=>s+Number(p.amountBtc||0),0)}
const walletRpc=()=>bitcoinRpcClient({url:process.env.BITCOIN_WALLET_RPC_URL||process.env.BITCOIN_RPC_URL,auth:process.env.BITCOIN_WALLET_RPC_AUTH||process.env.BITCOIN_RPC_AUTH,timeoutMs:Number(process.env.BITCOIN_RPC_TIMEOUT_MS||10000)})
const issueReceipt=p=>{const existing=[...receipts.values()].find(r=>r.txid===p.txid);if(existing)return existing;const customerLedger=customerEntries(p.customerId);const contractIds=[...new Set(customerLedger.map(e=>e.contractId).filter(Boolean))];const receipt=createSettlementReceipt({payout:p,contractIds,ledgerEntryIds:customerLedger.map(e=>e.id)});return setPersistent(receipts,'receipt',receipt.receiptId,receipt,'SETTLEMENT_RECEIPT_FINAL')}

export const server=http.createServer(async(req,res)=>{
  if(req.method==='OPTIONS'){res.writeHead(204,{'access-control-allow-origin':process.env.CORS_ORIGIN||'https://shemsizedek.github.io','access-control-allow-headers':'authorization,content-type,idempotency-key','access-control-allow-methods':'GET,POST,OPTIONS'});return res.end()}
  if(req.method==='GET'&&req.url==='/health'){const configured=evaluateProductionReadiness(configFromEnv());return json(res,200,{service:'neo-miner-production',status:'UP',mode:configured.mode,storage:{engine:'SQLITE',persistent:true},time:new Date().toISOString()})}
  if(req.method==='GET'&&req.url==='/ready'){const readiness=await runtimeReadiness();return json(res,readiness.ready?200:503,readiness)}
  if(req.method==='GET'&&req.url==='/providers'){if(!authorized(req))return json(res,401,{error:'unauthorized'});return json(res,200,await liveProviderSnapshot())}
  if(req.method==='GET'&&req.url==='/probe'){if(!authorized(req))return json(res,401,{error:'unauthorized'});return json(res,200,await collectLiveProbe(configFromEnv()))}
  if(req.method==='GET'&&req.url==='/audit'){if(!authorized(req))return json(res,401,{error:'unauthorized'});return json(res,200,{events:state.audit(250)})}
  if(req.method==='GET'&&req.url==='/snapshot'){if(!authorized(req))return json(res,401,{error:'unauthorized'});const readiness=await runtimeReadiness();const f=fleetSnapshot([...fleet.values()]);return json(res,200,buildProductionHealthSnapshot({readiness,minerFleet:{verifiedAgents:f.verifiedIdentities,hashrateTh:f.totalHashrateTh,online:f.online},pool:{connected:Boolean(readiness.liveProbe?.pool?.connected),acceptedShares:f.acceptedShares,rejectedShares:0},payments:{provider:process.env.PAYMENT_PROVIDER,enabledCurrencies:(process.env.ENABLED_CURRENCIES||'').split(',').filter(Boolean),webhookVerified:process.env.PAYMENT_WEBHOOK_VERIFY==='true'},chains:{bitcoinConnected:Boolean(readiness.liveProbe?.bitcoin?.connected),bitcoinHeight:readiness.liveProbe?.bitcoin?.blocks??null,counterpartyConnected:Boolean(readiness.liveProbe?.counterparty?.connected),counterpartyHeight:null}}))}

  if(req.method==='GET'&&req.url==='/treasury'){if(!authorized(req))return json(res,401,{error:'unauthorized'});const hot=Number(process.env.TREASURY_HOT_BALANCE_BTC||0);return json(res,200,{policy:treasuryConfig(),hotWalletBalanceBtc:hot,coldReserveBalanceBtc:Number(process.env.TREASURY_COLD_BALANCE_BTC||0),dailyBroadcastBtc:dailyBroadcastBtc(),reserveAction:coldReserveAction({hotWalletBalanceBtc:hot,policy:treasuryConfig()}),pendingSigningIntents:[...signingIntents.values()].filter(i=>!signedTransactions.has(i.intentId)).length,psbt:{walletRpcConfigured:Boolean((process.env.BITCOIN_WALLET_RPC_URL||process.env.BITCOIN_RPC_URL)&&(process.env.BITCOIN_WALLET_RPC_AUTH||process.env.BITCOIN_RPC_AUTH)),prepared:psbts.size,finalized:finalizedTransactions.size,signingMode:'EXTERNAL_SIGNER'},storage:{engine:'SQLITE',persistent:true,payouts:payoutRequests.size,receipts:receipts.size,hashVaultEntries:hashVaultEntries.length}})}

  if(req.method==='GET'&&req.url==='/hashvault'){if(!authorized(req))return json(res,401,{error:'unauthorized'});return json(res,200,{summary:hashVaultSnapshot(hashVaultEntries),verifiedShares:verifiedShares.size,reconciledPayouts:payoutReconciliations.size,attributions:allAttributions(),entries:hashVaultEntries,payouts:[...payoutRequests.values()],receipts:[...receipts.values()]})}
  if(req.method==='POST'&&req.url==='/hashvault/payouts/reconcile'){if(!authorized(req))return json(res,401,{error:'unauthorized'});try{const body=await readBody(req),key=idem(req,body);if(!key)throw new Error('IDEMPOTENCY_KEY_REQUIRED');const cached=state.getIdempotent('pool-payout-reconcile',key);if(cached){payoutReconciliations.set(cached.payoutId,cached);return json(res,200,{...cached,replayed:true})}if(payoutReconciliations.has(body.payout?.payoutId))throw new Error('PAYOUT_ALREADY_RECONCILED');const candidate=reconcilePoolPayout({payout:body.payout,verifiedShares:[...verifiedShares.values()]});const committed=state.idempotentPut({scope:'pool-payout-reconcile',key,kind:'payout_reconciliation',id:candidate.payoutId,value:candidate,action:'POOL_PAYOUT_RECONCILED'}).value;payoutReconciliations.set(committed.payoutId,committed);return json(res,201,committed)}catch(error){return json(res,409,{error:error.message})}}
  if(req.method==='POST'&&req.url==='/hashvault/credits'){if(!authorized(req))return json(res,401,{error:'unauthorized'});try{const body=await readBody(req),key=idem(req,body);if(!key)throw new Error('IDEMPOTENCY_KEY_REQUIRED');const cached=state.getIdempotent('hashvault-credit',key);if(cached){if(!hashVaultEntries.some(e=>e.id===cached.id))hashVaultEntries.push(cached);return json(res,200,{...cached,replayed:true})}const attribution=allAttributions().find(a=>a.attributionId===body.attributionId);if(!attribution)throw new Error('ATTRIBUTION_NOT_FOUND');const contract=getContract(attribution.contractId);if(contract.customerId!==body.customerId)throw new Error('CUSTOMER_CONTRACT_MISMATCH');assertNoDuplicateCredit(hashVaultEntries,attribution);const candidate=createHashVaultCredit({attribution,customerId:body.customerId,poolFeePct:body.poolFeePct,serviceFeePct:body.serviceFeePct,electricityFeeBtc:body.electricityFeeBtc});const committed=state.idempotentPut({scope:'hashvault-credit',key,kind:'hashvault_entry',id:candidate.id,value:candidate,action:'HASHVAULT_CREDIT'}).value;if(!hashVaultEntries.some(e=>e.id===committed.id))hashVaultEntries.push(committed);return json(res,201,committed)}catch(error){return json(res,409,{error:error.message})}}

  if(req.method==='POST'&&req.url==='/payouts'){if(!authorized(req))return json(res,401,{error:'unauthorized'});try{const body=await readBody(req),key=idem(req,body);if(!key)throw new Error('IDEMPOTENCY_KEY_REQUIRED');const cached=state.getIdempotent('payout-create',key);if(cached){payoutRequests.set(cached.id,cached);return json(res,200,{...cached,replayed:true})}const candidate=createPayoutRequest({...body,availableBtc:customerBalance(body.customerId),minimumBtc:Number(process.env.PAYOUT_MIN_BTC||0.00001)});const committed=state.idempotentPut({scope:'payout-create',key,kind:'payout',id:candidate.id,value:candidate,action:'PAYOUT_REQUESTED'}).value;payoutRequests.set(committed.id,committed);return json(res,201,committed)}catch(error){return json(res,409,{error:error.message})}}
  const payoutMatch=req.url?.match(/^\/payouts\/([^/]+)\/(approve|prepare|sign|broadcast|confirm|psbt|finalize-psbt|broadcast-core|sync-core)$/)
  if(req.method==='POST'&&payoutMatch){if(!authorized(req))return json(res,401,{error:'unauthorized'});try{const [,id,action]=payoutMatch;let p=payoutRequests.get(id);if(!p)throw new Error('PAYOUT_NOT_FOUND');const body=await readBody(req)
    if(action==='approve')p=approvePayout(p,body)
    if(action==='prepare'){
      const assessment=evaluateTreasuryPayout({request:p,policy:treasuryConfig(),hotWalletBalanceBtc:Number(process.env.TREASURY_HOT_BALANCE_BTC||0),dailyBroadcastBtc:dailyBroadcastBtc(),approvals:body.approvals||[]})
      const intent=buildUnsignedPayout({request:p,feeRateSatVb:Number(body.feeRateSatVb||process.env.TREASURY_FEE_RATE_SAT_VB||5),changeAddressRef:process.env.TREASURY_CHANGE_ADDRESS_REF||'wallet://hot/change'})
      setPersistent(signingIntents,'signing_intent',intent.intentId,{...intent,assessment},'SIGNING_INTENT_PREPARED');return json(res,201,{intent:{...intent,rawTransaction:undefined},assessment})
    }
    if(action==='sign'){
      const intent=signingIntents.get(body.intentId);if(!intent||intent.payoutId!==p.id)throw new Error('SIGNING_INTENT_NOT_FOUND')
      const signed=assertExternalSignerResult({intent,signedTransaction:body.signedTransaction,txid:body.txid});setPersistent(signedTransactions,'signed_transaction',intent.intentId,signed,'EXTERNAL_SIGNATURE_ACCEPTED');return json(res,200,signed)
    }
    if(action==='broadcast'){
      const signed=[...signedTransactions.values()].find(s=>s.payoutId===p.id&&s.txid===body.txid);if(!signed)throw new Error('SIGNED_TRANSACTION_NOT_VERIFIED')
      p=markBroadcast(p,{txid:body.txid})
    }
    if(action==='confirm'){p=confirmPayout(p,{confirmations:body.confirmations,requiredConfirmations:Number(process.env.PAYOUT_CONFIRMATIONS||1)});if(p.state==='CONFIRMED')issueReceipt(p)}
    if(action==='psbt'){
      const assessment=evaluateTreasuryPayout({request:p,policy:treasuryConfig(),hotWalletBalanceBtc:Number(process.env.TREASURY_HOT_BALANCE_BTC||0),dailyBroadcastBtc:dailyBroadcastBtc(),approvals:body.approvals||[]})
      const record=await createPayoutPsbt({request:p,feeRateSatVb:Number(body.feeRateSatVb||process.env.TREASURY_FEE_RATE_SAT_VB||5),rpc:walletRpc()});setPersistent(psbts,'psbt',record.psbtId,{...record,assessment},'PSBT_FUNDED');return json(res,201,{signerEnvelope:exportSignerEnvelope(record),assessment,feeBtc:record.feeBtc,changePosition:record.changePosition})
    }
    if(action==='finalize-psbt'){
      const record=psbts.get(body.psbtId);if(!record||record.payoutId!==p.id)throw new Error('PSBT_NOT_FOUND')
      const finalized=await finalizeSignedPsbt({psbtRecord:record,signedPsbt:body.signedPsbt,rpc:walletRpc()});setPersistent(finalizedTransactions,'finalized_transaction',finalized.psbtId,finalized,'PSBT_FINALIZED');return json(res,200,{payoutId:finalized.payoutId,psbtId:finalized.psbtId,complete:finalized.complete,privateKeyIncluded:false,finalizedAt:finalized.finalizedAt})
    }
    if(action==='broadcast-core'){
      const finalized=finalizedTransactions.get(body.psbtId);if(!finalized||finalized.payoutId!==p.id)throw new Error('FINALIZED_PSBT_NOT_FOUND')
      const broadcast=await broadcastFinalizedTransaction({finalized,rpc:walletRpc()});p=markBroadcast(p,{txid:broadcast.txid});setPersistent(payoutRequests,'payout',p.id,p,'PAYOUT_BROADCAST');return json(res,200,{payout:p,broadcast})
    }
    if(action==='sync-core'){
      if(!p.txid||!['BROADCAST','CONFIRMING'].includes(p.state))throw new Error('BROADCAST_PAYOUT_REQUIRED')
      const chain=await transactionStatus({txid:p.txid,rpc:walletRpc()});if(chain.abandoned)throw new Error('BITCOIN_TRANSACTION_ABANDONED')
      p=confirmPayout(p,{confirmations:chain.confirmations,requiredConfirmations:Number(process.env.PAYOUT_CONFIRMATIONS||1)});let receipt=null;if(p.state==='CONFIRMED')receipt=issueReceipt(p);setPersistent(payoutRequests,'payout',p.id,p,`PAYOUT_${p.state}`);return json(res,200,{payout:p,chain,receipt:receipt?publicReceipt(receipt):null})
    }
    setPersistent(payoutRequests,'payout',p.id,p,`PAYOUT_${p.state}`);return json(res,200,p)}catch(error){return json(res,409,{error:error.message})}}
  const receiptMatch=req.url?.match(/^\/receipts\/([^/]+)$/)
  if(req.method==='GET'&&receiptMatch){const receipt=receipts.get(receiptMatch[1]);if(!receipt)return json(res,404,{error:'RECEIPT_NOT_FOUND'});return json(res,200,publicReceipt(receipt))}

  if(req.method==='GET'&&req.url==='/fleet'){if(!authorized(req))return json(res,401,{error:'unauthorized'});return json(res,200,{summary:fleetSnapshot([...fleet.values()]),miners:[...fleet.values()]})}
  if(req.method==='POST'&&req.url==='/fleet/challenge'){if(!authorized(req))return json(res,401,{error:'unauthorized'});try{const c=createEnrollmentChallenge(await readBody(req));challenges.set(c.challengeId,c);return json(res,201,c)}catch(error){return json(res,400,{error:error.message})}}
  if(req.method==='POST'&&req.url==='/fleet/enroll'){if(!authorized(req))return json(res,401,{error:'unauthorized'});try{const body=await readBody(req);const pending=challenges.get(body.challengeId);if(!pending)throw new Error('CHALLENGE_NOT_FOUND');const verified=verifyEnrollmentChallenge(pending,{signature:body.signature,verifySignature:verifyMinerSignature});const miner=enrollMiner({challenge:verified,model:body.model,serial:body.serial,firmware:body.firmware,siteId:body.siteId});challenges.set(verified.challengeId,verified);fleet.set(miner.id,miner);return json(res,201,miner)}catch(error){return json(res,409,{error:error.message})}}
  const telemetryMatch=req.url?.match(/^\/fleet\/([^/]+)\/telemetry$/)
  if(req.method==='POST'&&telemetryMatch){if(!authorized(req))return json(res,401,{error:'unauthorized'});try{const miner=fleet.get(telemetryMatch[1]);if(!miner)throw new Error('MINER_NOT_FOUND');const updated=registerTelemetry(miner,await readBody(req));fleet.set(updated.id,updated);return json(res,200,updated)}catch(error){return json(res,409,{error:error.message})}}
  if(req.method==='POST'&&req.url==='/fleet/shares/verify'){if(!authorized(req))return json(res,401,{error:'unauthorized'});try{const body=await readBody(req);const miner=fleet.get(body.share?.minerId);if(!miner)throw new Error('MINER_NOT_FOUND');const result=verifyStratumShare({miner,share:body.share,poolReceipt:body.poolReceipt});if(verifiedShares.has(result.shareId))throw new Error('SHARE_ALREADY_VERIFIED');fleet.set(miner.id,applyShareResult(miner,result));setPersistent(verifiedShares,'verified_share',result.shareId,result,'STRATUM_SHARE_VERIFIED');return json(res,200,result)}catch(error){return json(res,409,{error:error.message,accountingEligible:false})}}

  if(req.method==='GET'&&req.url==='/infrastructure'){if(!authorized(req))return json(res,401,{error:'unauthorized'});const records=[...infrastructure.values()];return json(res,200,{summary:onboardingSummary(records),records})}
  if(req.method==='POST'&&req.url==='/infrastructure'){if(!authorized(req))return json(res,401,{error:'unauthorized'});try{const record=createInfrastructureRecord(await readBody(req));infrastructure.set(record.id,record);return json(res,201,record)}catch(error){return json(res,400,{error:error.message})}}
  const infraMatch=req.url?.match(/^\/infrastructure\/([^/]+)\/verify$/)
  if(req.method==='POST'&&infraMatch){if(!authorized(req))return json(res,401,{error:'unauthorized'});try{const record=infrastructure.get(infraMatch[1]);if(!record)throw new Error('INFRASTRUCTURE_NOT_FOUND');const body=await readBody(req);const verified=markInfrastructureVerified(record,{ok:body.ok===true,detail:body.detail});infrastructure.set(verified.id,verified);return json(res,200,verified)}catch(error){return json(res,409,{error:error.message})}}

  if(req.method==='POST'&&req.url==='/contracts'){if(!authorized(req))return json(res,401,{error:'unauthorized'});try{return json(res,201,store(createContract(await readBody(req))))}catch(error){return json(res,400,{error:error.message})}}
  const match=req.url?.match(/^\/contracts\/([^/]+)\/(payment|reserve|activate|settlement-pending|settle)$/)
  if(req.method==='POST'&&match){if(!authorized(req))return json(res,401,{error:'unauthorized'});try{const [,id,action]=match;let c=getContract(id);const body=await readBody(req);if(action==='payment')c=confirmPayment(c,body);if(action==='reserve')c=reserveCapacity(c,body);if(action==='activate'){const readiness=await runtimeReadiness();const activation=assertLiveContractActivation({productionReady:readiness.ready,paymentConfirmed:c.state==='CAPACITY_RESERVED',contractExecuted:true,capacityBacked:true,customerSettlementDestinationVerified:body.settlementDestinationVerified===true,simulation:c.simulation,orderId:body.orderId,contractId:c.id});c=activateContract(c,{...body,activationId:activation.activationId,productionReady:readiness.ready})}if(action==='settlement-pending')c=markSettlementPending(c,body);if(action==='settle')c=settleContract(c,body);return json(res,200,store(c))}catch(error){return json(res,409,{error:error.message})}}
  return json(res,404,{error:'not_found'})
})
if(import.meta.url===`file://${process.argv[1]}`) server.listen(PORT,'0.0.0.0',()=>console.log(`NEO Miner production API listening on ${PORT}`))
