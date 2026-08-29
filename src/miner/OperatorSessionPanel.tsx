import {FormEvent,useEffect,useState} from 'react'
import {getOperatorSession,loginOperator,logoutOperator,OPERATOR_API,type OperatorSession} from './operatorSession'

export function OperatorSessionPanel({onSession}:{onSession:(session:OperatorSession|null)=>void}){
  const[session,setSession]=useState<OperatorSession|null>(null),[operatorId,setOperatorId]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false)
  useEffect(()=>{getOperatorSession().then(s=>{setSession(s);onSession(s)}).catch(e=>setError(e instanceof Error?e.message:'Operator session unavailable'))},[])
  const submit=async(e:FormEvent)=>{e.preventDefault();setBusy(true);setError('');try{const s=await loginOperator(operatorId.trim(),password);setSession(s);setPassword('');onSession(s)}catch(err){setError(err instanceof Error?err.message:'Operator login failed')}finally{setBusy(false)}}
  const signOut=async()=>{setBusy(true);try{await logoutOperator();setSession(null);onSession(null)}finally{setBusy(false)}}
  if(!OPERATOR_API)return <div style={{padding:14,border:'1px solid #6d4a22',borderRadius:10}}>Operator control-plane URL is not configured. Set <code>VITE_NEO_MINER_OPERATOR_API</code> at build time.</div>
  if(session)return <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap',padding:12,border:'1px solid #234b35',borderRadius:10}}><b>{session.operator.displayName}</b><span>{session.operator.role}</span><button onClick={signOut} disabled={busy}>Sign out</button></div>
  return <form onSubmit={submit} style={{display:'grid',gap:10,maxWidth:420,padding:16,border:'1px solid #234b35',borderRadius:12}}><b>Operator sign in</b><input value={operatorId} onChange={e=>setOperatorId(e.target.value)} placeholder="Operator ID" autoComplete="username"/><input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Passphrase" type="password" autoComplete="current-password"/><button disabled={busy||!operatorId||!password}>{busy?'Signing in…':'Sign in'}</button>{error&&<div>{error}</div>}<small>The browser receives a short-lived HttpOnly session cookie. The production bearer token is never exposed to this page.</small></form>
}
