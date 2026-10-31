import { createHash } from 'node:crypto';
import { NMNI_TRADING_COLUMNS } from './nmni-admin-reader.mjs';

export function normalizeTradingSnapshot(input) {
  if (input?.schemaVersion !== 'neo.ces.browser-evidence.v1' || input.exchangeId !== 'NMNI' || input.source?.origin !== 'https://www.community-exchange.org' || input.source?.path !== '/_admin/statstrading.asp') throw new Error('invalid CES source');
  if (!Number.isFinite(Date.parse(input.observedAt))) throw new Error('invalid CES observation time');
  const report = input.scrapedReport;
  if (JSON.stringify(report?.columns) !== JSON.stringify(NMNI_TRADING_COLUMNS) || !Array.isArray(report.monthlyRows) || report.monthlyRows.length < 1 || report.monthlyRows.length > 250) throw new Error('invalid CES report');
  const monthlyRows = report.monthlyRows.map(row => {
    if (!Array.isArray(row) || row.length !== 8 || row.some(value => typeof value !== 'string') || !/^\d+$/.test(row[0]) || !/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}$/.test(row[1]) || !/^\d+$/.test(row[2]) || row.slice(3).some(value => !/^-?\d{1,40}\.\d{2}$/.test(value))) throw new Error('invalid CES monthly row');
    return [...row];
  });
  const payload = { schema: 'neo.ces.trading-summary.v1', exchangeId: 'NMNI', sourceOrigin: input.source.origin, sourcePath: input.source.path, observedAt: input.observedAt, unit: 'NEO', columns: [...NMNI_TRADING_COLUMNS], monthlyRows, verificationStatus: 'source-imported', recordType: 'historical-trading-summary' };
  const id = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  return { id, payload, rowCount: monthlyRows.length };
}

export function createCesSourceStore(pool) {
  return {
    async ping() { await pool.query('SELECT 1 FROM neo_ces_source_imports LIMIT 1'); return true; },
    async list() { const { rows } = await pool.query('SELECT id,exchange_id,observed_at,imported_at,row_count FROM neo_ces_source_imports ORDER BY imported_at DESC LIMIT 20'); return rows; },
    async importSnapshot(input) {
      const record = normalizeTradingSnapshot(input);
      const result = await pool.query('INSERT INTO neo_ces_source_imports(id,exchange_id,observed_at,row_count,payload) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO NOTHING RETURNING id', [record.id, 'NMNI', record.payload.observedAt, record.rowCount, JSON.stringify(record.payload)]);
      return { id: record.id, imported: result.rows.length === 1, rowCount: record.rowCount, recordType: record.payload.recordType, unit: record.payload.unit };
    },
  };
}
