import {createScopedMailVerifier} from './scoped-mail-verifier.mjs';
import {createMailRouter,createTitanConnector} from './mail-connectors.mjs';

/**
 * NEO Pass must be configured to match the actual issuer contract before use.
 * Creating this object never enables an HTTP route or grants mailbox access.
 */
export function createMailSecurityRuntime({env=process.env,verifyIdentity,clientFactory,isRevoked}={}) {
  const verifier=verifyIdentity ?? createScopedMailVerifier({
    issuer:env.NEOPASS_ISSUER,
    audience:env.NEOPASS_MAIL_AUDIENCE,
    jwksUrl:env.NEOPASS_JWKS_URL,
    isRevoked
  });
  return createMailRouter({
    verifyIdentity:verifier,
    connectors:{titan:createTitanConnector({env,clientFactory})}
  });
}
