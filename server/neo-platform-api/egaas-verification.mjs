import { createHash } from 'node:crypto';
import { verifyBitcoinRpcEvidence } from '../neo-prime/bitcoin-rpc-verifier.mjs';
import { prepareEgaasAnchor } from './egaas-anchors.mjs';

const HASH = /^[a-f0-9]{64}$/;
const CHAINS = { mainnet: 'main', testnet: 'test', signet: 'signet' };
export const EGAAS_PUBLISH_SCOPE = 'egaas.anchor.publish'; // Proposed; not registered by this code.
export const EGAAS_SERVICE_ID = 'crown:btc:app:neo-egaas';
const blocked = reason => ({ verified: false, reason, publishingEnabled: false });
const hash = bytes => createHash('sha256').update(bytes).digest();
const safePolicy = policy => policy && Object.hasOwn(CHAINS, policy.network) &&
  typeof policy.publisher === 'string' && policy.publisher.length > 0 && policy.publisher.length <= 128 &&
  HASH.test(policy.manifestHash) && Number.isSafeInteger(policy.minimumConfirmations) && policy.minimumConfirmations >= 1;
const bounded = async operation => {
  let timer;
  try { return await Promise.race([Promise.resolve().then(operation), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('verification_timeout')), 5000); })]); }
  finally { clearTimeout(timer); }
};

/** verifyCapability wraps the existing verifyCrownAuthorization trusted introspector.
 * Do not use /crown/prove here: that workload flow signs a challenge.
 * This verifies a scoped capability, never approval of an individual root.
 */
export async function checkEgaasPublishingAuthority({ policy, verifyCapability, now = Date.now } = {}) {
  if (!safePolicy(policy)) return blocked('publishing_policy_unconfigured');
  if (typeof verifyCapability !== 'function') return blocked('crown_introspector_unconfigured');
  try {
    const proof = await bounded(() => verifyCapability({ requiredScope: EGAAS_PUBLISH_SCOPE }));
    const expires = Date.parse(proof?.expires_at);
    if (proof?.ok !== true || proof.service_id !== EGAAS_SERVICE_ID || !Array.isArray(proof.scopes) ||
        !proof.scopes.includes(EGAAS_PUBLISH_SCOPE) || proof.manifest_hash !== policy.manifestHash ||
        !Number.isFinite(expires) || expires <= now()) return blocked('crown_publishing_capability_denied');
    return { verified: true, serviceId: EGAAS_SERVICE_ID, scope: EGAAS_PUBLISH_SCOPE, expiresAt: proof.expires_at,
      rootApprovalVerified: false, publishingEnabled: false };
  } catch { return blocked('crown_introspection_unavailable'); }
}

/** Internal read-only verifier. rpc and two independently configured node readers
 * are operator-provisioned adapters, never URLs/callbacks from an HTTP request.
 * Counterparty readers return the strict normalized observation documented in the gate.
 */
