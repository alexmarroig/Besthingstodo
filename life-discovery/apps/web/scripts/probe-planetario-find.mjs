const base = "https://www.prefeitura.sp.gov.br/cidade/secretarias/meio_ambiente/planetario_ibirapuera/";
const html = await fetch(base, { headers: { "User-Agent": "Mozilla/5.0" } }).then((r) => r.text());
console.log("status len", html.length);

const links = [...new Set([...html.matchAll(/href=["']([^"']+)["']/gi)].map((m) => m[1]))];
const prog = links.filter((h) => /programacao|programa|sessao|evento|agenda|umapaz|\/w\//i.test(h));
console.log("prog links", prog);

// try capital.sp.gov.br planetario
const urls = [
  "https://capital.sp.gov.br/web/meio_ambiente/w/divis%C3%A3o-dos-planet%C3%A1rios-municipais-dpm-",
  "https://prefeitura.sp.gov.br/web/meio_ambiente/w/divis%C3%A3o-dos-planet%C3%A1rios-municipais-dpm-",
  "https://www.prefeitura.sp.gov.br/web/meio_ambiente/umapaz/conteudo/325092",
];

for (const url of urls) {
  const h = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } }).then((r) => r.text());
  const eventLinks = [...new Set([...h.matchAll(/href=["']([^"']+)["']/gi)].map((m) => m[1]))].filter((l) =>
    /programacao|planet[aá]rio|sess[aã]o|\/w\/[^/]+\/\d+/i.test(l)
  );
  console.log("\n", url.slice(0, 80), "len", h.length, "matches", eventLinks.length);
  console.log(eventLinks.slice(0, 10));
}
