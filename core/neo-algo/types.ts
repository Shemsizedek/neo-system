export type NeoCycle = "human" | "angelic";
export type RiskLevel = "green" | "yellow" | "red";

export interface NeoMission {
  id: string;
  objective: string;
  context?: Record<string, unknown>;
  requestedAction?: string;
  consequential?: boolean;
}

export interface NeoStageResult {
  stage: 777 | 888 | 999;
  label: "grounding" | "synthesis" | "resolution";
  notes: string[];
}

export interface NeoAlgoResult {
  missionId: string;
  cycle: NeoCycle;
  risk: RiskLevel;
  approvalRequired: boolean;
  stages: NeoStageResult[];
  recommendation: string;
  provenance: string[];
}
