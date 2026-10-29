const html = await fetch(
  "https://prefeitura.sp.gov.br/web/meio_ambiente/w/divis%C3%A3o-dos-planet%C3%A1rios-municipais-dpm-",
  { headers: { "User-Agent": "Mozilla/5.0" } }
).then((r) => r.text());

// extract anchor with planetario in text or href
for (const match of html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
  const href = match[1];
  const text = match[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (/planet[aá]rio|ibirapuera|programa[cç][aã]o/i.test(`${text} ${href}`)) {
    console.log(text.slice(0, 100), "->", href);
  }
}

// json-ld
const ld = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
console.log("jsonld blocks", ld?.length || 0);

// search raw text for ibirapuera
const plain = html.replace(/<[^>]+>/g, "\n");
for (const line of plain.split("\n")) {
  if (/planet[aá]rio|ibirapuera/i.test(line) && line.trim().length > 10 && line.trim().length < 200) {
    console.log("LINE:", line.trim());
  }
}
