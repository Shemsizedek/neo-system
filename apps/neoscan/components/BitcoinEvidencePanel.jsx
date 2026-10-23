import React, {useState} from 'react';
const initial={asset:'',txid:''};
export default function BitcoinEvidencePanel({endpoint='/api/bmi/v1/evidence',accessToken}){
 const [form,setForm]=useState(initial),[result,setResult]=useState(null),[loading,setLoading]=useState(false),[error,setError]=useState('');
 async function check(event){
  event.preventDefault();setResult(null);setError('');
  if(!/^[A-Z0-9._-]{1,64}$/.test(form.asset)||!/^[0-9a-f]{64}$/i.test(form.txid)){setError('Enter an approved asset and 64-character Bitcoin transaction ID.');return}
  if(!accessToken){setError('Authenticated operator session required.');return}
  setLoading(true);
  try{
   const query=new URLSearchParams(form);
   const response=await fetch(endpoint+'?'+query,{headers:{authorization:'Bearer '+accessToken,accept:'application/json'},cache:'no-store'});
   const data=await response.json();if(!response.ok)throw new Error(data.error||'Verification request failed');setResult(data);
  }catch(e){setError(e.message||'Verification unavailable')}finally{setLoading(false)}
 }
 return <section aria-label="Bitcoin monetary base verification">
  <h2>NEO Scan — BTC/XCP Evidence</h2>
  <p>Read-only Bitcoin-native issuance verification. Provider correlations are not proof of collateral, ownership, legal rights or investment eligibility.</p>
  <form onSubmit={check}>
   <label>Counterparty asset <input value={form.asset} maxLength={64} onChange={e=>setForm({...form,asset:e.target.value.toUpperCase()})} required/></label>
   <label>Bitcoin transaction ID <input value={form.txid} maxLength={64} onChange={e=>setForm({...form,txid:e.target.value})} required/></label>
   <button disabled={loading||!accessToken}>{loading?'Checking…':'Check chain evidence'}</button>
  </form>
  {error&&<p role="alert">{error}</p>}
  {result&&<article aria-live="polite"><h3>{result.status}</h3><dl>
   <dt>Asset</dt><dd>{result.asset}</dd><dt>Transaction</dt><dd>{result.txid}</dd>
   <dt>Confirmations</dt><dd>{result.confirmations??'Not verified'}</dd>
   <dt>Collateral rights</dt><dd>{result.legalRights}</dd><dt>Reserve backing</dt><dd>{result.reserveBacking}</dd>
   <dt>Assurance</dt><dd>{result.consensusAssurance}</dd>
  </dl></article>}
 </section>
}
