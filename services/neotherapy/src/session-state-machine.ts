export type SessionState =
  | "ORIENTATION" | "OBSERVATION" | "NOOLOGICAL_DIALOGUE"
  | "COGNITIVE_ALIGNMENT" | "NOUS_FIELD_PRACTICE"
  | "REFLECTION" | "INTEGRATION" | "COMPLETE" | "STOPPED";

const transitions: Record<SessionState, SessionState[]> = {
  ORIENTATION:["OBSERVATION","STOPPED"],
  OBSERVATION:["NOOLOGICAL_DIALOGUE","STOPPED"],
  NOOLOGICAL_DIALOGUE:["COGNITIVE_ALIGNMENT","STOPPED"],
  COGNITIVE_ALIGNMENT:["NOUS_FIELD_PRACTICE","STOPPED"],
  NOUS_FIELD_PRACTICE:["REFLECTION","STOPPED"],
  REFLECTION:["INTEGRATION","STOPPED"],
  INTEGRATION:["COMPLETE","STOPPED"],
  COMPLETE:[],
  STOPPED:[]
};

export function canTransition(from: SessionState, to: SessionState): boolean {
  return transitions[from].includes(to);
}

export function assertModalityStart(input: {
  consentActive: boolean;
  credentialActive: boolean;
  modalityAuthorized: boolean;
  safetyScreenComplete: boolean;
}) {
  if (!input.consentActive) throw new Error("ACTIVE_CONSENT_REQUIRED");
  if (!input.credentialActive) throw new Error("ACTIVE_CREDENTIAL_REQUIRED");
  if (!input.modalityAuthorized) throw new Error("MODALITY_AUTHORIZATION_REQUIRED");
  if (!input.safetyScreenComplete) throw new Error("SAFETY_SCREEN_REQUIRED");
}
