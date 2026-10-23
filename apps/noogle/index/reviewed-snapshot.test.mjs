import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { applyReviewedKnowindex } from './reviewed-snapshot.mjs';
import { NoogleIndexStore } from './store.mjs';

const registry = JSON.parse(await fs.readFile('apps/noogle/index/sources.json', 'utf8'));
const source = registry.sources.find(item => item.id === 'world-library-knowindex');
const make = () => ({ store: new NoogleIndexStore(), reports: [], registry });
const expectedUrl = 'https://holytemples.org/hy/world-library/';

async function withEvidenceCopy(run) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'neo-knowindex-'));
  try {
    for (const name of ['reviewed-release.json', 'pilot-report.json', 'pilot-documents.json']) {
      await fs.copyFile(path.join('data/knowindex', name), path.join(dir, name));
    }
    return await run(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

test('indexes the approved one-page first-party snapshot without network requests', async () => {
  const state = make();
  const result = await applyReviewedKnowindex(state);
  assert.equal(result.indexed, true);
  assert.equal(result.count, 1);
  assert.equal(state.store.docs.length, 1);
  assert.equal(state.store.docs[0].canonicalUrl, expectedUrl);
  assert.equal(state.store.docs[0].evidenceState, 'reference');
  assert.equal(state.reports[0].sourceMode, 'reviewed-static-snapshot');
  assert.match(state.store.docs[0].communityTerms[0].term, /Moorish/);
});

test('skips an unpublished snapshot safely', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'neo-knowindex-unpublished-'));
  try {
    const result = await applyReviewedKnowindex({ ...make(), directory: dir });
    assert.equal(result.indexed, false);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('rejects modified document payloads', async () => withEvidenceCopy(async dir => {
  const p = path.join(dir, 'pilot-documents.json');
  const data = JSON.parse(await fs.readFile(p, 'utf8'));
  data.documents[0].title = 'Tampered';
  await fs.writeFile(p, JSON.stringify(data, null, 2) + '\n');
  await assert.rejects(applyReviewedKnowindex({ ...make(), directory: dir }), /documents_digest_mismatch/);
}));

test('rejects modified provenance reports', async () => withEvidenceCopy(async dir => {
  const p = path.join(dir, 'pilot-report.json');
  const data = JSON.parse(await fs.readFile(p, 'utf8'));
  data.crawled = 100;
  await fs.writeFile(p, JSON.stringify(data, null, 2) + '\n');
  await assert.rejects(applyReviewedKnowindex({ ...make(), directory: dir }), /report_digest_mismatch/);
}));

test('requires separate reviewed publication approval', async () => withEvidenceCopy(async dir => {
  const p = path.join(dir, 'reviewed-release.json');
  const data = JSON.parse(await fs.readFile(p, 'utf8'));
  data.publicationApproved = false;
  await fs.writeFile(p, JSON.stringify(data, null, 2) + '\n');
  await assert.rejects(applyReviewedKnowindex({ ...make(), directory: dir }), /approval_missing/);
}));

test('never activates the ordinary unreviewed domain crawler', async () => {
  assert.equal(source.enabled, false);
  await assert.rejects(applyReviewedKnowindex({ ...make(), registry: { sources: [{ ...source, enabled: true }] } }), /registry_scope_invalid/);
});
