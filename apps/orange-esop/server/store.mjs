import { promises as fs } from 'node:fs';
import path from 'node:path';

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
    const tmp = `${this.file}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(data, null, 2));
    await fs.rename(tmp, this.file);
  }

  async snapshot() { return this.#read(); }

  async upsertParticipant(participant) {
    const data = await this.#read();
    data.participants[participant.participantId] = {
      ...(data.participants[participant.participantId] || {}),
      ...participant,
      updatedAt: new Date().toISOString()
    };
    await this.#write(data);
    return data.participants[participant.participantId];
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
    const data = await this.#read();
    data.stewardship.push(entry);
    data.audit.push({ eventType: 'STEWARDSHIP_RECORDED', participantId: entry.participantId, at: new Date().toISOString() });
    await this.#write(data);
    return entry;
  }

  async saveReconciliation(run) {
    const data = await this.#read();
    data.reconciliation = run;
    data.audit.push({ eventType: 'RECONCILIATION_RUN', status: run.status, at: new Date().toISOString() });
    await this.#write(data);
    return run;
  }

  async saveCertificate(certificate) {
    const data = await this.#read();
    data.certificates[certificate.certificateId] = certificate;
    data.audit.push({ eventType: 'CERTIFICATE_ISSUED', participantId: certificate.participantId, at: new Date().toISOString() });
    await this.#write(data);
    return certificate;
  }

  async saveStatement(statement) {
    const data = await this.#read();
    data.statements[statement.statementId] = statement;
    data.audit.push({ eventType: 'STATEMENT_GENERATED', participantId: statement.participantId, at: new Date().toISOString() });
    await this.#write(data);
    return statement;
  }
}
