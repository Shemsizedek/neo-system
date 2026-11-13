import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { createFilesystemStorage, verifyExportBundle, restoreObjectFromExport } from '../server/neo-storage/fabric.mjs';
import { createSyntheticGisdCustody } from '../server/neo-platform-api/egaas-custody.mjs';
import { checkEgaasPublishingAuthority, verifyEgaasInclusion } from '../server/neo-platform-api/egaas-verification.mjs';

// Synthetic data only; the ephemeral runtime key is never printed or persisted.
// Temporary encrypted files are removed; this is not a production custody service.
const root = mkdtempSync(join(tmpdir(), 'neo-egaas-synthetic-'));
const key = randomBytes(32);
try {
  const storage = createFilesystemStorage(join(root, 'custody'));
  const custody = createSyntheticGisdCustody({ storage, key });
  const refs = [1, 2, 3].map(index => custody.save({ schema: 'neo-gisd-synthetic-receipt-v1', synthetic: true,
    receiptId: `SYNTHETIC-RECEIPT-${index}`, learnerId: `SYNTHETIC-LEARNER-${index}`, courseId: 'SYNTHETIC-GISD-101', completedAt: '2026-11-07T12:00:00.000Z' }));
  const reopened = createSyntheticGisdCustody({ storage: createFilesystemStorage(join(root, 'custody')), key });
  const batch = reopened.prepare(refs.map(ref => ref.custodyRef));
  storage.exportBundle(join(root, 'backup'));
  const restored = refs.every(ref => JSON.parse(restoreObjectFromExport(join(root, 'backup'), ref.custodyRef, { key }).toString()).commitment === ref.commitment);
  console.log(JSON.stringify({ mode: 'SYNTHETIC_LOCAL_ONLY', syntheticReceipts: refs.length, custodyReopenVerified: true,
    backupIntegrityVerified: verifyExportBundle(join(root, 'backup')).valid, backupRestoreVerified: restored,
    batch: { root: batch.root, count: batch.count, state: batch.state },
    crownAuthority: await checkEgaasPublishingAuthority(), inclusion: await verifyEgaasInclusion({ batch }),
    liveInclusionVerified: false, signingEnabled: false, broadcastEnabled: false,
    note: 'No live policy, Crown capability or Bitcoin/Counterparty adapters provisioned. No transaction created.' }, null, 2));
} finally { key.fill(0); rmSync(root, { recursive: true, force: true }); }
