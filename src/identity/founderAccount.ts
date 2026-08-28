export const FOUNDER_SUBJECT_ID = 'neo:founder:000001' as const;

export type FounderPrincipal = {
  subject_id: typeof FOUNDER_SUBJECT_ID;
  ordinal: 1;
  account_class: 'founder';
  bootstrap_role: 'founder_owner';
  reserved: true;
  deletable: false;
  recyclable: false;
  authentication_bypass: false;
};

export const founderPrincipal: FounderPrincipal = Object.freeze({
  subject_id: FOUNDER_SUBJECT_ID,
  ordinal: 1,
  account_class: 'founder',
  bootstrap_role: 'founder_owner',
  reserved: true,
  deletable: false,
  recyclable: false,
  authentication_bypass: false,
});

export function isFounderSubject(subjectId: string | null | undefined): boolean {
  return subjectId === FOUNDER_SUBJECT_ID;
}

export function canPerformFounderAction(subjectId: string | null | undefined, authenticated: boolean): boolean {
  return isFounderSubject(subjectId) && authenticated;
}
