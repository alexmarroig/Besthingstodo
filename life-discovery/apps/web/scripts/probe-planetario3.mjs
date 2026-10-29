const html = await fetch("https://www.prefeitura.sp.gov.br/web/meio_ambiente/w/programacao-umapaz", {
  headers: { "User-Agent": "Mozilla/5.0" },
}).then((r) => r.text());

const links = [
  ...new Set(
    [...html.matchAll(/href=["']([^"']+)["']/gi)]
      .map((m) => m[1])
      .filter((h) => /\/web\/meio_ambiente\/w\//i.test(h))
      .filter((h) => !/programacao-umapaz|menu|carta_de_servicos|acesso|participacao|noticias/i.test(h))
  ),
];
console.log("event-like links", links.length);
console.log(links.slice(0, 15));

// titles near links
const anchorRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
for (const match of html.matchAll(anchorRegex)) {
  const href = match[1];
  if (!/\/web\/meio_ambiente\/w\//i.test(href)) continue;
  if (/programacao-umapaz|menu|carta/i.test(href)) continue;
  const title = match[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (title.length >= 8) console.log(title.slice(0, 80), "->", href);
}
