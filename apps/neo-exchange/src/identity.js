export const FOUNDER_SUBJECT='neo:founder:000001';
export const FOUNDER_ACCOUNT_ORDINAL=1;
export const FOUNDER_ROLE='founder_owner';

export const marketIdentity=Object.freeze({
  productId:'neo-exchange',
  subjectId:FOUNDER_SUBJECT,
  accountOrdinal:FOUNDER_ACCOUNT_ORDINAL,
  role:FOUNDER_ROLE,
  reserved:true,
  verifiedEnrollmentRequired:true,
  authenticationBypass:false,
  orderSigningBypass:false,
  custodyBypass:false,
  settlementBypass:false,
  marketAdminBypass:false
});

export function canUseTradingAuthority({authenticated=false,verifiedEnrollment=false,hasTradingPermission=false,hasSigningAuthority=false}={}){
  return authenticated&&verifiedEnrollment&&hasTradingPermission&&hasSigningAuthority;
}

export function canUseMarketAdmin({authenticated=false,verifiedEnrollment=false,hasAdminPermission=false,stepUpApproved=false}={}){
  return authenticated&&verifiedEnrollment&&hasAdminPermission&&stepUpApproved;
}

export function assertFounderMarketReservation(subjectId,accountOrdinal){
  if(accountOrdinal!==1) return true;
  if(subjectId!==FOUNDER_SUBJECT) throw new Error('NEO market Account #1 is reserved for the canonical founder principal.');
  return true;
}