export async function verifyEgaasInclusion(input, { policy, rpc, counterpartyNodes, now = Date.now } = {}) {
  if (!safePolicy(policy)) return blocked('publishing_policy_unconfigured');
  try {
    const { batch, txid, blockHash, blockHeight } = input || {};
    const rebuilt = prepareEgaasAnchor({ commitments: batch?.proofs?.map(entry => entry.commitment) });
    if (rebuilt.root !== batch.root || rebuilt.counterpartyBroadcastText !== batch.counterpartyBroadcastText) return blocked('batch_integrity_mismatch');
    if (txid == null) return blocked('awaiting_transaction');
    if (!HASH.test(txid) || !HASH.test(blockHash) || !Number.isSafeInteger(blockHeight) || blockHeight < 1) return blocked('invalid_transaction_reference');
    if (typeof rpc !== 'function') return blocked('bitcoin_rpc_unconfigured');
    const nodes = counterpartyNodes;
    if (!Array.isArray(nodes) || nodes.length !== 2 || nodes.some(node => !node || typeof node.read !== 'function' ||
        typeof node.nodeId !== 'string' || !node.nodeId || typeof node.operatorId !== 'string' || !node.operatorId ||
        typeof node.origin !== 'string' || new URL(node.origin).protocol !== 'https:' || new URL(node.origin).username || new URL(node.origin).password) ||
        new Set(nodes.map(node => node.nodeId)).size !== 2 || new Set(nodes.map(node => node.operatorId)).size !== 2 ||
        new Set(nodes.map(node => new URL(node.origin).origin)).size !== 2) return blocked('two_independent_counterparty_readers_required');
    const readRpc = (method, params) => bounded(() => rpc(method, params));
    const chain = await readRpc('getblockchaininfo', []);
    if (chain?.chain !== CHAINS[policy.network] || chain.initialblockdownload !== false ||
        !Number.isSafeInteger(chain.blocks) || chain.blocks < blockHeight || chain.headers !== chain.blocks || !HASH.test(chain.bestblockhash)) return blocked('bitcoin_network_or_sync_mismatch');
    const header = await readRpc('getblockheader', [blockHash, true]);
    if (header?.height !== blockHeight || chain.blocks - blockHeight + 1 !== header.confirmations) return blocked('bitcoin_height_mismatch');
    const bitcoin = await verifyBitcoinRpcEvidence({ source: 'crown-chain', network: policy.network, txid, blockHash,
      confirmations: header.confirmations, observedAt: new Date(now()).toISOString(), asset: 'GISD' }, { rpc: readRpc, minimumConfirmations: policy.minimumConfirmations });
    if (!bitcoin.verified) return blocked(`bitcoin_${bitcoin.reason}`);
    if (await readRpc('getblockhash', [blockHeight]) !== blockHash) return blocked('bitcoin_reorganization');
    const proof = await readRpc('gettxoutproof', [[txid], blockHash]);
    if (typeof proof !== 'string' || proof.length < 160 || proof.length > 2000000 || !/^(?:[a-f0-9]{2})+$/.test(proof) ||
        Buffer.from(hash(hash(Buffer.from(proof.slice(0, 160), 'hex')))).reverse().toString('hex') !== blockHash) return blocked('bitcoin_proof_block_mismatch');
    const proven = await readRpc('verifytxoutproof', [proof]);
    if (!Array.isArray(proven) || !proven.includes(txid)) return blocked('bitcoin_merkle_proof_failed');
    const observations = await Promise.all(nodes.map(node => bounded(() => node.read({ txid, blockHeight }))));
    for (const observation of observations) {
      const age = now() - Date.parse(observation?.observedAt);
      if (!observation || observation.network !== policy.network || observation.txid !== txid ||
          observation.blockHash !== blockHash || observation.blockHeight !== blockHeight || observation.status !== 'valid' ||
          observation.source !== policy.publisher || observation.text !== rebuilt.counterpartyBroadcastText ||
          observation.parserHeight !== chain.blocks || observation.bitcoinTipHash !== chain.bestblockhash ||
          !Number.isFinite(age) || age < -60000 || age > 60000) return blocked('counterparty_observation_mismatch_or_stale');
    }
    // Recheck active chain after both parsers respond. A moving tip requires a fresh snapshot.
    const end = await readRpc('getblockchaininfo', []);
    if (end?.chain !== chain.chain || end.initialblockdownload !== false || end.blocks !== chain.blocks ||
        end.headers !== chain.headers || end.bestblockhash !== chain.bestblockhash ||
        await readRpc('getblockhash', [blockHeight]) !== blockHash) return blocked('chain_changed_retry_required');
    return { verified: true, evidenceType: 'bitcoin-merkle-and-two-counterparty-observations', network: policy.network,
      txid, blockHash, blockHeight, confirmations: header.confirmations, root: rebuilt.root,
      observedAt: new Date(now()).toISOString(), crownAuthorityChecked: false, publishingEnabled: false };
  } catch { return blocked('verification_unavailable_or_invalid_evidence'); }
}
