export const NEO_MASK_PROTOCOL:string;
export type NeoMaskReadSession={request:{protocol:string;origin:string;network:string;permissions:string[];subject:string};provider:{request:(input:unknown)=>Promise<unknown>};canSign:false;canBroadcast:false;canSettle:false};
export function inspectNeoMaskProvider(provider:unknown):{detected:boolean;compatible:boolean;reason:string};
export function createNeoMaskReadSession(input:{provider:unknown;origin:string;network:string;permissions:string[];identity:{subject:string;verified:boolean}}):NeoMaskReadSession;
export function requestNeoMaskAccounts(session:NeoMaskReadSession):Promise<{address:string;network:string}[]>;
