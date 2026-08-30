import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, '../../db');
const files = (await readdir(migrationsDir)).filter((name) => /^\d+.*\.sql$/.test(name)).sort();
if (!files.length) throw new Error('No NEO Realty migrations found');

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();
try {
  for (const file of files) {
    const sql = await readFile(join(migrationsDir, file), 'utf8');
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('COMMIT');
      console.log(`Applied ${file}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  }
} finally {
  await client.end();
}
