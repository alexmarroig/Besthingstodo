const html = await fetch("https://mis-sp.org.br/exposicoes/", {
  headers: { "User-Agent": "Mozilla/5.0" },
}).then((r) => r.text());
const links = [...html.matchAll(/href=["']([^"']+)["']/gi)]
  .map((m) => m[1])
  .filter((h) => /\/exposicao\//i.test(h));
console.log("mis exposicao links", [...new Set(links)].slice(0, 8));
