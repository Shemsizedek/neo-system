import {useEffect,useState} from 'react'
import {listReceipts,refreshPendingReceipts,startReceiptMonitor,stopReceiptMonitor,type NEOpayReceipt} from './receiptCenter'

function short(txid:string){return txid.length>18?`${txid.slice(0,8)}…${txid.slice(-8)}`:txid}
function stateLabel(r:NEOpayReceipt){if(r.state==='confirmed')return`Confirmed · ${r.confirmations}`;if(r.state==='mempool')return'In mempool';if(r.state==='failed')return'Failed';return'Submitted'}

export function NEOpayReceiptCenter(){
 const[receipts,setReceipts]=useState<NEOpayReceipt[]>(()=>listReceipts())
 const[refreshing,setRefreshing]=useState(false)
 useEffect(()=>{const sync=()=>setReceipts(listReceipts());window.addEventListener('neopay:receipts',sync);startReceiptMonitor();return()=>{window.removeEventListener('neopay:receipts',sync);stopReceiptMonitor()}},[])
 const refresh=async()=>{setRefreshing(true);try{await refreshPendingReceipts();setReceipts(listReceipts())}finally{setRefreshing(false)}}
 return <section className="neopay-tool-card" aria-label="NEOpay receipts">
  <div className="neopay-tool-head"><div><strong>Receipts</strong><span>{receipts.length?`${receipts.length} locally recorded transaction${receipts.length===1?'':'s'}`:'No receipts yet'}</span></div><button type="button" onClick={()=>void refresh()} disabled={refreshing}>{refreshing?'Checking…':'Refresh'}</button></div>
  {!receipts.length?<p className="neopay-tool-empty">Receipts appear here after a transaction is submitted. Nothing floats over the rest of the app.</p>:<div className="neopay-receipt-list">{receipts.slice(0,12).map(r=><article key={r.txid}><div><strong>{stateLabel(r)}</strong><span>{String(r.review.action||'transaction').toUpperCase()} · {r.review.amount??'—'} {r.review.asset||r.review.market||''}</span></div><a href={`https://mempool.space/tx/${encodeURIComponent(r.txid)}`} target="_blank" rel="noopener noreferrer">{short(r.txid)}</a></article>)}</div>}
 </section>
}
