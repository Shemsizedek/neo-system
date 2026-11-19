import { buildCommitment } from '../crown-metadata/integrity.mjs';

export const EGAAS_ANCHOR_PROTOCOL = 'neo-egaas-anchor-v1';
const digest = /^[a-f0-9]{64}$/;

/** Offline preparation only. Inputs must already be salted commitments, never records. */
export function prepareEgaasAnchor(input) {
  if (!input || Object.getPrototypeOf(input) !== Object.prototype ||
      Object.keys(input).some(key => key !== 'commitments') ||
      !Array.isArray(input.commitments) || input.commitments.length < 1 ||
      input.commitments.length > 128 || input.commitments.some(value => typeof value !== 'string' || !digest.test(value)) ||
      new Set(input.commitments).size !== input.commitments.length) {
    throw new Error('unique_salted_commitments_required');
  }
  // Reuse Crown's existing deterministic Merkle algorithm. Opaque commitments
  // serve as both leaf identifiers and hashes; no student or citizen IDs enter it.
  const tree = buildCommitment(input.commitments.map(hash => ({ asset: `${EGAAS_ANCHOR_PROTOCOL}:${hash}`, hash })));
  return {
    protocol: EGAAS_ANCHOR_PROTOCOL,
    state: 'prepared_offchain',
    layers: { settlement: 'bitcoin', overlay: 'counterparty', application: 'neo-crown-chain' },
    root: tree.root,
    count: tree.entries.length,
    proofs: tree.entries.map(entry => ({ commitment: entry.hash, asset: entry.asset, proof: entry.proof })),
    counterpartyBroadcastText: `NEO:eGAAS:1:${tree.root}`,
    crownAuthorized: false,
    anchored: false,
    transactionId: null,
    broadcastEnabled: false,
  };
}

export function createEgaasAnchorHandler({ subjectResolver }) {
  return async (req, res, url) => {
    if (url.pathname !== '/api/v1/egaas/anchors/prepare') return false;
    const reply = (status, body) => {
      const payload = JSON.stringify(body);
      res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(payload), 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
      res.end(payload);
      return true;
    };
    if (req.method !== 'POST') return reply(405, { error: 'method_not_allowed' });
    if (!subjectResolver(req)) return reply(401, { error: 'neopass_identity_required' });
    // Pure computation: no record storage, upstream requests, signing, or broadcast.
    if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '')) return reply(415, { error: 'application_json_required' });
    let body = '';
    let size = 0;
    for await (const chunk of req) {
      size += Buffer.byteLength(chunk);
      if (size > 12000) return reply(413, { error: 'request_too_large' });
      body += chunk;
    }
    try { return reply(200, prepareEgaasAnchor(JSON.parse(body))); }
    catch { return reply(400, { error: 'unique_salted_commitments_required' }); }
  };
}
