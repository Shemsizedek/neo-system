import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PARTNER_REPOSITORY, validatePartnerManifest } from '../../server/neo-tokenworks/partner-bridge.mjs';

const exec = promisify(execFile);
const sha = (algorithm, bytes) => createHash(algorithm).update(bytes).digest('hex');

export function verifySourceFiles(manifest, files) {
  const reference = validatePartnerManifest(manifest);
  const results = reference.source.files.map(expected => {
    const bytes = files.get(expected.path);
    if (!Buffer.isBuffer(bytes)) return { path: expected.path, verified: false, reason: 'source_file_missing' };
    const actual = {
      bytes: bytes.length,
      sha256: sha('sha256', bytes),
      gitBlobSha: sha('sha1', Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes]))
    };
    return { path: expected.path, verified: ['bytes', 'sha256', 'gitBlobSha'].every(key => expected[key] === actual[key]), ...actual };
  });
  return {
    schema: 'neo.partner.source-check.v1',
    partner: reference.id,
    repository: reference.source.repository,
    pinnedCommit: reference.source.commit,
    snapshotIntegrityVerified: results.every(file => file.verified),
    files: results,
    deploymentVerified: false,
    financialActivationEnabled: false
  };
}

export async function verifyCheckoutSource(manifest, directory) {
  const reference = validatePartnerManifest(manifest);
  const cwd = resolve(directory);
  const { stdout } = await exec('git', ['-C', cwd, 'rev-parse', 'HEAD'], { timeout: 10_000 });
  const checkoutCommit = stdout.trim();
  const files = new Map();
  for (const file of reference.source.files) {
    try { files.set(file.path, await readFile(resolve(cwd, file.path))); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  const report = verifySourceFiles(reference, files);
  return { ...report, check: 'LOCAL_CHECKOUT', checkoutCommit, commitMatchesPin: checkoutCommit === reference.source.commit, ok: report.snapshotIntegrityVerified && checkoutCommit === reference.source.commit };
}

async function readGithubJson(fetchImpl, path) {
  const response = await fetchImpl(`https://api.github.com/repos/${PARTNER_REPOSITORY}/${path}`, {
    method: 'GET',
    redirect: 'error',
    signal: AbortSignal.timeout(10_000),
    headers: { accept: 'application/vnd.github+json', 'user-agent': 'neo-partner-reference-check/1', 'x-github-api-version': '2022-11-28' }
  });
  if (!response.ok) throw new Error(`partner_source_http_${response.status}`);
  const chunks = []; let length = 0;
  for await (const chunk of response.body) {
    length += chunk.length;
    if (length > 256 * 1024) throw new Error('partner_source_response_too_large');
    chunks.push(Buffer.from(chunk));
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

// Reads GitHub metadata and pinned blobs only. Never loads or executes partner code.
export async function verifyLiveSource(manifest, { fetchImpl = fetch, now = () => new Date().toISOString() } = {}) {
  const reference = validatePartnerManifest(manifest);
  const head = await readGithubJson(fetchImpl, 'commits/main');
  if (!/^[a-f0-9]{40}$/.test(head.sha)) throw new Error('invalid_partner_head');
  const files = new Map();
  for (const file of reference.source.files) {
    const path = file.path.split('/').map(encodeURIComponent).join('/');
    const blob = await readGithubJson(fetchImpl, `contents/${path}?ref=${reference.source.commit}`);
    if (blob.encoding !== 'base64' || typeof blob.content !== 'string') throw new Error('invalid_partner_blob');
    files.set(file.path, Buffer.from(blob.content, 'base64'));
  }
  const report = verifySourceFiles(reference, files);
  return {
    ...report, check: 'LIVE_GITHUB', observedAt: now(),
    upstreamHead: head.sha, upstreamHeadMatchesPin: head.sha === reference.source.commit,
    ok: report.snapshotIntegrityVerified && head.sha === reference.source.commit
  };
}
