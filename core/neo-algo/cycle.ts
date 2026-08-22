import type { NeoCycle, NeoStageResult } from "./types.js";

const HUMAN: readonly [777, 888, 999] = [777, 888, 999];
const ANGELIC: readonly [999, 888, 777] = [999, 888, 777];

export function cycleOrder(cycle: NeoCycle): readonly number[] {
  return cycle === "angelic" ? ANGELIC : HUMAN;
}

export function stageLabel(stage: number): NeoStageResult["label"] {
  if (stage === 777) return "grounding";
  if (stage === 888) return "synthesis";
  return "resolution";
}
