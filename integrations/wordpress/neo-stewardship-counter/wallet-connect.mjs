import {createNeoMaskRouter, discoverNeoMaskWallets, neoMaskWalletChoices} from './neomask-router.mjs?ver=0.21.0';
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
  if (expectedAddress && address !== expectedAddress) throw new Error('The connected wallet does not match the configured account.');
  return {address, network:'mainnet', name:'NeoMask', rawSigningAdvertised:typeof provider.signRawTransaction === 'function', psbtSigningAdvertised:typeof provider.signPsbt === 'function', signingTested:false};
}
export function mountWalletConnections(root, scope = window) {
  const status=root.querySelector('[data-connect-status]'),member=root.querySelector('[data-connect-member]');
  const install=root.querySelector('[data-neomask-install]'),picker=root.querySelector('[data-neomask-wallets]'),disconnect=root.querySelector('[data-neomask-disconnect]');
  let router=null,working=false;
  const ledger=()=>root.closest('section')?.getAttribute('data-selected-ledger');
  const input=()=>root.closest('section')?.querySelector('[name=wallet]');
  const reset=()=>{if(input())input().value='';if(disconnect)disconnect.hidden=true;if(member)member.hidden=false;status.textContent='Wallet changed or disconnected. Connect NeoMask again.';};
  const choose=async(id,expected)=>{
    if(working)return;working=true;
    if(picker)picker.hidden=true;
    status.textContent='Approve the connection in your selected wallet…';
    try{
      const provider={isNeoMask:true,connect:params=>router.connect({...params,walletId:id}),signPsbt:router.signPsbt};
      const session=await connectStewardshipWallet(provider,expected,ledger());
      if(!expected && input())input().value=session.address;
      status.textContent='NeoMask connected · '+(await router.getAccount()).walletName+' · '+session.address;
      if(disconnect)disconnect.hidden=false;if(member)member.hidden=true;
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
      const wallets=neoMaskWalletChoices(router,ledger());
      if(install)install.hidden=wallets.some(w=>w.available);
      if(!picker&&!wallets.some(w=>w.available)){status.textContent='No compatible wallet connection found.';return;}
      await router.disconnect();
      if(!picker){const available=wallets.find(w=>w.available);if(available)await choose(available.id,expected);return;}
      picker.replaceChildren();
      const title=root.ownerDocument.createElement('p');title.textContent='Choose a wallet through NeoMask';picker.append(title);
      for(const wallet of wallets){const row=root.ownerDocument.createElement('div'),button=root.ownerDocument.createElement('button');button.type='button';button.textContent=wallet.name;button.disabled=!wallet.available;if(wallet.available)button.addEventListener('click',()=>choose(wallet.id,expected));row.append(button);if(!wallet.available){const note=root.ownerDocument.createElement('span');note.textContent=' — '+(router.list(ledger()).some(w=>w.id===wallet.id)?'Choose a supported wallet version':'Browser connection not detected');row.append(note);if(wallet.url){const link=root.ownerDocument.createElement('a');link.href=wallet.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent=' Open wallet';row.append(link);}}picker.append(row);}
      picker.hidden=false;status.textContent='Your wallet will ask you to approve the connection.';
    }catch(e){status.textContent=e.message || 'NeoMask could not open.';}
  };
  root.closest('section')?.addEventListener?.('neo:context-change',async()=>{try{await router?.disconnect();}finally{router=null;reset();if(picker)picker.hidden=true;}});
  member?.addEventListener('click',()=>open(''));
  disconnect?.addEventListener('click',async()=>{if(working)return;try{await router?.disconnect();}catch(e){status.textContent=e.message;}});
}
