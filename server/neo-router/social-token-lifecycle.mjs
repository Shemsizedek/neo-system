import {refreshSocialAccessToken} from './social-oauth.mjs';

export function connectionExpiresAt(connection){
  if(!connection)return null;
  if(Number.isFinite(connection.expiresAt))return connection.expiresAt;
  if(Number.isFinite(connection.connectedAt)&&Number.isFinite(connection.expiresIn))return connection.connectedAt+(connection.expiresIn*1000);
  return null;
}

export function connectionNeedsRefresh(connection,{now=Date.now(),skewMs=5*60*1000}={}){
  const expiresAt=connectionExpiresAt(connection);
  return Number.isFinite(expiresAt)&&expiresAt-now<=skewMs;
}

export function createSocialTokenResolver({store,env=process.env,fetchImpl=fetch}={}){
  if(!store)throw new Error('oauth_store_required');
  return async function resolveToken(identityId,providerId){
    let connection=await store.getConnection(identityId,providerId);
    if(!connection)return {status:'connection-required',accessToken:null,connection:null};
    if(connectionNeedsRefresh(connection)){
      if(!connection.refreshToken)return {status:'reauthorization-required',accessToken:null,connection};
      const refreshed=await refreshSocialAccessToken({providerId,refreshToken:connection.refreshToken,env,fetchImpl});
      const connectedAt=Date.now();
      connection={...connection,accessToken:refreshed.accessToken,refreshToken:refreshed.refreshToken||connection.refreshToken,expiresIn:refreshed.expiresIn,expiresAt:Number.isFinite(refreshed.expiresIn)?connectedAt+refreshed.expiresIn*1000:null,scope:refreshed.scope||connection.scope,connectedAt,refreshedAt:connectedAt};
      await store.saveConnection(connection);
    }
    return {status:'connected',accessToken:connection.accessToken,connection};
  };
}
