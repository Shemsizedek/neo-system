import {createHmac,randomUUID} from 'node:crypto';

const ORIGINS = Object.freeze({testnet:'https://api-test.nicehash.com',mainnet:'https://api2.nicehash.com'});
const ORDER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Implements the signature framing in NiceHash's official REST client examples.
 * Only server-side code may instantiate this client. Never bundle credentials.
 * There is no purchase, refill, transfer, withdrawal, or cancellation method.
 */
export function signReadRequest({key,secret,organizationId,time,nonce,path,query=''}) {
  for (const value of [key,secret,organizationId,time,nonce,path,query]) {
    if (typeof value !== 'string' || value.includes('\0')) throw new Error('NICEHASH_SIGNING_INPUT_INVALID');
  }
  const message = [key,time,nonce,'',organizationId,'','GET',path,query].join('\0');
  return createHmac('sha256',secret).update(message).digest('hex');
}

export function createNiceHashReadOnlyClient({network='testnet',key='',secret='',organizationId='',fetchImpl=fetch,now=Date.now}={}) {
  if (!Object.hasOwn(ORIGINS,network)) throw new Error('NICEHASH_NETWORK_NOT_APPROVED');
  const origin = ORIGINS[network];
  async function read(path,authenticated=false) {
    const allowed = path === '/main/api/v2/public/buy/info' || path === '/main/api/v2/hashpower/myOrders' || /^\/main\/api\/v2\/hashpower\/order\/[0-9a-f-]{36}\/stats$/i.test(path);
    if (!allowed) throw new Error('NICEHASH_READ_ENDPOINT_NOT_APPROVED');
    const headers = {accept:'application/json'};
    if (authenticated) {
      if (!key || !secret || !organizationId) throw new Error('NICEHASH_READ_CREDENTIALS_REQUIRED');
      const time = String(now());const nonce = randomUUID();
      headers['X-Time'] = time;headers['X-Nonce'] = nonce;headers['X-Organization-Id'] = organizationId;
      headers['X-Auth'] = `${key}:${signReadRequest({key,secret,organizationId,time,nonce,path})}`;
    }
    const response = await fetchImpl(origin + path,{method:'GET',headers,redirect:'error',signal:AbortSignal.timeout(8000)});
    if (!response.ok) throw new Error(`NICEHASH_READ_FAILED_${response.status}`);
    const length = Number(response.headers?.get?.('content-length') || 0);
    if (length > 2000000) throw new Error('NICEHASH_RESPONSE_TOO_LARGE');
    const raw = await response.text();
    if (Buffer.byteLength(raw) > 2000000) throw new Error('NICEHASH_RESPONSE_TOO_LARGE');
    let data;try { data = JSON.parse(raw); } catch { throw new Error('NICEHASH_RESPONSE_INVALID'); }
    if (!data || typeof data !== 'object') throw new Error('NICEHASH_RESPONSE_INVALID');
    return {provider:'NICEHASH',network,observedAt:new Date(now()).toISOString(),authoritativeForSettlement:false,authoritativeForTokenIssuance:false,data};
  }
  return Object.freeze({
    provider:'NICEHASH',network,
    marketInfo:() => read('/main/api/v2/public/buy/info'),
    myOrders:() => read('/main/api/v2/hashpower/myOrders',true),
    orderStatistics:orderId => {
      if (typeof orderId !== 'string' || !ORDER_ID.test(orderId)) throw new Error('NICEHASH_ORDER_ID_INVALID');
      return read(`/main/api/v2/hashpower/order/${orderId}/stats`,true);
    }
  });
}

/** An allowlisted diagnostic, not a public proxy for raw provider/account records. */
export async function niceHashDevelopmentStatus({env=process.env,fetchImpl=fetch}={}) {
  if (!env.NICEHASH_TEST_API_KEY || !env.NICEHASH_TEST_API_SECRET || !env.NICEHASH_TEST_ORGANIZATION_ID) return {provider:'NICEHASH',network:'testnet',connected:false,status:'READ_ONLY_TEST_CREDENTIALS_NOT_CONFIGURED',purchasesEnabled:false,tokenIssuanceEnabled:false};
  try {
    const client = createNiceHashReadOnlyClient({key:env.NICEHASH_TEST_API_KEY,secret:env.NICEHASH_TEST_API_SECRET,organizationId:env.NICEHASH_TEST_ORGANIZATION_ID,fetchImpl});
    await client.myOrders();
    return {provider:'NICEHASH',network:'testnet',connected:true,status:'TEST_ACCOUNT_READ_VERIFIED',purchasesEnabled:false,tokenIssuanceEnabled:false};
  } catch {
    return {provider:'NICEHASH',network:'testnet',connected:false,status:'TEST_ACCOUNT_READ_UNAVAILABLE',purchasesEnabled:false,tokenIssuanceEnabled:false};
  }
}
