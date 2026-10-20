export const LEDGERS = ['classic','cp20'];
export function trustedOrigin(sender) {
  if (!sender.tab || sender.frameId !== 0) throw new Error('Top-level page required');
  const origin = new URL(sender.url).origin;
  if (origin !== 'https://holytemples.org') throw new Error('Site not enabled');
  return origin;
}
export function validLedger(value) {
  if (!LEDGERS.includes(value)) throw new Error('Select Classic or Counterparty 2.0');
  return value;
}
export async function validAddress(address) {
  if (typeof address !== 'string' || !/^1[1-9A-HJ-NP-Za-km-z]{25,34}$/.test(address)) return false;
  const alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let value=0n;
  for (const c of address) value=value*58n+BigInt(alphabet.indexOf(c));
  const bytes=[];
  while(value){bytes.unshift(Number(value&255n));value>>=8n;}
  for(const c of address){if(c!=='1')break;bytes.unshift(0);}
  if(bytes.length!==25 || bytes[0]!==0)return false;
  const first=await crypto.subtle.digest('SHA-256',new Uint8Array(bytes.slice(0,21)));
  const second=new Uint8Array(await crypto.subtle.digest('SHA-256',first));
  return bytes.slice(21).every((v,i)=>v===second[i]);
}
export function permissionKey(origin,ledger){return 'grant:'+origin+':'+validLedger(ledger);}
export function readAccount(grant, now=Date.now()) {
  if(!grant || grant.expiresAt<=now)throw new Error('Connect through the NeoMask approval window');
  return {address:grant.address,network:'mainnet',ledger:grant.ledger,watchOnly:true,signingAvailable:false};
}

