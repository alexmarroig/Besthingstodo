const html = await fetch(
  "https://www.prefeitura.sp.gov.br/cidade/secretarias/meio_ambiente/planetario_ibirapuera/programacao_mensal/345",
  { headers: { "User-Agent": "Mozilla/5.0" } }
).then((r) => r.text());

console.log("has planetario", /planet[aá]rio/i.test(html));
console.log("has sessao", /sess[aã]o/i.test(html));
console.log("has programacao", /programa[cç][aã]o/i.test(html));

// look for content blocks
const titles = [...html.matchAll(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/gi)]
  .map((m) => m[1].replace(/<[^>]+>/g, "").trim())
  .filter((t) => t.length > 5);
console.log("h tags", titles.slice(0, 20));

// any absolute links
const abs = [...new Set([...html.matchAll(/https?:\/\/[^"'\s<>]+/gi)].map((m) => m[0]))].filter((u) =>
  /planet|umapaz|meio_ambiente|capital\.sp/i.test(u)
);
console.log("abs urls", abs.slice(0, 20));

// relative /web links
const web = [...new Set([...html.matchAll(/\/web\/[^"'\s<>]+/gi)].map((m) => m[0]))];
console.log("web paths", web.slice(0, 20));
