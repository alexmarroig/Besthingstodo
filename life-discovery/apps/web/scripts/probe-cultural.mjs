const urls = [
  "https://www.sescsp.org.br/programacao/",
  "https://masp.org.br/exposicoes",
];

for (const url of urls) {
  const html = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0", "Accept-Language": "pt-BR" },
  }).then((r) => r.text());
  console.log("\n===", url, "===");
  console.log("jsonld", (html.match(/application\/ld\+json/g) || []).length);
  console.log("exposicoes", (html.match(/\/exposicoes\//g) || []).length);
  console.log("sesc links", (html.match(/sescsp\.org\.br\/[^\"'\s]+/g) || []).slice(0, 6));
}
