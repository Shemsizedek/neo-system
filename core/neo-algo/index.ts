import { cycleOrder, stageLabel } from "./cycle.js";
import { classifyRisk, requiresApproval } from "./risk.js";
import { CURRICULUM_GUARDRAILS, QUINTIVIUM } from "./templistCurriculum.js";
import type { NeoAlgoResult, NeoCycle, NeoMission, NeoStageResult } from "./types.js";

function isTemplistCurriculumMission(mission: NeoMission) {
  const text = `${mission.objective ?? ""} ${mission.requestedAction ?? ""} ${JSON.stringify(mission.context ?? {})}`.toLowerCase();
  return ["templist", "temple degree", "144 degree", "christism", "mosesism", "muhammadism", "sufism", "quintivium", "noology", "neology", "rekai", "gisd", "giss"].some((term) => text.includes(term));
}

export function runNeoAlgo(mission: NeoMission, cycle: NeoCycle = "human"): NeoAlgoResult {
  const risk = classifyRisk(mission);
  const curriculumMission = isTemplistCurriculumMission(mission);
  const curriculumNotes = curriculumMission
    ? [
        "Preserve exact source-supplied Templist terminology, Major Lesson names, study lists, and Tests of Study when supplied.",
        `Use Templist as the primary learner term; reserve Noonebu for Elite/Elect contexts.`,
        `Preserve the fixed Quintivium: ${QUINTIVIUM.join(", ")}.`,
        CURRICULUM_GUARDRAILS.neology,
        "Distinguish internal doctrine and Temple interpretation from externally verified historical, legal, scientific, medical, accreditation, and credential claims.",
      ]
    : [];

  const stages: NeoStageResult[] = cycleOrder(cycle).map((stage) => ({
    stage: stage as 777 | 888 | 999,
    label: stageLabel(stage),
    notes: [
      ...(stage === 777
        ? ["Ground mission in evidence, context, authority, and constraints."]
        : stage === 888
          ? ["Reconcile options across logic, practicality, ethics, security, and policy."]
          : ["Resolve to the best-supported recommendation and route execution through NEO Guard."]),
      ...(curriculumMission ? curriculumNotes : []),
    ],
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
    provenance: ["NEO-ALGO-001", `cycle:${cycle}`, `risk:${risk}`, ...(curriculumMission ? ["NEO-TEMPLIST-CURRICULUM-CANON-001"] : [])],
  };
}

export * from "./types.js";
export * from "./risk.js";
export * from "./cycle.js";
export * from "./templistCurriculum.js";
export * from "./sacredChambers.js";
