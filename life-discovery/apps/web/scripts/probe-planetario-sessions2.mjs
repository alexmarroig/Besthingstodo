const html = await fetch(
  "https://prefeitura.sp.gov.br/web/meio_ambiente/w/programacao-sessoes-planet%C3%A1rio",
  { headers: { "User-Agent": "Mozilla/5.0" } }
).then((r) => r.text());

const events = [...html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
  .map((m) => ({ href: m[1], text: m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() }))
  .filter(
    (a) =>
      a.text.length >= 8 &&
      (/sess[aã]o|planet[aá]rio|show|filme|cosmos|estrel|ibirapuera|mostra/i.test(a.text) ||
        /\/w\/(mostra|sess|planet|umapaz\/[^/]+\/\d+)/i.test(a.href))
  );

console.log("session events", events.length);
for (const e of events.slice(0, 20)) console.log(e.text.slice(0, 90), "->", e.href);

// planetario ibirapuera page
const planet = await fetch(
  "https://prefeitura.sp.gov.br/web/meio_ambiente/w/umapaz/planetario_municipal_prof_acacio_riberi/283943",
  { headers: { "User-Agent": "Mozilla/5.0" } }
).then((r) => r.text());
const planetEvents = [...planet.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
  .map((m) => ({ href: m[1], text: m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() }))
  .filter((a) => a.text.length >= 8 && /\/w\//i.test(a.href) && !/menu|carta|acesso|parques|ouvidoria/i.test(a.text));
console.log("\nplanetario page events", planetEvents.length);
console.log(planetEvents.slice(0, 15));
