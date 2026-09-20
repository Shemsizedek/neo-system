import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const EMPTY = Object.freeze({
  participants: {},
  stewardship: [],
  allocations: [],
  vesting: {},
  valuations: {},
  reconciliation: null,
  certificates: {},
  statements: {},
  audit: []
});

export class JsonEsopStore {
  #queue = Promise.resolve();

  constructor({ file = process.env.ORANGE_ESOP_STORE_FILE || path.resolve('.data/orange-esop.json') } = {}) {
    this.file = file;
  }

  async #read() {
    try { return JSON.parse(await fs.readFile(this.file, 'utf8')); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      return structuredClone(EMPTY);
    }
  }

  async #write(data) {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.${randomUUID()}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(data, null, 2));
    await fs.rename(tmp, this.file);
  }

  async #mutate(fn) {
    const operation = this.#queue.then(async () => {
      const data = await this.#read();
      const result = await fn(data);
      await this.#write(data);
      return result;
    });
    this.#queue = operation.catch(() => {});
    return operation;
  }

  async snapshot() { return this.#read(); }

  async summary() {
    const data = await this.#read();
    return {
      participantCount: Object.keys(data.participants || {}).length,
      stewardshipEntries: (data.stewardship || []).length,
      reconciliation: data.reconciliation || null,
      auditCount: (data.audit || []).length
    };
  }

  async upsertParticipant(participant) {
    return this.#mutate(async data => {
      data.participants[participant.participantId] = {
        ...(data.participants[participant.participantId] || {}),
        ...participant,
        updatedAt: new Date().toISOString()
      };
      data.audit.push({ eventType:'PARTICIPANT_UPSERTED', participantId:participant.participantId, at:new Date().toISOString() });
      return data.participants[participant.participantId];
    });
  }

  async getParticipant(id) {
    const data = await this.#read();
    return data.participants[id] || null;
  }

  async listParticipants() {
    const data = await this.#read();
    return Object.values(data.participants);
  }

  async addStewardship(entry) {
    return this.#mutate(async data => {
      if (data.stewardship.some(row => row.entryId === entry.entryId)) throw new Error('duplicate_stewardship_entry');
      data.stewardship.push(entry);
      data.audit.push({ eventType:'STEWARDSHIP_RECORDED', participantId:entry.participantId, entryId:entry.entryId, at:new Date().toISOString() });
      return entry;
    });
  }

  async saveReconciliation(run) {
    return this.#mutate(async data => {
      data.reconciliation = run;
      data.audit.push({ eventType:'RECONCILIATION_RUN', status:run.status, at:new Date().toISOString() });
      return run;
    });
  }

  async saveCertificate(certificate) {
    return this.#mutate(async data => {
      data.certificates[certificate.certificateId] = certificate;
      data.audit.push({ eventType:'CERTIFICATE_ISSUED', participantId:certificate.participantId, at:new Date().toISOString() });
      return certificate;
    });
  }

  async saveStatement(statement) {
    return this.#mutate(async data => {
      data.statements[statement.statementId] = statement;
      data.audit.push({ eventType:'STATEMENT_GENERATED', participantId:statement.participantId, at:new Date().toISOString() });
      return statement;
    });
  }
}
