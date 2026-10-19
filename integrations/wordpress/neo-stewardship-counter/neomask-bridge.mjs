// NeoMask wallet routing contract. Wallet implementations retain all signing keys.
// Registration supplies a wallet adapter; it does not establish a live session.
export function createNeoMaskBridge({provider, ledger, origin, expectedAddress = ''}) {
  if (origin !== 'https://holytemples.org') throw new Error('Unapproved merchant origin');
  if (!['classic','cp20'].includes(ledger)) throw new Error('Explicit Counterparty ledger required');
  if (!provider || typeof provider.connect !== 'function' ||
      typeof provider.signRawTransaction !== 'function' ||
      !Array.isArray(provider.ledgers) || !provider.ledgers.includes(ledger)) {
    throw new Error('Wallet adapter must advertise the selected ledger and signing methods');
  }
  let account = null;
  let revision = 0;
  const normalize = value => {
    if (!value || !['mainnet','bitcoin','livenet'].includes(String(value.network || '').toLowerCase())) throw new Error('Explicit Bitcoin mainnet account required');
    if (!/^1[1-9A-HJ-NP-Za-km-z]{25,34}$/.test(String(value.address || ''))) throw new Error('Legacy mainnet account required');
    if (value.ledger !== ledger) throw new Error('Wallet account ledger mismatch');
    if (expectedAddress && value.address !== expectedAddress) throw new Error('Configured account mismatch');
    return {address:value.address, network:'mainnet', ledger};
  };
  return Object.freeze({
    name:'NeoMask · ' + String(provider.name || 'Counterparty wallet'),
    ledgers:[ledger],
    capabilities:{rawTransaction:true, legacy:true, segwit:false, taproot:false},
    async connect() {
      account = null;
      const current = ++revision;
      const next = normalize(await provider.connect({origin,ledger}));
      if (current !== revision) throw new Error('Connection superseded');
      account = next;
      return {...account};
    },
    async disconnect() {revision++;account=null;await provider.disconnect?.();},
    async signRawTransaction(hex) {
      if (!account) throw new Error('Connect and approve wallet first');
      if (!/^(?:[a-fA-F0-9]{2}){50,200000}$/.test(String(hex))) throw new Error('Invalid transaction encoding');
      // Account continuity and wallet-side review are required on every request.
      if (typeof provider.getAccount !== 'function') throw new Error('Wallet account continuity API required');
      const connected = {...account}, current = revision;
      const live = normalize(await provider.getAccount({origin,ledger}));
      if (current !== revision || live.address !== connected.address) {account=null;throw new Error('Wallet account changed');}
      const signed = await provider.signRawTransaction(hex,{origin,ledger,source:connected.address,requireUserApproval:true});
      if (current !== revision || !account) throw new Error('Wallet disconnected during signing');
      const after = normalize(await provider.getAccount({origin,ledger}));
      if (after.address !== connected.address) {account=null;throw new Error('Wallet account changed during signing');}
      if (!/^(?:[a-fA-F0-9]{2}){50,200000}$/.test(String(signed))) throw new Error('Invalid signed transaction encoding');
      return signed;
    }
  });
}
export function installNeoMaskBridge(scope, options) {
  if (scope.location?.origin !== options.origin) throw new Error('Merchant origin mismatch');
  if (scope.neoBitcoinSigner) throw new Error('A signer is already registered; disconnect it first');
  const bridge = createNeoMaskBridge(options);
  scope.neoBitcoinSigner = bridge;
  return async () => {
    if (scope.neoBitcoinSigner === bridge) delete scope.neoBitcoinSigner;
    await bridge.disconnect();
  };
}
