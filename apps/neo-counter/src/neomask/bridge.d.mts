export type MerchantSession={merchantId:string;permissions:string[]}|null;
export function walletStatus(input:{session:MerchantSession;network?:string;providerAvailable?:boolean}):{ready:boolean;reason:string;network?:string};
export function checkReceiveClaim(claim:{merchantId:string;network:string;address:string;verified:boolean;provenance:string},session:MerchantSession):{address:string;network:string;provenance:string};
export function reviewOnlyPayment(input:{merchantId:string;network:string;rail:string;atomicUnits:string;destination:string;intentId:string},session:MerchantSession):{status:string;canBroadcast:false;canSettle:false};
