import {authorizeRoute} from './provider-registry.mjs';
import {titanConfig,latestTitanMessages} from './titan-adapter.mjs';

/** Explicitly injected connectors: no auto-discovery, silent fallback or shared credentials. */
export function createMailRouter({connectors={},verifyIdentity}={}) {
  return Object.freeze({
    async readInbox({provider,grant,identity,limit=10}={}) {
      const decision=authorizeRoute({provider,capability:'inbound-read',grant});
      if (!decision.allowed) return {ok:false,reason:decision.reason};
      // Identity must be verified by a trusted server-side verifier, never a caller-supplied flag.
      const principal=typeof verifyIdentity==='function' ? await verifyIdentity(identity) : null;
      if (!principal || principal.verified!==true || principal.mailbox!==grant.mailbox ||
          principal.subject!==grant.subject || !principal.subject) {
        return {ok:false,reason:'identity_not_verified'};
      }
      if (typeof connectors[provider]?.readInbox!=='function') return {ok:false,reason:'connector_unavailable'};
      const messages=await connectors[provider].readInbox({limit,mailbox:grant.mailbox});
      return {ok:true,provider,messages};
    }
  });
}

/** Titan adapter is scoped to exactly one configured mailbox. No outbound actions. */
export function createTitanConnector({env=process.env,clientFactory}={}) {
  return Object.freeze({
    async readInbox({limit=10,mailbox}={}) {
      const config=titanConfig(env);
      if (!mailbox || mailbox.toLowerCase()!==config.auth.user.toLowerCase()) {
        throw new Error('mailbox_scope_mismatch');
      }
      return latestTitanMessages({config,clientFactory,limit});
    }
  });
}
