export type EconomicScenario = {productiveInvestment:number; annualProductiveOutput:number; annualFinancingCost:number; existingAnnualRent:number; proposedAnnualRent:number; jobsCreated:number; verifiedClaims:boolean; consent:boolean; environmentalReview:boolean};
export type EconomicAssessment = {status:'SIMULATION_ONLY'; productiveYield:number|null; financingCostRatio:number|null; rentCompetitionDelta:number; principles:{productionBeforeExtraction:boolean; accountableCirculation:boolean; stewardship:boolean; truthfulClaims:boolean}; flags:string[]};
/** NEO-AUS-001: deterministic, non-custodial policy simulation; never authorizes financial action. */
export function assessAusarianScenario(s:EconomicScenario):EconomicAssessment {
 const values=[s.productiveInvestment,s.annualProductiveOutput,s.annualFinancingCost,s.existingAnnualRent,s.proposedAnnualRent,s.jobsCreated];
 if(values.some(v=>!Number.isFinite(v)||v<0))throw new RangeError('Scenario quantities must be finite and nonnegative');
 const flags:string[]=[];
 if(s.productiveInvestment===0)flags.push('ZERO_INVESTMENT_DENOMINATOR');
 if(!s.verifiedClaims)flags.push('UNVERIFIED_ECONOMIC_CLAIMS');
 if(!s.consent)flags.push('CONSENT_NOT_CONFIRMED');
 if(!s.environmentalReview)flags.push('ENVIRONMENTAL_REVIEW_REQUIRED');
 if(s.proposedAnnualRent>s.existingAnnualRent)flags.push('NO_RENT_REDUCTION');
 return {status:'SIMULATION_ONLY',productiveYield:s.productiveInvestment? s.annualProductiveOutput/s.productiveInvestment:null,financingCostRatio:s.productiveInvestment?s.annualFinancingCost/s.productiveInvestment:null,rentCompetitionDelta:s.existingAnnualRent-s.proposedAnnualRent,principles:{productionBeforeExtraction:s.annualProductiveOutput>0,accountableCirculation:s.verifiedClaims&&s.consent,stewardship:s.environmentalReview,truthfulClaims:s.verifiedClaims},flags};
}
