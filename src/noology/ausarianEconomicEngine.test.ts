import { describe,it,expect } from 'vitest'
import { assessAusarianScenario } from './ausarianEconomicEngine'
import { evaluateAusarianEconomics, AUSARIAN_GISS_LESSON } from './ausarianEconomicGateway'
const scenario={productiveInvestment:100000,annualProductiveOutput:12000,annualFinancingCost:4000,existingAnnualRent:15000,proposedAnnualRent:13000,jobsCreated:2,verifiedClaims:true,consent:true,environmentalReview:true}
describe('NEO-AUS-002',()=>{
 it('computes deterministic yield and financing ratio',()=>{const a=assessAusarianScenario(scenario);expect(a.productiveYield).toBe(.12);expect(a.financingCostRatio).toBe(.04);expect(a.rentCompetitionDelta).toBe(2000);expect(a.flags).toEqual([])})
 it('rejects negative and nonfinite quantities',()=>{expect(()=>assessAusarianScenario({...scenario,productiveInvestment:-1})).toThrow(RangeError);expect(()=>assessAusarianScenario({...scenario,annualProductiveOutput:Infinity})).toThrow(RangeError)})
 it('flags missing evidence and consent',()=>{const a=assessAusarianScenario({...scenario,verifiedClaims:false,consent:false,environmentalReview:false});expect(a.flags).toContain('UNVERIFIED_ECONOMIC_CLAIMS');expect(a.flags).toContain('CONSENT_NOT_CONFIRMED');expect(a.flags).toContain('ENVIRONMENTAL_REVIEW_REQUIRED')})
 it('does not divide by zero',()=>expect(assessAusarianScenario({...scenario,productiveInvestment:0}).productiveYield).toBeNull())
 it('exposes safe shared gateway and lesson',()=>{expect(evaluateAusarianEconomics(scenario).assessment.status).toBe('SIMULATION_ONLY');expect(AUSARIAN_GISS_LESSON.objectives.length).toBe(4)})
})
