import { neon } from '@neondatabase/serverless';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const connection = process.env.DATABASE_URL;
if (!connection) throw new Error('DATABASE_URL must be configured; the connection is never logged.');
const sql = neon(connection);
const dir = fileURLToPath(new URL('../db/migrations/', import.meta.url));
await sql`CREATE TABLE IF NOT EXISTS app_schema_migrations(name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`;
for (const name of (await readdir(dir)).filter(n => n.endsWith('.sql')).sort()) {
  const done = await sql`SELECT name FROM app_schema_migrations WHERE name=${name}`;
  if (done.length) continue;
  const source = await readFile(path.join(dir, name), 'utf8');
  const statements = source.split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean);
  await sql.transaction([
    sql`SELECT pg_advisory_xact_lock(87110573)`,
    ...statements.map(statement => sql.query(statement, [])),
    sql`INSERT INTO app_schema_migrations(name) VALUES (${name}) ON CONFLICT DO NOTHING`,
  ]);
  console.log('Applied migration: '+name);
}
console.log('Database migrations are up to date.');
