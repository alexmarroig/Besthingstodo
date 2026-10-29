const html = await fetch("https://www.itaucultural.org.br/agenda", {
  headers: { "User-Agent": "Mozilla/5.0" },
}).then((r) => r.text());

const links = [...html.matchAll(/href="([^"]+)"/g)]
  .map((m) => m[1])
  .filter((h) => h.includes("itaucultural.org.br") && !h.includes("wp-content"))
  .slice(0, 25);
console.log("Itau links:\n", links.join("\n"));

const planet = await fetch(
  "https://prefeitura.sp.gov.br/web/meio_ambiente/umapaz/planetario_ibirapuera/",
  { headers: { "User-Agent": "Mozilla/5.0" } }
).then((r) => r.text());
const planetLinks = [...planet.matchAll(/href="([^"]+)"/g)]
  .map((m) => m[1])
  .filter((h) => /programa|sessao|agenda|evento|planetario/i.test(h))
  .slice(0, 20);
console.log("\nPlanetario links:\n", planetLinks.join("\n"));

const misExpo = await fetch("https://mis-sp.org.br/wp-json/tribe/events/v1/events?per_page=3").then((r) =>
  r.json()
);
console.log("\nMIS events count:", misExpo.events?.length, misExpo.events?.[0]?.title);
