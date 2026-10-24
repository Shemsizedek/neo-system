import { proposeCivitasAllocation, assessCivitasEquity } from './civitas.mjs'
const phases=Object.freeze(['Foundations','Systems','Stewardship','Remote Contribution'])
export function buildCivitasParticipantDashboard({participant,assignment,ledger,progress}={}){
 if(!participant||typeof participant.id!=='string'||!/^[A-Za-z0-9_-]{1,80}$/.test(participant.id))throw new TypeError('invalid participant')
 if(!assignment||!phases.includes(assignment.phase))throw new TypeError('invalid work phase')
 if(!['Apprentice','Journeyman','Master Builder'].includes(participant.tier))throw new TypeError('invalid tier')
 if(typeof assignment.dailyWageNomni!=='string')throw new TypeError('nominal wage required')
 const allocation=proposeCivitasAllocation({participantId:participant.id,tier:participant.tier,dailyWageNomni:assignment.dailyWageNomni,programConsent:participant.housingContributionConsent===true})
 const equity=assessCivitasEquity(progress??{})
 // Values in submitted ledger are references, never automatically proof of cleared funds.
 const credits=Array.isArray(ledger)?ledger.filter(x=>x&&x.participantId===participant.id&&x.type==='housing-credit').map(x=>({id:String(x.id??''),status:'pending-ledger-verification'})):[]
 return Object.freeze({participant:{id:participant.id,tier:participant.tier,housingPriority:participant.housingPriority==='homeless-first'?'homeless-first':'standard',enrollmentStatus:'pending-verification'},
  assignment:{phase:assignment.phase,activity:String(assignment.activity??''),employmentStatus:'not-confirmed'},
  allocation,equity,credits,ownership:{recordedTitleVerified:false,foreclosureRestrictionVerified:false,transferEligible:false},
  privacy:'participant-only',fundsTransferred:false,publicOffer:false})
}
