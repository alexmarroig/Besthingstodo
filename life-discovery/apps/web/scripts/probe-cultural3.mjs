const planetUrl = "https://prefeitura.sp.gov.br/web/meio_ambiente/w/umapaz/programacao_mensal/345";
const planetHtml = await fetch(planetUrl, { headers: { "User-Agent": "Mozilla/5.0" } }).then((r) => r.text());
console.log("planet prog len", planetHtml.length);
const planetLinks = [...planetHtml.matchAll(/href="([^"]+)"/g)]
  .map((m) => m[1])
  .filter((h) => /umapaz|planetario|programacao/i.test(h) && !h.includes("facebook"))
  .slice(0, 20);
console.log(planetLinks.join("\n"));

const itauHtml = await fetch("https://www.itaucultural.org.br/agenda", {
  headers: { "User-Agent": "Mozilla/5.0" },
}).then((r) => r.text());
console.log("\nitau has graphql", itauHtml.includes("graphql"));
console.log("itau script chunks", (itauHtml.match(/\/_next\//g) || []).length);

// Try Itau content API patterns
const apiUrls = [
  "https://www.itaucultural.org.br/api/agenda",
  "https://itaucultural.org.br/api/agenda",
  "https://www.itaucultural.org.br/wp-json/wp/v2/posts?per_page=5",
];
for (const u of apiUrls) {
  const r = await fetch(u, { headers: { "User-Agent": "Mozilla/5.0" } });
  console.log(u, r.status, r.headers.get("content-type")?.slice(0, 40));
}

// MIS expositions scrape
const misExpo = await fetch("https://mis-sp.org.br/exposicoes/").then((r) => r.text());
const expoLinks = [...misExpo.matchAll(/href="(https:\/\/mis-sp\.org\.br\/exposicao\/[^"]+)"/g)].map((m) => m[1]);
console.log("\nMIS expo links", expoLinks.slice(0, 8));

// SESC unit programacao paths
for (const unit of ["pinheiros", "24-de-maio", "consolacao", "belenzinho", "pompeia"]) {
  const html = await fetch(`https://www.sescsp.org.br/unidades/${unit}/`, {
    headers: { "User-Agent": "Mozilla/5.0" },
  }).then((r) => r.text());
  const editorial = (html.match(/\/editorial\//g) || []).length;
  const prog = html.includes("/programacao") || html.includes("programacao");
  console.log(unit, "editorial refs", editorial, "has prog", prog);
}
