const urls = [
  "https://www.prefeitura.sp.gov.br/cidade/secretarias/meio_ambiente/planetario_ibirapuera/programacao_mensal/345",
  "https://www.prefeitura.sp.gov.br/cidade/secretarias/meio_ambiente/planetario_ibirapuera/",
  "https://www.prefeitura.sp.gov.br/web/meio_ambiente/w/programacao-umapaz",
];

for (const url of urls) {
  const html = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } }).then((r) => r.text());
  const all = [...html.matchAll(/href=["']([^"']+)["']/gi)].map((m) => m[1]);
  const meio = all.filter((h) => /meio_ambiente|planetario|umapaz/i.test(h));
  console.log("\n", url, "len", html.length, "meio links", meio.length);
  console.log([...new Set(meio)].slice(0, 12));
}

const html = await fetch("https://www.itaucultural.org.br/agenda", {
  headers: { "User-Agent": "Mozilla/5.0" },
}).then((r) => r.text());
const buildId = html.match(/"buildId":"([^"]+)"/)?.[1];
const data = await fetch(`https://www.itaucultural.org.br/_next/data/${buildId}/agenda.json`).then((r) => r.json());
const s = data.pageProps.schedules[0];
console.log("\nitau nested schedules sample", JSON.stringify(s.schedules?.slice?.(0, 2), null, 2));
