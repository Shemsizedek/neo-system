import pg from 'pg';
import { createCesSourceStore } from '../../server/neo-bots/ces-source-store.mjs';
import { createCesReadServer } from '../../server/neo-bots/ces-read-server.mjs';

if (!process.env.CES_SOURCE_DATABASE_URL || !process.env.NEO_CES_RUNTIME_TOKEN) throw new Error('CES runtime server secrets are required');
const pool = new pg.Pool({ connectionString: process.env.CES_SOURCE_DATABASE_URL, max: 2, connectionTimeoutMillis: 10000, statement_timeout: 10000 });
pool.on('error', () => {}); // Database health is exposed without logging connection metadata.
const server = createCesReadServer({ store: createCesSourceStore(pool) });
server.listen(Number(process.env.PORT || 10000), '0.0.0.0');
const close = () => { server.close(() => pool.end().finally(() => process.exit(0))); setTimeout(() => process.exit(1), 15000).unref(); };
process.once('SIGTERM', close);
process.once('SIGINT', close);
