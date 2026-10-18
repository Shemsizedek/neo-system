import {createOidcVerifier} from './oidc-verifier.mjs';
import {createStagingOperatorHandler} from './operator-handler.mjs';
import {validateStagingConfig} from './neon-adapter.mjs';
export function buildSecuredStagingHandler({env=process.env,store,fetchImpl}={}){
 const cfg=validateStagingConfig(env);
 if(!cfg.valid)throw new Error('staging_config_blocked:'+cfg.errors.join(','));
 if(env.STAGING_ACCESS_PROXY_VERIFIED!=='true')throw new Error('verified_private_gateway_required');
 if(!store?.listMetadata)throw new Error('lead_store_required');
 const verifyIdentity=createOidcVerifier({issuer:env.OIDC_ISSUER,audience:env.OIDC_AUDIENCE,jwksUri:env.OIDC_JWKS_URI,fetchImpl});
 return createStagingOperatorHandler({enabled:true,verifyIdentity,store});
}
