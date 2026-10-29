const pages = [
  ["Planetario", "https://prefeitura.sp.gov.br/web/meio_ambiente/umapaz/planetario_ibirapuera/"],
  ["MIS prog", "https://mis-sp.org.br/programacao/"],
  ["MIS expo", "https://mis-sp.org.br/exposicoes/"],
  ["SESC Pinheiros", "https://www.sescsp.org.br/unidades/pinheiros/"],
];

for (const [name, url] of pages) {
  const html = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } }).then((r) => r.text());
  const links = [...html.matchAll(/href="(https:\/\/[^"]+|\/[^"]+)"/g)]
    .map((m) => m[1])
    .filter((h) => !h.includes("wp-content") && !h.includes("facebook") && !h.includes("instagram"))
    .slice(0, 20);
  console.log("\n===", name, "===");
  console.log(links.join("\n"));
}
