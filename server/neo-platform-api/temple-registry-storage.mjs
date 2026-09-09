import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const EMPTY = { neopassCredentials: [], templeCitizens: [], bookOfLifeRecords: [], gissEnrollments: [], degreeAssignments: [] };

export function createPersistentTempleRegistry({ filePath = process.env.NEO_TEMPLE_REGISTRY_PATH || './data/temple-registry.json', archive = null, now = () => new Date().toISOString() } = {}) {
  let state = structuredClone(EMPTY);
  let loaded = false;

  async function load() {
    if (loaded) return;
    try { state = { ...structuredClone(EMPTY), ...JSON.parse(await readFile(filePath, 'utf8')) }; }
    catch (error) { if (error?.code !== 'ENOENT') throw error; }
    loaded = true;
  }

  async function persist(reason) {
    await mkdir(dirname(filePath), { recursive: true });
    const payload = JSON.stringify({ ...state, metadata: { version: 1, updatedAt: now() } }, null, 2);
    const tmp = `${filePath}.tmp`;
    await writeFile(tmp, payload, { mode: 0o600 });
    await rename(tmp, filePath);
    if (archive) await archive.putSnapshot({ payload, reason, createdAt: now() });
  }

  const find = (key, predicate) => state[key].find(predicate) || null;
  return {
    async init() { await load(); return this; },
    async getNEOpassCredential(subject) { await load(); return find('neopassCredentials', x => x.subject === subject); },
    async getTempleCitizen(id) { await load(); return find('templeCitizens', x => x.id === id); },
    async getBookOfLifeRecord(citizenId) { await load(); return find('bookOfLifeRecords', x => x.templeCitizenId === citizenId); },
    async getGISSEnrollment(citizenId) { await load(); return find('gissEnrollments', x => x.templeCitizenId === citizenId); },
    async createGISSEnrollment(record) { await load(); const value = { id: record.id || `giss-${crypto.randomUUID()}`, ...record, createdAt: record.createdAt || now() }; state.gissEnrollments.push(value); await persist('giss.enrollment.created'); return value; },
    async getTempleDegreeAssignment(citizenId) { await load(); return find('degreeAssignments', x => x.templeCitizenId === citizenId); },
    async upsert(collection, record, key = 'id') { await load(); if (!Object.hasOwn(state, collection)) throw new Error('unsupported_registry_collection'); const i = state[collection].findIndex(x => x[key] === record[key]); if (i >= 0) state[collection][i] = { ...state[collection][i], ...record, updatedAt: now() }; else state[collection].push({ ...record, createdAt: record.createdAt || now() }); await persist(`registry.${collection}.upserted`); return record; },
    async snapshot() { await load(); return structuredClone(state); }
  };
}

// TeraBox is intentionally an archive/mass-storage provider, not the synchronous identity database.
// provider.putObject must be supplied by the authenticated TeraBox integration at deployment.
export function createTeraBoxRegistryArchive({ provider, prefix = 'neo/temple-registry' } = {}) {
  if (!provider?.putObject) throw new Error('terabox_archive_provider_required');
  return {
    async putSnapshot({ payload, reason, createdAt }) {
      const stamp = createdAt.replace(/[:.]/g, '-');
      return provider.putObject({ path: `${prefix}/${stamp}.json`, body: payload, contentType: 'application/json', metadata: { reason } });
    }
  };
}
