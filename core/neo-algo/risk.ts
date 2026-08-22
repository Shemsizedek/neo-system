import type { NeoMission, RiskLevel } from "./types.js";

const redActions = new Set(["financial_transfer","legal_commitment","contract_execution","destructive_delete","irreversible_external_action"]);
const yellowActions = new Set(["send_communication","publish","edit_important_record","external_api_write"]);

export function classifyRisk(mission: NeoMission): RiskLevel {
  const action = mission.requestedAction ?? "";
  if (mission.consequential || redActions.has(action)) return "red";
  if (yellowActions.has(action)) return "yellow";
  return "green";
}

export function requiresApproval(risk: RiskLevel): boolean {
  return risk !== "green";
}
