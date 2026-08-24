import { useState } from 'react';
import { currentSession, login, logout, type Session } from './session';

type Props={merchantId:string;onSession:(session:Session|null)=>void};

export default function AuthPanel({merchantId,onSession}:Props){
  const [session,setSession]=useState<Session|null>(currentSession());
  const [terminalId,setTerminalId]=useState('neo-terminal-demo-01');
  const [terminalSecret,setTerminalSecret]=useState('');
  const [staffId,setStaffId]=useState('staff_owner');
  const [pin,setPin]=useState('');
  const [message,setMessage]=useState('Session tokens are kept in memory only.');

  const signIn=async()=>{
    try{
      const next=await login({merchantId,terminalId,terminalSecret,staffId,pin});
      setTerminalSecret('');setPin('');setSession(next);onSession(next);
      setMessage(`Signed in as ${next.staffId} on ${next.terminalId}.`);
    }catch(error){setMessage(error instanceof Error?error.message:'Sign in failed.');}
  };
  const signOut=async()=>{await logout();setSession(null);onSession(null);setMessage('Signed out; in-memory token cleared.');};

  return <section className="panel auth-panel"><div className="section-head"><div><h2>Terminal & Staff Session</h2><p>Scoped access for this register session.</p></div><span>{session?'Authenticated':'Signed out'}</span></div>
    {session?<><div className="auth-summary"><strong>{session.staffId}</strong><span>{session.terminalId}</span><span>{session.permissions.join(', ')||'no permissions'}</span></div><button className="terminal-btn" onClick={signOut}>Sign Out</button></>:<div className="auth-grid"><label>Terminal ID<input value={terminalId} onChange={e=>setTerminalId(e.target.value)}/></label><label>Terminal Secret<input type="password" autoComplete="off" value={terminalSecret} onChange={e=>setTerminalSecret(e.target.value)}/></label><label>Staff ID<input value={staffId} onChange={e=>setStaffId(e.target.value)}/></label><label>Staff PIN<input type="password" inputMode="numeric" autoComplete="off" value={pin} onChange={e=>setPin(e.target.value)}/></label><button className="pay" onClick={signIn}>Sign In</button></div>}
    <p className="device-message">{message}</p><small>Credentials and bearer tokens are never written to localStorage.</small>
  </section>;
}
