const menus = [
  "https://prefeitura.sp.gov.br/web/meio_ambiente/w/menu/267327",
  "https://prefeitura.sp.gov.br/web/meio_ambiente/w/menu/176187",
  "https://prefeitura.sp.gov.br/web/meio_ambiente/w/menu/246510",
];

for (const url of menus) {
  const html = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } }).then((r) => r.text());
  const title = html.match(/<title>([^<]+)/i)?.[1];
  const links = [
    ...new Set(
      [...html.matchAll(/href=["']([^"']+)["']/gi)]
        .map((m) => m[1])
        .filter((h) => /\/w\/[^/]+\/\d{4,}/i.test(h) && !/menu|carta|acesso|ouvidoria/i.test(h))
    ),
  ];
  console.log("\n", title?.slice(0, 80));
  console.log("links", links.length, links.slice(0, 8));
}

// search google-like on site - try planetario ibirapuera programacao path patterns
const tries = [
  "https://capital.sp.gov.br/web/meio_ambiente/w/planetario-do-ibirapuera",
  "https://prefeitura.sp.gov.br/web/meio_ambiente/w/planetario-do-ibirapuera",
  "https://prefeitura.sp.gov.br/web/meio_ambiente/w/planetario_ibirapuera",
  "https://capital.sp.gov.br/cidade/secretarias/meio_ambiente/planetario_ibirapuera/programacao_mensal/",
];
for (const url of tries) {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, redirect: "follow" });
  const html = await res.text();
  console.log(url, res.status, html.includes("não encontrada") ? "404" : "ok", html.length);
}
