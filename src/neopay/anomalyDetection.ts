import{listReceipts}from'./receiptCenter'
import{contactByAddress}from'./contactIntelligence'
import{walletDiagnostics,preferredWallet}from'./walletSession'
import{auditEvents}from'./securityAudit'
export type RiskLevel='low'|'elevated'|'high'
export type AnomalyAssessment={score:number;level:RiskLevel;reasons:string[];requiresElevatedApproval:boolean;block:boolean}
function recentReceipts(ms:number){const cutoff=Date.now()-ms;return listReceipts().filter(r=>new Date(r.submittedAt).getTime()>=cutoff&&r.state!=='failed')}
export function assessTransactionAnomaly(input:{amountBtc:number;feeSats:number;destination:string;walletRail?:string}):AnomalyAssessment{
 let score=0;const reasons:string[]=[];const receipts=listReceipts().filter(r=>r.state!=='failed'&&String(r.review.asset).toUpperCase()==='BTC'),recent=recentReceipts(10*60*1000)
 const amounts=receipts.map(r=>Number(r.review.amount||0)).filter(n=>n>0).slice(0,30),avg=amounts.length?amounts.reduce((a,b)=>a+b,0)/amounts.length:0
 if(avg>0&&input.amountBtc>=avg*3){score+=30;reasons.push('Payment size is at least 3× the recent average.')}
 if(input.amountBtc>=1){score+=35;reasons.push('Payment is at least 1 BTC.')}
 if(input.feeSats>=100000){score+=25;reasons.push('Network fee is unusually high (100,000+ sats).')}
 if(!contactByAddress(input.destination)){score+=20;reasons.push('Destination is not a saved NEOpay contact.')}
 const same=recent.filter(r=>String(r.review.destination||'').toLowerCase()===input.destination.toLowerCase())
 if(recent.length>=3){score+=20;reasons.push('Three or more sends occurred within the last 10 minutes.')}
 if(same.length>=2){score+=15;reasons.push('Repeated sends to this destination occurred within 10 minutes.')}
 const failures=auditEvents().filter(e=>!e.type.includes('confirmation')&&/failed|blocked|cancelled|rejected/i.test(e.message)&&Date.now()-new Date(e.at).getTime()<15*60*1000)
 if(failures.length>=3){score+=25;reasons.push('Multiple recent failed or blocked approval events detected.')}
 const rail=input.walletRail||preferredWallet(),diag=walletDiagnostics();const recentRailSwitch=diag.find(d=>d.ok&&d.stage==='connection'&&Date.now()-new Date(d.at).getTime()<5*60*1000)
 if(recentRailSwitch&&rail!==preferredWallet()){score+=15;reasons.push('Wallet provider changed shortly before this payment.')}
 score=Math.min(100,score);const level:RiskLevel=score>=70?'high':score>=35?'elevated':'low';return{score,level,reasons:reasons.length?reasons:['No unusual local transaction pattern detected.'],requiresElevatedApproval:score>=35,block:score>=90}
}
