import { inspectNeopassReadiness } from './neopass-readiness.mjs';

// Explicit opt-in entrypoint for a separately configured authentication service.
// Never fall back to unauthenticated platform mode on a missing dependency.
export async function launchAuthenticatedNeopass({env=process.env,start}={}) {
  const result=inspectNeopassReadiness(env);
  if(!result.ready) {
    const err=new Error('neopass_configuration_incomplete');
    err.checks=result.checks;throw err;
  }
  if(typeof start!=='function')throw Error('authenticated_server_factory_required');
  return start();
}
if(process.argv[1] && import.meta.url===new URL('file://'+process.argv[1]).href) {
  try {
    await launchAuthenticatedNeopass({start:async()=>{
      const {startNeoPlatformApi}=await import('./server.mjs');
      return startNeoPlatformApi();
    }});
  }catch(error){
    console.error(JSON.stringify({error:'neopass_startup_blocked',checks:error.checks||null}));
    process.exitCode=1;
  }
}
