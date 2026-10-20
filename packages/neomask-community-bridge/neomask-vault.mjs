// Wallet-side integration for NEO Pay and Counterpay using the installed NeoMask vault.
// Each connect/sign call still opens NeoMask's trusted extension approval UI.
import {registerWalletBridge} from './index.mjs';
export function connectNeoMaskVault(scope,{id='neopay',provider=scope.neoMask}={}){
 if(!['neopay','counterpay'].includes(id))throw Error('Use the actual wallet application identity.');
 if(!provider?.isNeoMask||!['connect','getAccount','signPsbt','disconnect'].every(k=>typeof provider[k]==='function'))throw Error('Install and enable NeoMask for this site.');
 const sessions=new Map();let busy=false;
 const read=async ledger=>{
  const a=await provider.getAccount({ledger});
  if(a?.ledger!==ledger||a.network!=='mainnet'||a.watchOnly||a.signingAvailable!==true)throw Error('Select a signing mainnet account for this ledger.');return a;
 };
 const request=async({origin,session,method,params={}})=>{
  if(origin!==scope.location.origin||!origin.startsWith('https://'))throw Error('Wallet origin mismatch.');
  if(busy)throw Error('Finish the current wallet request first.');busy=true;
  try{
   const {ledger}=params;if(!['classic','cp20'].includes(ledger))throw Error('Unsupported ledger.');
   if(method==='connect'){const approved=await provider.connect({ledger}),a=await read(ledger);if(a.address!==approved.address)throw Error('Wallet changed.');sessions.set(session,{address:a.address,ledger});return a;}
   const s=sessions.get(session);
   if(method==='disconnect'){sessions.delete(session);if(s?.ledger===ledger)return provider.disconnect({ledger});return null;}
   if(!s||s.ledger!==ledger)throw Error('Connect NeoMask again.');
   const before=await read(ledger);if(before.address!==s.address){sessions.delete(session);throw Error('Wallet changed.');}
   if(method==='getAccount')return before;
   if(method!=='signPsbt')throw Error('Unsupported method.');
   // The NeoMask vault reviews and signs all owned inputs, never a subset.
   // Its trusted popup decodes every output and enforces SIGHASH_ALL.
   const signed=await provider.signPsbt(params.hex,ledger);
   const after=await read(ledger);if(after.address!==s.address){sessions.delete(session);throw Error('Wallet changed.');}
   return typeof signed==='string'?signed:signed?.psbtHex;
  }finally{busy=false;}
 };
 return registerWalletBridge(scope,{id,ledgers:['classic','cp20'],request});
}
