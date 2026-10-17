// Uses the same injected provider contract as src/neopay/signerAdapters.ts.
// Account connection is not proof of signing authority or settlement readiness.
export async function connectStewardshipWallet(provider, expectedAddress = '', ledger) {
  if (!provider || typeof provider.connect !== 'function' || (typeof provider.signRawTransaction !== 'function' && typeof provider.signPsbt !== 'function')) {
    throw new Error('No signing wallet is exposed on this page. Install NeoMask or a compatible NEOpay / CounterPay wallet bridge.');
  }
  if (provider.isNeoMask && !['classic','cp20'].includes(ledger)) throw new Error('Select a Counterparty ledger first.');
  const account = await provider.connect({ledger});
  if (account?.watchOnly || account?.signingAvailable === false) throw new Error('This wallet is watch-only; install the NeoMask signing build and configure its vault locally.');
  if (account?.ledger && ledger && account.ledger !== ledger) throw new Error('Connected wallet ledger does not match checkout.');
  const network = String(account?.network || '').toLowerCase();
  if (!['mainnet','bitcoin','livenet'].includes(network)) throw new Error('The wallet must explicitly report Bitcoin mainnet.');
  const address = String(account?.address || '').trim();
  if (!/^1[1-9A-HJ-NP-Za-km-z]{25,34}$/.test(address)) throw new Error('This checkout currently accepts legacy mainnet Counterparty addresses beginning with 1.');
  if (expectedAddress && address !== expectedAddress) throw new Error('The connected merchant account does not match the configured treasury.');
  return {address, network:'mainnet', name:String(provider.name || 'NEOpay-compatible wallet'), rawSigningAdvertised:typeof provider.signRawTransaction === 'function', psbtSigningAdvertised:typeof provider.signPsbt === 'function', signingTested:false};
}
export function mountWalletConnections(root, scope = window) {
  const status = root.querySelector('[data-connect-status]');
  const member = root.querySelector('[data-connect-member]');
  const merchant = root.querySelector('[data-connect-merchant]');
  const connect = async (button, expected) => {
    button.disabled = true;
    status.textContent = 'Requesting wallet account permission…';
    try {
      const session = await connectStewardshipWallet(scope.neoMask || scope.neoBitcoinSigner, expected, root.closest('section')?.getAttribute('data-selected-ledger'));
      if (!expected) {
        const input = root.closest('section')?.querySelector('[name=wallet]');
        if (input) input.value = session.address;
      }
      status.textContent = session.name + ' account connected: ' + session.address +
        '. Wallet signing approval is required for each transaction. Checkout payment activation awaits end-to-end verification.';
    } catch (error) {status.textContent = error.message || 'Wallet connection failed.';}
    finally {button.disabled = false;}
  };
  member?.addEventListener('click',()=>connect(member,''));
  merchant?.addEventListener('click',()=>connect(merchant,'1Ky2wRYYrJzqdQJH64F7TR98fqLxJs7LK8'));
}
