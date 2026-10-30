import { neon } from '@neondatabase/serverless';
import { readFile } from 'node:fs/promises';
const sql = neon(process.env.DATABASE_URL || (() => { throw new Error('DATABASE_URL is required'); })());
const source = JSON.parse(await readFile(new URL('../public/data/daily-snapshot.json',import.meta.url),'utf8'));
const groups = new Map();
for (const row of source.items || []) {
  const item={ ...row, ...(row.payload || {}) }; delete item.payload;
  const key=`${item.domain}|${item.city || 'São Paulo'}`;
  if(!groups.has(key))groups.set(key,[]);
  groups.get(key).push(item);
}
for (const [key,items] of groups) {
  const [domain,city]=key.split('|');const sourceKey=`seed:${domain}:${city}`;
  await sql`INSERT INTO catalog_sources(source_key,domain,city,items,last_success_at)
    VALUES (${sourceKey},${domain},${city},${JSON.stringify(items)}::jsonb,${source.generated_at}) ON CONFLICT DO NOTHING`;
}
console.log('Initial catalog imported without replacing existing source data: '+groups.size+' groups.');
