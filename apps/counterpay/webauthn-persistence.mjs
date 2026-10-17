// Persistence contracts — database implementation required before deployment.
// Redis-style challenge store uses atomic GETDEL and SET NX PX for one-time challenges.
export function createRedisChallengeStore(redis){
 if(!redis||typeof redis.set!=='function'||typeof redis.getDel!=='function')throw Error('Atomic Redis operations required');
 const key=nonce=>'counterpay:webauthn:'+nonce;
 return Object.freeze({
  async issue(nonce,value){
   if(typeof nonce!=='string'||!nonce)throw Error('Invalid nonce');
   const ok=await redis.set(key(nonce),JSON.stringify(value),{NX:true,PX:120000});
   if(ok!=='OK')throw Error('Duplicate challenge');
  },
  async consume(nonce){const data=await redis.getDel(key(nonce));return data?JSON.parse(data):null}
 });
}
// Credential repository contract:
// get(id) -> {publicKey: number[]/Uint8Array, counter: integer, transports, revoked}
// updateCounter(id,oldCounter,newCounter) -> true ONLY after an atomic
// credential-ID-scoped compare-and-swap, rejecting counters <= oldCounter
// when both are nonzero. Accommodate zero-counter authenticators under
// an explicit authenticator-specific policy; never silently assume safety.
