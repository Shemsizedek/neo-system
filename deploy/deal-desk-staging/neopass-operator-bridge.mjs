// CASHFLOW-016A: NEO Pass operator bridge.
// Trust only an authenticated server-side session verifier, never JWT claims
// decoded in the browser, x-user-* headers, or user-controlled role strings.
export function createNeopassOperatorBridge({verifySession,authorizeOperator}={}){
 if(typeof verifySession!=='function'||typeof authorizeOperator!=='function')
   throw new Error('neopass_authority_not_configured');
 return async function verifyIdentity(req){
   const session=await verifySession(req);
   if(!session?.authenticated||!session.subject)throw new Error('invalid_neopass_session');
   // Permissions must come from a protected authoritative registry, not claims
   // supplied by clients or role strings in legacy tokens.
   const decision=await authorizeOperator(session.subject,'neo_sales_operator');
   if(decision!==true)throw new Error('operator_permission_denied');
   return {verified:true,subject:session.subject,roles:['neo_sales_operator']};
 };
}
