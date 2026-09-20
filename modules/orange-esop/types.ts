export type EmployeeClass = "E1" | "E2" | "E3" | "S" | "V";
export type EligibilityReason =
  | "NOT_EMPLOYEE"
  | "SERVICE_NOT_MET"
  | "AGE_NOT_MET"
  | "HOURS_NOT_MET"
  | "EXCLUDED_CLASS"
  | "ELIGIBLE";

export type VestingEvent =
  | "NORMAL_VESTING"
  | "RETIREMENT"
  | "DEATH"
  | "DISABILITY"
  | "PLAN_TERMINATION"
  | "EMPLOYMENT_SEPARATION"
  | "REHIRE"
  | "FORFEITURE";

export type ReconciliationStatus = "PASS" | "RECONCILIATION_HOLD";

export interface Participant {
  participantId: string;
  legalName?: string;
  templeName?: string;
  employmentStatus: string;
  employeeClass?: EmployeeClass;
  hireDate?: string;
  chaplaincyOffice?: string;
  royalCouncilOffice?: string;
  memberStatus?: string;
  adeptStatus: boolean;
  primaryWallet?: string;
  beneficiaryStatus: "incomplete" | "complete";
}

export interface EligibilityResult {
  participantId: string;
  eligible: boolean;
  eligibilityDate?: string;
  nextEntryDate?: string;
  reasonCodes: EligibilityReason[];
}

export interface AllocationInput {
  participantId: string;
  planYear: number;
  eligibleCompensation: number;
  totalEligibleCompensation: number;
  contributionPool: number;
  fairMarketValuePerShare: number;
  tokenRatio: number;
}

export interface AllocationResult {
  allocationValue: number;
  employerShares: number;
  neotrustUnits: number;
}

export interface VestingResult {
  yearsOfService: number;
  vestingPercent: number;
  allocatedNeotrust: number;
  vestedNeotrust: number;
  unvestedNeotrust: number;
}

export interface ReconciliationInput {
  reserveUnits: number;
  suspenseUnits: number;
  participantUnits: number;
  unusedAuthorizedUnits: number;
  representedUnderlyingInterest: number;
  documentedUnderlyingInterest: number;
}

export interface ReconciliationResult {
  status: ReconciliationStatus;
  errors: string[];
}

export const DEFAULT_VESTING_SCHEDULE = [
  { minimumYears: 6, percent: 100 },
  { minimumYears: 5, percent: 80 },
  { minimumYears: 4, percent: 60 },
  { minimumYears: 3, percent: 40 },
  { minimumYears: 2, percent: 20 },
  { minimumYears: 0, percent: 0 },
] as const;
