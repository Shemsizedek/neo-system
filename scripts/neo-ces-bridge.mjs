import {createCesRuntimeBridge} from '../apps/neoscan/adapters/ces/runtime-bridge.mjs';

const bridge=createCesRuntimeBridge({
  mode:process.env.NEO_CES_MODE,
  endpoint:process.env.CES_ENDPOINT,
  readUrl:process.env.CES_SESSION_READ_URL,
  network:process.env.CES_NETWORK,
  account:process.env.CES_ACCOUNT,
  token:process.env.CES_API_TOKEN,
  sessionCookie:process.env.CES_SESSION_COOKIE
});

const status=bridge.status();
const result=await bridge.read();

console.log(JSON.stringify({
  service:'neo-ces-bridge',
  controlPlane:'discord-primary',
  runtimeDependency:'provider-neutral',
  cloudflareRequired:false,
  readOnly:true,
  status,
  ...result,
  note: status.mode==='status'
    ? 'Ready for an authorized CES API or session transport. No credentials are persisted.'
    : undefined
},null,2));
