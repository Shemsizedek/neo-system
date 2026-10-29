import pg from 'pg';
import { createCesSourceStore } from '../../server/neo-bots/ces-source-store.mjs';
import { createCesReadServer } from '../../server/neo-bots/ces-read-server.mjs';

// A credential-free deployment exposes health only. Control routes still fail
// closed until a strong runtime token is provisioned, and imports default off.
const configured = Boolean(process.env.CES_SOURCE_DATABASE_URL && process.env.NEO_CES_RUNTIME_TOKEN?.length >= 32);
const pool = configured ? new pg.Pool({ connectionString: process.env.CES_SOURCE_DATABASE_URL, max: 2, connectionTimeoutMillis: 10000, statement_timeout: 10000 }) : null;
pool?.on('error', () => {}); // Database health is exposed without logging connection metadata.
const server = createCesReadServer({ store: pool ? createCesSourceStore(pool) : undefined });
server.listen(Number(process.env.PORT || 10000), '0.0.0.0');
const close = () => { server.close(() => Promise.resolve(pool?.end()).finally(() => process.exit(0))); setTimeout(() => process.exit(1), 15000).unref(); };
process.once('SIGTERM', close);
process.once('SIGINT', close);
