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
  const status = root.querySelector('[data-connect-status]');
  const member = root.querySelector('[data-connect-member]');
  const merchant = root.querySelector('[data-connect-merchant]');
  const install = root.querySelector('[data-neomask-install]');
  const connect = async (button, expected) => {
    button.disabled = true;
    if (install) install.hidden = true;
    status.textContent = 'Approve the connection in NeoMask…';
    try {
      const session = await connectStewardshipWallet(scope.neoMask, expected, root.closest('section')?.getAttribute('data-selected-ledger'));
      if (!expected) {
        const input = root.closest('section')?.querySelector('[name=wallet]');
        if (input) input.value = session.address;
      }
      status.textContent = 'NeoMask connected · ' + session.address;
      button.textContent = expected ? 'Reconnect treasury via NeoMask' : 'Reconnect NeoMask';
    } catch (error) {
      status.textContent = error.message || 'NeoMask could not connect. Please try again.';
      if (install) install.hidden = Boolean(scope.neoMask?.isNeoMask);
    }
    finally {button.disabled = false;}
  };
  member?.addEventListener('click',()=>connect(member,''));
  merchant?.addEventListener('click',()=>connect(merchant,'1Ky2wRYYrJzqdQJH64F7TR98fqLxJs7LK8'));
}
