import { assessAusarianScenario } from './ausarianEconomicEngine'
import { evaluateAusarianEconomics, AUSARIAN_GISS_LESSON } from './ausarianEconomicGateway'
const scenario={productiveInvestment:100000,annualProductiveOutput:12000,annualFinancingCost:4000,existingAnnualRent:15000,proposedAnnualRent:13000,jobsCreated:2,verifiedClaims:true,consent:true,environmentalReview:true}
function assert(condition:boolean,message:string){if(!condition)throw new Error(message)}
/** Dependency-free assertions; call from a test harness. No side effects on import. */
export function runAusarianEconomicAssertions(){
 const a=assessAusarianScenario(scenario)
 assert(a.productiveYield===.12,'productive yield')
 assert(a.financingCostRatio===.04,'financing ratio')
 assert(a.rentCompetitionDelta===2000,'rent competition')
 assert(a.flags.length===0,'unexpected flags')
 for(const invalid of [-1,Infinity,NaN]){let rejected=false;try{assessAusarianScenario({...scenario,productiveInvestment:invalid})}catch(e){rejected=e instanceof RangeError}assert(rejected,'invalid quantity accepted')}
 const flagged=assessAusarianScenario({...scenario,verifiedClaims:false,consent:false,environmentalReview:false})
 for(const flag of ['UNVERIFIED_ECONOMIC_CLAIMS','CONSENT_NOT_CONFIRMED','ENVIRONMENTAL_REVIEW_REQUIRED'])assert(flagged.flags.includes(flag),'missing '+flag)
 assert(assessAusarianScenario({...scenario,productiveInvestment:0}).productiveYield===null,'zero denominator')
 assert(evaluateAusarianEconomics(scenario).assessment.status==='SIMULATION_ONLY','simulation boundary')
 assert(AUSARIAN_GISS_LESSON.objectives.length===4,'lesson objectives')
 return true
}
