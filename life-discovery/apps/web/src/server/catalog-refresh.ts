import "server-only";
import { database } from "./db";
import { catalogCollectors, type CatalogCollector } from "./catalog-collectors";

export async function refreshCatalog(collectors: CatalogCollector[] = catalogCollectors()) {
  const sql = database();
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const claim = await sql`INSERT INTO catalog_runs(run_date,status) VALUES (${date},'running')
    ON CONFLICT(run_date) DO UPDATE SET status='running',started_at=now(),finished_at=null
    WHERE catalog_runs.status IN ('failed','partial') OR (catalog_runs.status='running' AND catalog_runs.started_at<now()-interval '10 minutes') RETURNING run_date`;
  if (!claim.length) return { skipped: true, date };
  const results: Array<{ source: string; status: string; items: number }> = [];
  try {
    // Small batches keep provider and database usage bounded on the Free plan.
    for (let index = 0; index < collectors.length; index += 6) {
      await Promise.all(collectors.slice(index, index + 6).map(async collector => {
        try {
          const previous = await sql`SELECT source_key FROM catalog_snapshots WHERE source_key=${collector.key} AND snapshot_date=${date}`;
          if (previous.length) { results.push({ source: collector.key, status: "already_updated", items: 0 }); return; }
          const items = (await collector.collect()).filter(item => item.id && item.title).slice(0, 100);
          if (!items.length) throw new Error("empty_response");
          await sql.transaction([
            sql`INSERT INTO catalog_sources(source_key,domain,city,items,last_success_at,last_attempt_at,last_error)
              VALUES (${collector.key},${collector.domain},${collector.city},${JSON.stringify(items)}::jsonb,now(),now(),null)
              ON CONFLICT(source_key) DO UPDATE SET items=excluded.items,last_success_at=now(),last_attempt_at=now(),last_error=null`,
            sql`INSERT INTO catalog_snapshots(source_key,snapshot_date,domain,city,items)
              VALUES (${collector.key},${date},${collector.domain},${collector.city},${JSON.stringify(items)}::jsonb)
              ON CONFLICT(source_key,snapshot_date) DO NOTHING`,
          ]);
          results.push({ source: collector.key, status: "ok", items: items.length });
        } catch {
          await sql`INSERT INTO catalog_sources(source_key,domain,city,last_attempt_at,last_error) VALUES (${collector.key},${collector.domain},${collector.city},now(),'source_unavailable')
            ON CONFLICT(source_key) DO UPDATE SET last_attempt_at=now(),last_error='source_unavailable'`;
          results.push({ source: collector.key, status: "unavailable", items: 0 });
        }
      }));
    }
    const status = results.some(r => r.status === "unavailable") ? "partial" : "ok";
    await sql.transaction([
      sql`UPDATE catalog_runs SET status=${status},stats=${JSON.stringify(results)}::jsonb,finished_at=now() WHERE run_date=${date}`,
      sql`DELETE FROM catalog_snapshots WHERE snapshot_date < (${date}::date - 30)`,
      sql`DELETE FROM catalog_runs WHERE run_date < (${date}::date - 30)`,
    ]);
    return { date, status, sources: results };
  } catch (error) {
    await sql`UPDATE catalog_runs SET status='failed',stats=${JSON.stringify(results)}::jsonb,finished_at=now() WHERE run_date=${date}`;
    throw error;
  }
}
