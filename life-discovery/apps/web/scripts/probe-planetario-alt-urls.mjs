const urls = [
  "https://www.prefeitura.sp.gov.br/web/meio_ambiente/programacao-umapaz",
  "https://prefeitura.sp.gov.br/web/meio_ambiente/programacao-umapaz",
  "https://www.prefeitura.sp.gov.br/cidade/secretarias/meio_ambiente/planetario_ibirapuera/programacao_mensal",
];

for (const url of urls) {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, redirect: "follow" });
  const html = await res.text();
  const notFound = /n[aã]o encontrada/i.test(html);
  const anchors = [...html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .map((m) => ({ href: m[1], text: m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() }))
    .filter((a) => a.text.length >= 10 && !/menu|acesso|parques|legisla/i.test(a.text));
  console.log("\n", url, res.status, notFound ? "404" : "ok", "anchors", anchors.length);
  console.log(anchors.slice(0, 8));
}

// search html for embedded list JSON
const html = await fetch("https://www.prefeitura.sp.gov.br/web/meio_ambiente/w/programacao-umapaz").then((r) => r.text());
const jsonChunks = [...html.matchAll(/\{"classNameId"[\s\S]{50,800}?\}/g)].slice(0, 3);
console.log("\njson chunks", jsonChunks.length);
for (const c of jsonChunks) console.log(c[0].slice(0, 300));
