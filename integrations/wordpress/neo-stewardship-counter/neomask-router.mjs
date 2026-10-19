// NeoMask application router. Signing stays in the wallet the user selects.
const LEDGERS = ['classic', 'cp20'];
const hexPsbt = value => typeof value === 'string' && /^70736274ff(?:[a-f0-9]{2})+$/i.test(value) && value.length <= 2000000;
function account(value, ledger) {
  if (!value || value.watchOnly || value.signingAvailable === false) throw new Error('Set up a signing account in your wallet.');
  if (!['mainnet','bitcoin','livenet'].includes(String(value.network || '').toLowerCase())) throw new Error('Choose Bitcoin mainnet in your wallet.');
  if (value.ledger !== ledger) throw new Error('Wallet version does not match this checkout.');
  if (!/^1[1-9A-HJ-NP-Za-km-z]{25,34}$/.test(value.address || '')) throw new Error('Select a Legacy receiving account in your wallet.');
  return {address:value.address,network:'mainnet',ledger,signingAvailable:true,watchOnly:false};
}
export function xcpWalletAdapter(provider) {
  const read = async () => {
    const addresses = await provider.request({method:'xcp_accounts'});
    const network = await provider.request({method:'xcp_getNetwork'});
    return {address:addresses?.[0],network,ledger:'cp20'};
  };
  return {
    name:'XCP Wallet',ledgers:['cp20'],
    async connect() {await provider.request({method:'xcp_requestAccounts'});return read();},
    getAccount:read,
    disconnect:()=>provider.request({method:'xcp_disconnect'}),
    async signPsbt(hex) {const result=await provider.request({method:'xcp_signPsbt',params:[{hex}]});return result?.hex;},
    on:provider.on?.bind(provider),removeListener:provider.removeListener?.bind(provider)
  };
}
export function createNeoMaskRouter() {
  const wallets=new Map();let active=null,revision=0,busy=false;
  const changes=new Set();
  const invalidate=()=>{revision++;active=null;for(const handler of changes)handler();};
  const validWallet=p=>p && typeof p.connect==='function' && typeof p.getAccount==='function' && typeof p.signPsbt==='function' && typeof p.disconnect==='function' && Array.isArray(p.ledgers) && p.ledgers.length && p.ledgers.every(l=>LEDGERS.includes(l));
  return Object.freeze({
    name:'NeoMask',isNeoMask:true,
    register(id,name,provider) {
      if(!/^[a-z][a-z0-9-]{0,39}$/.test(id) || wallets.has(id) || !validWallet(provider)) throw new Error('Wallet adapter needs account, ledger, disconnect and PSBT signing APIs.');
      wallets.set(id,{id,name:String(name).slice(0,60),provider});
      const changed=()=>{if(active)invalidate();};
      provider.on?.('accountsChanged',changed);provider.on?.('disconnect',changed);
    },
    list(ledger) {return [...wallets.values()].map(({id,name,provider})=>({id,name,available:provider.ledgers.includes(ledger)}));},
    onChange(handler) {changes.add(handler);return()=>changes.delete(handler);},
    async connect({ledger,walletId}={}) {
      if(busy)throw new Error('Finish the current wallet request first.');
      if(!LEDGERS.includes(ledger))throw new Error('Choose your wallet version first.');
      const wallet=wallets.get(walletId);if(!wallet || !wallet.provider.ledgers.includes(ledger))throw new Error('Choose a wallet that supports this version.');
      if(active)throw new Error('Disconnect your current wallet before switching.');
      busy=true;const current=++revision;
      try {const next=account(await wallet.provider.connect({ledger}),ledger);if(current!==revision)throw new Error('Wallet changed. Connect again.');const live=account(await wallet.provider.getAccount({ledger}),ledger);if(current!==revision||live.address!==next.address)throw new Error('Wallet changed. Connect again.');active={wallet,account:next};return {...next,walletName:wallet.name};}
      finally {busy=false;}
    },
    async getAccount() {
      if(!active)throw new Error('Connect NeoMask first.');
      const current=revision,session=active;
      const next=account(await session.wallet.provider.getAccount({ledger:session.account.ledger}),session.account.ledger);
      if(current!==revision || next.address!==session.account.address){invalidate();throw new Error('Wallet changed. Connect again.');}
      return {...next,walletName:session.wallet.name};
    },
    async disconnect() {const session=active;invalidate();if(session)await session.wallet.provider.disconnect({ledger:session.account.ledger});},
    async signPsbt(hex,ledger,options={}) {
      if(busy)throw new Error('Finish the current wallet request first.');
      if(!hexPsbt(hex))throw new Error('Invalid PSBT.');
      if(!active || active.account.ledger!==ledger)throw new Error('Connect the selected wallet version first.');
      busy=true;const session=active,current=revision;
      const check=async()=>{const next=account(await session.wallet.provider.getAccount({ledger}),ledger);if(current!==revision||next.address!==session.account.address){invalidate();throw new Error('Wallet changed. Connect again.');}};
      try {await check();const signed=await session.wallet.provider.signPsbt(hex,ledger,options);await check();if(!hexPsbt(signed))throw new Error('Wallet returned an invalid signed PSBT.');return signed;}
      finally {busy=false;}
    }
  });
}
export function discoverNeoMaskWallets(scope, router) {
  if(scope.neoMask?.isNeoMask) {
    const p=scope.neoMask;
    router.register('vault','NeoMask vault',{ledgers:['classic','cp20'],connect:p.connect.bind(p),getAccount:p.getAccount.bind(p),disconnect:p.disconnect.bind(p),async signPsbt(hex,ledger){const r=await p.signPsbt(hex,ledger);return typeof r==='string'?r:r?.psbtHex;}});
  }
  if(typeof scope.HorizonWalletProvider?.request==='function')router.register('horizon','Horizon Wallet',horizonWalletAdapter(scope.HorizonWalletProvider));
  if(typeof scope.xcpwallet?.request==='function')router.register('xcp-wallet','XCP Wallet',xcpWalletAdapter(scope.xcpwallet));
  // The owned NEOpay contract must explicitly declare supported ledgers.
  const p=scope.neoBitcoinSigner;
  if(p?.getAccount && p?.signPsbt && p?.disconnect && p?.ledgers)router.register('neopay',p.name || 'NEOpay',p);
  for(const id of ['freewallet','counterpay','neopay']){
    const bridge=scope.neoMaskWalletAdapters?.[id];
    if(bridge?.neoMaskAdapterVersion===1&&!router.list('cp20').some(w=>w.id===id))router.register(id,NEO_MASK_WALLET_CHOICES.find(w=>w.id===id).name,bridge);
  }
  return router;
}
// Horizon's published provider uses request(method, params), not XCP's object envelope.
export function horizonWalletAdapter(provider) {
 const unwrap=value=>{let out=value;for(let i=0;i<3&&out?.result;i++)out=out.result;if(out?.error)throw new Error('Horizon declined the wallet request.');return out;};
 const read=async()=>{const value=unwrap(await provider.request('getAddresses',{}));const addresses=Array.isArray(value)?value:value?.addresses;
  const selected=addresses?.find(a=>/^1[1-9A-HJ-NP-Za-km-z]{25,34}$/.test(a.address||''));
  if(!selected)throw new Error('Choose a Legacy Bitcoin mainnet account in Horizon.');
  return {address:selected.address,network:'mainnet',ledger:'cp20',signingAvailable:true};};
 return {name:'Horizon Wallet',ledgers:['cp20'],connect:read,getAccount:read,disconnect:async()=>{},
  async signPsbt(hex,ledger,options={}){const current=await read();const inputs=options.signInputs;
   if(!inputs||Object.keys(inputs).length!==1||!Array.isArray(inputs[current.address])||!inputs[current.address].length||!inputs[current.address].every(x=>Number.isInteger(x)&&x>=0))throw new Error('Horizon signing requires reviewed input indices for the connected account.');
   const result=unwrap(await provider.request('signPsbt',{hex,signInputs:inputs,sighashTypes:[1]}));return result?.hex;
  },on:provider.on?.bind(provider),removeListener:provider.removeListener?.bind(provider)};
}
export const NEO_MASK_WALLET_CHOICES=Object.freeze([
 {id:'horizon',name:'Horizon Wallet',url:'https://horizon.market/wallet'},
 {id:'xcp-wallet',name:'XCP Wallet',url:'https://xcp.io/'},
 {id:'freewallet',name:'Freewallet.io',url:'https://freewallet.io/'},
 {id:'counterpay',name:'Counterpay'},
 {id:'neopay',name:'NEO Pay'}
]);
export function neoMaskWalletChoices(router,ledger){const found=router.list(ledger);return [...NEO_MASK_WALLET_CHOICES.map(choice=>({...choice,...found.find(x=>x.id===choice.id),available:!!found.find(x=>x.id===choice.id)?.available})),...found.filter(x=>!NEO_MASK_WALLET_CHOICES.some(c=>c.id===x.id))];}
