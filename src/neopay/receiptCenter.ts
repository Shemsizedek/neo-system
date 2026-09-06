import{routedFetch}from'./routerClient'
import type{TransactionReview}from'./transactionReview'
import{appendAudit}from'./securityAudit'

export type ReceiptState='submitted'|'mempool'|'confirmed'|'failed'
export type NEOpayReceipt={txid:string;state:ReceiptState;confirmations:number;blockHeight?:number;submittedAt:string;verifiedAt?:string;review:TransactionReview;error?:string}
const STORAGE_KEY='neopay.receipts.v1',EVENT_NAME='neopay:receipts'
let pendingReview:TransactionReview|null=null,monitor:number|undefined
function safeWindow(){return typeof window!=='undefined'}
function readStore():NEOpayReceipt[]{if(!safeWindow())return[];try{const raw=window.localStorage.getItem(STORAGE_KEY),parsed=raw?JSON.parse(raw):[];return Array.isArray(parsed)?parsed.slice(0,100):[]}catch{return[]}}
function writeStore(receipts:NEOpayReceipt[]){if(!safeWindow())return;try{window.localStorage.setItem(STORAGE_KEY,JSON.stringify(receipts.slice(0,100)))}catch{}window.dispatchEvent(new CustomEvent(EVENT_NAME,{detail:receipts}))}
export function listReceipts(){return readStore()}
export function setPendingTransactionReview(review:TransactionReview){pendingReview=review}
export function clearPendingTransactionReview(){pendingReview=null}
export function registerBroadcastReceipt(txid:string){if(!pendingReview)return null;const receipt:NEOpayReceipt={txid,state:'submitted',confirmations:0,submittedAt:new Date().toISOString(),review:pendingReview};pendingReview=null;const next=[receipt,...readStore().filter(r=>r.txid!==txid)];writeStore(next);appendAudit('broadcast',`Bitcoin broadcast accepted: ${txid.slice(0,8)}…${txid.slice(-8)}.`);void verifyReceipt(txid);startReceiptMonitor();return receipt}
async function statusFor(txid:string){const{res}=await routedFetch('btc.read',`/tx/${encodeURIComponent(txid)}/status`,{headers:{Accept:'application/json'}});if(!res.ok)throw new Error(`Bitcoin status provider returned ${res.status}`);const status:any=await res.json();let tip=0;try{const tipRes=(await routedFetch('btc.read','/blocks/tip/height')).res;if(tipRes.ok)tip=Number(await tipRes.text())}catch{}const confirmed=Boolean(status?.confirmed),blockHeight=confirmed?Number(status?.block_height||0):undefined,confirmations=confirmed&&blockHeight&&tip>=blockHeight?tip-blockHeight+1:confirmed?1:0;return{confirmed,blockHeight,confirmations}}
export async function verifyReceipt(txid:string){const receipts=readStore(),index=receipts.findIndex(r=>r.txid===txid);if(index<0)return null;const before=receipts[index].state;try{const status=await statusFor(txid);const nextState:ReceiptState=status.confirmed?'confirmed':'mempool';receipts[index]={...receipts[index],state:nextState,confirmations:status.confirmations,blockHeight:status.blockHeight,verifiedAt:new Date().toISOString(),error:undefined};if(before!==nextState){if(nextState==='mempool')appendAudit('broadcast',`Transaction ${txid.slice(0,8)}…${txid.slice(-8)} observed in Bitcoin mempool.`);if(nextState==='confirmed')appendAudit('confirmation',`Transaction ${txid.slice(0,8)}…${txid.slice(-8)} confirmed with ${status.confirmations} confirmation(s).`)}}catch(e:any){receipts[index]={...receipts[index],verifiedAt:new Date().toISOString(),error:e?.message||'Network verification pending.'}}writeStore(receipts);return receipts[index]}
export async function refreshPendingReceipts(){const pending=readStore().filter(r=>r.state!=='confirmed'&&r.state!=='failed').slice(0,20);await Promise.allSettled(pending.map(r=>verifyReceipt(r.txid)));return readStore()}
export function startReceiptMonitor(){if(!safeWindow()||monitor!==undefined)return;void refreshPendingReceipts();monitor=window.setInterval(()=>{void refreshPendingReceipts()},30_000)}
export function stopReceiptMonitor(){if(safeWindow()&&monitor!==undefined){window.clearInterval(monitor);monitor=undefined}}
