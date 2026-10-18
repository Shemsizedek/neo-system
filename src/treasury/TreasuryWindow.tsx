import {useState} from 'react';
import {perCapitaPolicy,treasuryFunds,type Fund} from './ledger';
import {approveDistribution,type Approval,type Distribution,type Principal} from './controls';
type MemberAssessment={id:string;member:string;temple:string;amount:string;currency:string;state:'DRAFT'|'ISSUED'|'PAID'|'WAIVED'};
const sampleAssessments:MemberAssessment[]=[{id:'DEMO-A1',member:'Example Member',temple:'Temple 24',amount:'1',currency:'INFINITY',state:'DRAFT'}];
const demoDistribution:Distribution={id:'DEMO-D1',beneficiaryId:'DEMO-B1',templeId:'temple-24',fundId:'SICK',amountMinor:1000n,currency:'USD',state:'PENDING'};
const demoActor:Principal={id:'demo-trustee',roles:['TRUSTEE'],templeIds:['temple-24']};
export function TreasuryWindow(){
 const [assessments]=useState(sampleAssessments);
 const [distribution,setDistribution]=useState(demoDistribution);
 const [approvals,setApprovals]=useState<Approval[]>([]);
 const [message,setMessage]=useState('All values are illustrative. No funds are held or transferred.');
 const approve=()=>{
  const next=[...approvals,{actorId:demoActor.id,decision:'APPROVE' as const,recordedAt:new Date().toISOString()}];
  try{setDistribution(approveDistribution(distribution,next,demoActor));setApprovals(next);setMessage('Demo trustee approval recorded locally. A second distinct authenticated trustee is required.');}
  catch(e){setMessage(e instanceof Error?e.message:'Approval rejected');}
 };
 return <section aria-label="NEO Treasury Window" style={{padding:24}}>
  <h2>NEO Treasury Window</h2><p><strong>DEMO / NO LIVE ASSETS</strong> — No bank, Bitcoin, Counterparty or trust custody connection.</p>
  <h3>Member Assessments</h3><p>Per Capita: {perCapitaPolicy.unit} · due day {perCapitaPolicy.dueDay} · grace through day {perCapitaPolicy.graceThroughDay}. No USD conversion defined.</p>
  <table><thead><tr><th>Record</th><th>Member</th><th>Temple</th><th>Amount</th><th>Status</th></tr></thead><tbody>{assessments.map(a=><tr key={a.id}><td>{a.id}</td><td>{a.member}</td><td>{a.temple}</td><td>{a.amount} {a.currency}</td><td>{a.state}</td></tr>)}</tbody></table>
  <h3>Restricted Fund Registry</h3><ul>{treasuryFunds.map((f:Fund)=><li key={f}>{f} — balance unavailable until verified ledger integration</li>)}</ul>
  <h3>Trust Distribution Approval</h3><p>Request {distribution.id} · {distribution.fundId} · demo USD {(Number(distribution.amountMinor)/100).toFixed(2)} · {distribution.state}</p>
  <button type="button" disabled={approvals.some(a=>a.actorId===demoActor.id)||distribution.state!=='PENDING'} onClick={approve}>Record simulated trustee approval</button>
  <p role="status">{message}</p>
 </section>;
}
