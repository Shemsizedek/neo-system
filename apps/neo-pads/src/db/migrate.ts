import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationPath = path.resolve(here, "../../db/migrations/001_production_ledger.sql");
const sql = await fs.readFile(migrationPath, "utf8");

const client = new Client({ connectionString: databaseUrl });
await client.connect();
try {
  await client.query(sql);
  console.log("NEO Pads production ledger migration complete");
} finally {
  await client.end();
}
