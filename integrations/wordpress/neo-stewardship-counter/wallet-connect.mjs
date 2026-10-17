// Uses the same injected provider contract as src/neopay/signerAdapters.ts.
// Account connection is not proof of signing authority or settlement readiness.
export async function connectStewardshipWallet(provider, expectedAddress = '') {
  if (!provider || typeof provider.connect !== 'function' || typeof provider.signRawTransaction !== 'function') {
    throw new Error('No compatible NEOpay / CounterPay signer is exposed on this page. Open a wallet that supplies the neoBitcoinSigner bridge.');
  }
  const account = await provider.connect();
  const network = String(account?.network || '').toLowerCase();
  if (!['mainnet','bitcoin','livenet'].includes(network)) throw new Error('The wallet must explicitly report Bitcoin mainnet.');
  const address = String(account?.address || '').trim();
  if (!/^1[1-9A-HJ-NP-Za-km-z]{25,34}$/.test(address)) throw new Error('This checkout currently accepts legacy mainnet Counterparty addresses beginning with 1.');
  if (expectedAddress && address !== expectedAddress) throw new Error('The connected merchant account does not match the configured treasury.');
  return {address, network:'mainnet', name:String(provider.name || 'NEOpay-compatible wallet'), rawSigningAdvertised:true, signingTested:false};
}
export function mountWalletConnections(root, scope = window) {
  const status = root.querySelector('[data-connect-status]');
  const member = root.querySelector('[data-connect-member]');
  const merchant = root.querySelector('[data-connect-merchant]');
  const connect = async (button, expected) => {
    button.disabled = true;
    status.textContent = 'Requesting wallet account permission…';
    try {
      const session = await connectStewardshipWallet(scope.neoBitcoinSigner, expected);
      if (!expected) {
        const input = root.closest('section')?.querySelector('[name=wallet]');
        if (input) input.value = session.address;
      }
      status.textContent = session.name + ' account connected: ' + session.address +
        '. Signing capability advertised; transaction signing and token delivery are not yet tested. Payments remain disabled.';
    } catch (error) {status.textContent = error.message || 'Wallet connection failed.';}
    finally {button.disabled = false;}
  };
  member?.addEventListener('click',()=>connect(member,''));
  merchant?.addEventListener('click',()=>connect(merchant,'1Ky2wRYYrJzqdQJH64F7TR98fqLxJs7LK8'));
}
