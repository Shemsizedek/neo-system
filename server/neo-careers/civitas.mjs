// NOMNI Civitas: proposal-only allocation model. No tokens, cash or ownership are created.
const splits=Object.freeze({Apprentice:[100n,0n],Journeyman:[80n,20n],'Master Builder':[60n,40n]})
function parseUnits(value){
 if(typeof value!=='string'|| !/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,8})?$/.test(value))throw new TypeError('amount must be a non-negative 8-decimal string')
 const [whole,fraction='']=value.split('.')
 return BigInt(whole)*100000000n+BigInt(fraction.padEnd(8,'0'))
}
function formatUnits(n){return (n/100000000n).toString()+'.'+(n%100000000n).toString().padStart(8,'0')}
export function proposeCivitasAllocation({participantId,tier,dailyWageNomni,programConsent=false}={}){
 if(!/^[A-Za-z0-9_-]{1,80}$/.test(participantId||''))throw new TypeError('invalid participant')
 const split=splits[tier]
 if(!split)throw new TypeError('unknown tier')
 const total=parseUnits(dailyWageNomni)
 if(total<=0n)throw new TypeError('wage must be positive')
 // Round down housing allocation, preserve exact nominal units.
 const housing=total*split[1]/100n
 const liquid=total-housing
 return Object.freeze({participantId,tier,nominalWage:formatUnits(total),liquidNomniProposal:formatUnits(liquid),
   housingCreditProposal:formatUnits(housing),housingCreditsAreTokens:false,legalWageCompliance:'not-reviewed',
   consentVerified:programConsent===true,assetVerified:false,disbursementEnabled:false,
   ownershipPercentGranted:'0',deedTransferAuthorized:false,
   note:'Illustrative allocation only; housing credits are separate contractual claims, not automatic NOMNI balances or property interests.'})
}
export function assessCivitasEquity({sweat='0',noological='0',stewardship='0',grant='0'}={}){
 const parts=[sweat,noological,stewardship,grant].map(x=>{
   if(typeof x!=='string'||!/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,2})?$/.test(x))throw new TypeError('percent string required')
   const [a,b='']=x.split('.');return BigInt(a)*100n+BigInt(b.padEnd(2,'0'))
 })
 const sum=parts.reduce((a,b)=>a+b,0n)
 if(sum>10000n)throw new RangeError('proposed equity exceeds 100%')
 return Object.freeze({progressPercent:(Number(sum)/100).toFixed(2),deededInterestPercent:'0',deedTransferAuthorized:false,
   deedAndCovenantReview:'required',valuation:'unverified'})
}
