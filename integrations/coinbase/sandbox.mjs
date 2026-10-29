import {assertCoinbaseBoundary, assertNativeBitcoinAsset} from './boundary.mjs';

// Offline, deterministic simulator: no SDK, fetch, credentials, signing, or settlement.
export function createCoinbaseSandbox({enabled = false, recordAudit = () => {}} = {}) {
  if (typeof recordAudit !== 'function') throw new TypeError('Audit sink must be a function');
  return Object.freeze({
    evaluate(input) {
      if (!enabled) throw new Error('Coinbase sandbox is disabled');
      const request = assertCoinbaseBoundary(input);
      assertNativeBitcoinAsset({asset: 'BTC', network: 'bitcoin', native: true});
      const result = Object.freeze({
        mode: 'offline-simulation',
        provider: 'coinbase',
        service: request.service,
        action: request.action,
        asset: 'BTC',
        network: 'bitcoin',
        status: 'simulated-no-provider-connection',
        executable: false,
      });
      recordAudit(Object.freeze({
        event: 'coinbase_sandbox_evaluated', service: request.service,
        action: request.action, asset: 'BTC', network: 'bitcoin',
        status: 'simulated', reference: request.reference ?? null,
      }));
      return result;
    },
  });
}
