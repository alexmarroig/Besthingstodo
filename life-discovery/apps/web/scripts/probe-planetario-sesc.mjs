const planetHtml = await fetch(
  "https://www.prefeitura.sp.gov.br/cidade/secretarias/meio_ambiente/planetario_ibirapuera/programacao_mensal/345",
  { headers: { "User-Agent": "Mozilla/5.0" } }
).then((r) => r.text());

const planetLinks = [
  ...new Set(
    [...planetHtml.matchAll(/href=["']([^"']+)["']/gi)]
      .map((m) => m[1])
      .filter((h) => h.includes("/web/meio_ambiente/w/") && !/programacao|umapaz/i.test(h))
  ),
];
console.log("planetario links", planetLinks.length, planetLinks.slice(0, 5));

for (const slug of ["pinheiros", "24-de-maio", "consolacao", "belenzinho", "pompeia"]) {
  const html = await fetch(`https://www.sescsp.org.br/unidades/${slug}/`, {
    headers: { "User-Agent": "Mozilla/5.0" },
  }).then((r) => r.text());
  const editorial = [
    ...new Set(
      [...html.matchAll(/href=["']([^"']+)["']/gi)]
        .map((m) => m[1])
        .filter((h) => /sescsp\.org\.br\/editorial\//i.test(h) || /\/editorial\//i.test(h))
    ),
  ];
  console.log(slug, editorial.length, editorial.slice(0, 2));
}
