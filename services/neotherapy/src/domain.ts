export type ConsentStatus='PENDING'|'ACTIVE'|'WITHDRAWN'|'EXPIRED'|'SUPERSEDED'
export type CredentialStatus='PENDING'|'ACTIVE'|'LIMITED'|'SUSPENDED'|'REVOKED'|'EXPIRED'
export type EvidenceState='D0'|'H1'|'O2'|'P3'|'R4'|'V5'
export type PropositionClass='FACT'|'PERCEPTION'|'HYPOTHESIS'|'UNKNOWN'
export interface ConsentRecord{ id:string;participantId:string;modalityId:string;version:string;status:ConsentStatus;signedAt?:string;withdrawnAt?:string }
export interface CredentialRecord{ id:string;practitionerId:string;level:'C.Neo.'|'S.Neo.'|'M.Neo.';status:CredentialStatus;modalities:string[] }
export interface SessionRecord{ id:string;participantId:string;practitionerId:string;protocolVersion:string;modalityId?:string;state:string;createdAt:string;closedAt?:string }
export interface AuditEvent{ id:string;actorId:string;action:string;resourceType:string;resourceId:string;timestamp:string;reason?:string }
