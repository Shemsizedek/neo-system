export type DecimalString = string;
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

export interface VestingBand {
  minimumYears: number;
  percent: number;
}

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
  planYear: number;
  eligible: boolean;
  eligibilityDate?: string;
  nextEntryDate?: string;
  reasonCodes: EligibilityReason[];
}

export interface AllocationInput {
  participantId: string;
  planYear: number;
  eligible: true;
  eligibleCompensation: DecimalString;
  totalEligibleCompensation: DecimalString;
  contributionPool: DecimalString;
  fairMarketValuePerShare: DecimalString;
  tokenRatio: DecimalString;
}

export interface AllocationResult {
  allocationValue: DecimalString;
  employerShares: DecimalString;
  neotrustUnits: DecimalString;
}

export interface VestingResult {
  yearsOfService: number;
  vestingPercent: number;
  allocatedNeotrust: DecimalString;
  vestedNeotrust: DecimalString;
  unvestedNeotrust: DecimalString;
}

export interface ReconciliationInput {
  reserveUnits: DecimalString;
  suspenseUnits: DecimalString;
  participantUnits: DecimalString;
  unusedAuthorizedUnits: DecimalString;
  representedUnderlyingInterest: DecimalString;
  documentedUnderlyingInterest: DecimalString;
}

export interface ReconciliationResult {
  status: ReconciliationStatus;
  errors: string[];
}
