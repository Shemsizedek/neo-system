/**
 * NEO Mail authorization contract. Identity claims alone are not mail permissions.
 * A trusted issuer must mint a dedicated, short-lived, mailbox-scoped grant.
 */
export function validateMailGrant(claims,{subject,mailbox,audience='neo-mail',now=Math.floor(Date.now()/1000)}={}){
 if(!claims || !subject || !mailbox) return false;
 if(claims.sub!==subject || claims.aud!==audience || claims.token_use!=='mail-access' || claims.scope!=='mail:read') return false;
 if(claims.mailbox!==mailbox || typeof claims.jti!=='string' || !claims.jti) return false;
 if(!Number.isInteger(claims.iat) || !Number.isInteger(claims.exp) || claims.iat>now+5 || claims.exp<=now || claims.exp-claims.iat>300) return false;
 return true;
}
