import { cycleOrder, stageLabel } from "./cycle.js";
import { classifyRisk, requiresApproval } from "./risk.js";
import type { NeoAlgoResult, NeoCycle, NeoMission, NeoStageResult } from "./types.js";

export function runNeoAlgo(mission: NeoMission, cycle: NeoCycle = "human"): NeoAlgoResult {
  const risk = classifyRisk(mission);
  const stages: NeoStageResult[] = cycleOrder(cycle).map((stage) => ({
    stage: stage as 777 | 888 | 999,
    label: stageLabel(stage),
    notes: stage === 777
      ? ["Ground mission in evidence, context, authority, and constraints."]
      : stage === 888
        ? ["Reconcile options across logic, practicality, ethics, security, and policy."]
        : ["Resolve to the best-supported recommendation and route execution through NEO Guard."],
  }));

  return {
    missionId: mission.id,
    cycle,
    risk,
    approvalRequired: requiresApproval(risk),
    stages,
    recommendation: risk === "green"
      ? "Proceed with bounded advisory/autonomous work."
      : "Prepare the action and request human authorization before execution.",
    provenance: ["NEO-ALGO-001", `cycle:${cycle}`, `risk:${risk}`],
  };
}

export * from "./types.js";
export * from "./risk.js";
export * from "./cycle.js";
export * from "./templistCurriculum.js";
