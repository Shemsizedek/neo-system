import { randomUUID } from 'node:crypto';

export const CRM_TYPES = Object.freeze(['app', 'platform', 'module', 'plugin', 'member', 'lead', 'contact', 'organization']);
export const CRM_STATUSES = Object.freeze(['draft', 'active', 'paused', 'retired']);

export class CrmStoreError extends Error {
  constructor(code, status = 400) { super(code); this.code = code; this.status = status; }
}

function clean(value, max = 240) { return String(value || '').trim().slice(0, max); }
function slug(value) { return clean(value, 80).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

export function normalizeCrmRecord(input = {}, existing = null) {
  const type = clean(input.type || existing?.type, 20);
  const name = clean(input.name || existing?.name, 100);
  const status = clean(input.status || existing?.status || 'draft', 20);
  if (!CRM_TYPES.includes(type)) throw new CrmStoreError('invalid_record_type');
  if (!name) throw new CrmStoreError('record_name_required');
  if (!CRM_STATUSES.includes(status)) throw new CrmStoreError('invalid_record_status');
  return {
    type, name, status,
    slug: slug(input.slug || name),
    owner: clean(input.owner ?? existing?.owner, 100),
    description: clean(input.description ?? existing?.description, 1000),
    endpoint: clean(input.endpoint ?? existing?.endpoint, 500),
    version: clean(input.version ?? existing?.version, 40),
    tags: clean(input.tags ?? existing?.tags, 300).split(',').map(item => item.trim()).filter(Boolean).slice(0, 12),
  };
}

export function createInMemoryCrmStore({ now = () => new Date().toISOString(), id = () => randomUUID(), seed = [] } = {}) {
  const records = new Map(seed.map(record => [record.id, structuredClone(record)]));
  const audits = [];
  const audit = (action, record, actor) => audits.unshift({ id: id(), action, recordId: record.id, recordType: record.type, actor, at: now() });
  return {
    async ensureSeed(items = []) { for (const input of items) { const normalized=normalizeCrmRecord(input); const recordId=`${normalized.type}:${normalized.slug}`; if(!records.has(recordId)) records.set(recordId,{id:recordId,...normalized,createdAt:now(),updatedAt:now(),revision:1,archivedAt:null}); } },
    async list({ type, includeArchived = false } = {}) { return [...records.values()].filter(item => (!type || item.type === type) && (includeArchived || !item.archivedAt)).sort((a,b) => b.updatedAt.localeCompare(a.updatedAt)); },
    async get(recordId) { return records.get(recordId) || null; },
    async create(input, actor) { const value = { id: id(), ...normalizeCrmRecord(input), createdAt: now(), updatedAt: now(), revision: 1, archivedAt: null }; records.set(value.id, value); audit('created', value, actor); return structuredClone(value); },
    async update(recordId, input, actor) { const current = records.get(recordId); if (!current || current.archivedAt) throw new CrmStoreError('record_not_found', 404); const value = { ...current, ...normalizeCrmRecord(input, current), updatedAt: now(), revision: current.revision + 1 }; records.set(recordId, value); audit('updated', value, actor); return structuredClone(value); },
    async archive(recordId, actor) { const current = records.get(recordId); if (!current) throw new CrmStoreError('record_not_found', 404); const value = { ...current, archivedAt: now(), updatedAt: now(), revision: current.revision + 1 }; records.set(recordId, value); audit('archived', value, actor); return structuredClone(value); },
    async audit({ limit = 30 } = {}) { return structuredClone(audits.slice(0, limit)); },
  };
}
