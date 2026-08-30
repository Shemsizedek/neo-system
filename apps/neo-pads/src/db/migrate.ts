import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(here, "../../db/migrations");
const migrationFiles = (await fs.readdir(migrationsDir))
  .filter((name) => /^\d+_.*\.sql$/.test(name))
  .sort((a, b) => a.localeCompare(b));

if (migrationFiles.length === 0) throw new Error("no_migrations_found");

const client = new Client({ connectionString: databaseUrl });
await client.connect();
try {
  for (const migrationFile of migrationFiles) {
    const sql = await fs.readFile(path.join(migrationsDir, migrationFile), "utf8");
    await client.query(sql);
    console.log(`Applied ${migrationFile}`);
  }
  console.log(`NEO Pads migrations complete (${migrationFiles.length})`);
} finally {
  await client.end();
}
