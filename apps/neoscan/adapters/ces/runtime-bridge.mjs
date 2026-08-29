import {createCesAdapter} from './adapter.mjs';
import {createCesAuthorizedSessionTransport} from './session-transport.mjs';

export const CES_RUNTIME_BRIDGE_SCHEMA='neo.ces.runtime.bridge.v1';
const clean=value=>String(value??'').trim();

export function createCesRuntimeBridge(config={}){
  const mode=clean(config.mode)||'status';
  const network=clean(config.network);
  const account=clean(config.account);
  const endpoint=clean(config.endpoint);
  const readUrl=clean(config.readUrl);
  const token=clean(config.token);
  const sessionCookie=clean(config.sessionCookie);
  const fetchImpl=config.fetchImpl||fetch;
  const adapter=createCesAdapter({endpoint,network,account,authMode:'bearer',fetchImpl});
  const session=createCesAuthorizedSessionTransport({readUrl,network,account,fetchImpl});

  function status(){
    return {
      schema:CES_RUNTIME_BRIDGE_SCHEMA,
      mode,
      readOnly:true,
      cloudflareRequired:false,
      credentialPersistence:false,
      api:adapter.status(),
      session:session.status()
    };
  }

  async function read({signal}={}){
    if(mode==='status')return {state:'READY_FOR_AUTHORIZED_CONNECTION',status:status()};
    if(mode==='api-readonly'){
      if(!endpoint||!account||!token)throw new Error('api-readonly requires CES_ENDPOINT, CES_ACCOUNT, and CES_API_TOKEN');
      const [balance,transactions]=await Promise.all([
        adapter.getBalance({token,signal}),
        adapter.getTransactions({token,signal,limit:25})
      ]);
      return {state:'LIVE_READONLY',transport:'api',balance,transactions};
    }
    if(mode==='session-readonly'){
      if(!readUrl||!account||!sessionCookie)throw new Error('session-readonly requires CES_SESSION_READ_URL, CES_ACCOUNT, and runtime CES_SESSION_COOKIE');
      const snapshot=await session.readSnapshot({sessionCookie,signal});
      return {state:'LIVE_READONLY',transport:'authorized-session',snapshot};
    }
    throw new Error(`Unsupported NEO_CES_MODE: ${mode}`);
  }

  return {status,read};
}
