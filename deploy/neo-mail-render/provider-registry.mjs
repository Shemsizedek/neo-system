/** NEO Mail provider registry. A registry entry is not authorization. */
export const MAIL_CAPABILITIES = Object.freeze(['inbound-read','outbound-send','identity','site-admin','hosting']);
export const PROVIDERS = Object.freeze({
  titan: Object.freeze({capabilities:['inbound-read','outbound-send'],protocols:['imap-tls','smtp-tls'],status:'requires_authentication'}),
  wordpress: Object.freeze({capabilities:['site-admin'],protocols:['wordpress-rest'],status:'independent'}),
  wpvibe: Object.freeze({capabilities:['site-admin'],protocols:['mcp'],status:'independent'}),
  neopass: Object.freeze({capabilities:['identity'],protocols:['oidc'],status:'not_connected'}),
  render: Object.freeze({capabilities:['hosting'],protocols:['https'],status:'staging'})
});
/** Require explicit capability grants; never silently fail over to another provider or mailbox. */
export function authorizeRoute({provider,capability,grant}={}){
  if(!Object.hasOwn(PROVIDERS,provider))return {allowed:false,reason:'unknown_provider'};
  if(!MAIL_CAPABILITIES.includes(capability)||!PROVIDERS[provider].capabilities.includes(capability))return {allowed:false,reason:'unsupported_capability'};
  if(!grant||grant.provider!==provider||grant.capability!==capability||grant.verified!==true)return {allowed:false,reason:'authorization_required'};
  return {allowed:true};
}
