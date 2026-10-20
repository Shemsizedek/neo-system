import {installFreewalletPopup,freewalletRuntime} from './freewallet.mjs';
// Call only from an isolated, trusted wallet page. Never load this on checkout.
export function startFreewalletCompanion(scope,{ledger,merchantOrigin,allowedMerchants}){
 if(!Array.isArray(allowedMerchants)||!allowedMerchants.includes(merchantOrigin))throw Error('Merchant is not approved by this wallet installation.');
 return installFreewalletPopup(scope,{runtime:freewalletRuntime(scope),ledger,merchantOrigin,
  approve:async request=>{
   const lines=['NeoMask connection',`Website: ${request.origin}`,`Ledger: ${ledger}`,`Account: ${scope.FW.WALLET_ADDRESS}`];
   if(request.summary){const s=request.summary;lines[0]='Review Bitcoin transaction';
    for(const output of s.outputs)lines.push(output.type==='counterparty'?'Counterparty data':`${output.change?'Change':'Recipient'}: ${output.address} — ${output.sats} satoshis`);
    if(s.assetTransfer)lines.push('Asset transfer: '+JSON.stringify(s.assetTransfer));
    lines.push(`Network fee: ${s.feeSats} satoshis`,`Inputs: ${s.inputs}`,'Sign all inputs using SIGHASH_ALL?');
   }else lines.push('Allow this website to see this account for ten minutes?');
   return scope.confirm(lines.join('\n'))===true;
  }
 });
}
