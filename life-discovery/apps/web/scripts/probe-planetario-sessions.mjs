const urls = [
  "https://prefeitura.sp.gov.br/web/meio_ambiente/w/programacao-sessoes-planet%C3%A1rio",
  "https://prefeitura.sp.gov.br/web/meio_ambiente/w/umapaz/programacao_mensal/1",
  "https://prefeitura.sp.gov.br/web/meio_ambiente/w/umapaz/programacao_mensal/345",
];

for (const url of urls) {
  const html = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } }).then((r) => r.text());
  const title = html.match(/<title>([^<]+)/i)?.[1];
  console.log("\n", title?.slice(0, 100));
  const events = [...html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .map((m) => ({ href: m[1], text: m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() }))
    .filter((a) => a.text.length >= 8 && /\/w\//i.test(a.href) && !/menu|carta|acesso|parques/i.test(a.text));
  console.log("events", events.length);
  console.log(events.slice(0, 10));
}
