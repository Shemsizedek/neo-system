import {createNeoMaskRouter, discoverNeoMaskWallets} from './neomask-router.mjs';
// Uses the same injected provider contract as src/neopay/signerAdapters.ts.
// Account connection is not proof of signing authority or settlement readiness.
export async function connectStewardshipWallet(provider, expectedAddress = '', ledger) {
  if (!provider?.isNeoMask || typeof provider.connect !== 'function' || (typeof provider.signRawTransaction !== 'function' && typeof provider.signPsbt !== 'function')) {
    throw new Error('NeoMask was not found. Set up NeoMask, then reload this page.');
  }
  if (!['classic','cp20'].includes(ledger)) throw new Error('Choose your wallet version in currency & wallet settings first.');
  const account = await provider.connect({ledger});
  if (account?.watchOnly || account?.signingAvailable === false) throw new Error('Open NeoMask and set up a signing account before connecting.');
  if (account?.ledger && ledger && account.ledger !== ledger) throw new Error('Connected wallet ledger does not match checkout.');
  const network = String(account?.network || '').toLowerCase();
  if (!['mainnet','bitcoin','livenet'].includes(network)) throw new Error('The wallet must explicitly report Bitcoin mainnet.');
  const address = String(account?.address || '').trim();
  if (!/^1[1-9A-HJ-NP-Za-km-z]{25,34}$/.test(address)) throw new Error('This checkout currently accepts legacy mainnet Counterparty addresses beginning with 1.');
  if (expectedAddress && address !== expectedAddress) throw new Error('The connected merchant account does not match the configured treasury.');
  return {address, network:'mainnet', name:'NeoMask', rawSigningAdvertised:typeof provider.signRawTransaction === 'function', psbtSigningAdvertised:typeof provider.signPsbt === 'function', signingTested:false};
}
export function mountWalletConnections(root, scope = window) {
  const status=root.querySelector('[data-connect-status]'),member=root.querySelector('[data-connect-member]'),merchant=root.querySelector('[data-connect-merchant]');
  const install=root.querySelector('[data-neomask-install]'),picker=root.querySelector('[data-neomask-wallets]'),disconnect=root.querySelector('[data-neomask-disconnect]');
  let router=null,working=false;
  const ledger=()=>root.closest('section')?.getAttribute('data-selected-ledger');
  const input=()=>root.closest('section')?.querySelector('[name=wallet]');
  const reset=()=>{if(input())input().value='';if(disconnect)disconnect.hidden=true;status.textContent='Wallet changed or disconnected. Connect NeoMask again.';};
  const choose=async(id,expected)=>{
    if(working)return;working=true;
    if(picker)picker.hidden=true;
    status.textContent='Approve the connection in your selected wallet…';
    try{
      const provider={isNeoMask:true,connect:params=>router.connect({...params,walletId:id}),signPsbt:router.signPsbt};
      const session=await connectStewardshipWallet(provider,expected,ledger());
      if(!expected && input())input().value=session.address;
      status.textContent='NeoMask connected · '+(await router.getAccount()).walletName+' · '+session.address;
      if(disconnect)disconnect.hidden=false;
    }catch(e){await router.disconnect().catch(()=>{});status.textContent=e.message || 'Connection cancelled. Try again.';}
    finally{working=false;}
  };
  const open=async expected=>{
    if(working)return;
    if(!['classic','cp20'].includes(ledger())){status.textContent='Choose your wallet version in settings first.';return;}
    try{
      if(!router){
        router=discoverNeoMaskWallets(scope,createNeoMaskRouter());
        router.onChange(reset);
      }
      const wallets=router.list(ledger()).filter(w=>w.available);
      if(!wallets.length){router=null;status.textContent='No compatible wallet found for this version.';if(install)install.hidden=false;return;}
      if(install)install.hidden=true;
      await router.disconnect();
      if(!picker){await choose(wallets[0].id,expected);return;}
      picker.replaceChildren();
      const title=root.ownerDocument.createElement('p');title.textContent='Choose a wallet through NeoMask';picker.append(title);
      for(const wallet of wallets){const button=root.ownerDocument.createElement('button');button.type='button';button.textContent=wallet.name;button.addEventListener('click',()=>choose(wallet.id,expected));picker.append(button);}
      picker.hidden=false;status.textContent='Your wallet will ask you to approve the connection.';
    }catch(e){status.textContent=e.message || 'NeoMask could not open.';}
  };
  member?.addEventListener('click',()=>open(''));
  merchant?.addEventListener('click',()=>open('1Ky2wRYYrJzqdQJH64F7TR98fqLxJs7LK8'));
  disconnect?.addEventListener('click',async()=>{if(working)return;try{await router?.disconnect();}catch(e){status.textContent=e.message;}});
}
