const html = await fetch(
  "https://prefeitura.sp.gov.br/web/meio_ambiente/w/divis%C3%A3o-dos-planet%C3%A1rios-municipais-dpm-",
  { headers: { "User-Agent": "Mozilla/5.0" } }
).then((r) => r.text());

const ibi = [...html.matchAll(/href=["']([^"']+)["']/gi)]
  .map((m) => m[1])
  .filter((h) => /ibirapuera|planet[aá]rio|programacao|\/w\//i.test(h));
console.log("ibirapuera links", [...new Set(ibi)].slice(0, 25));

const text = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<[^>]+>/g, " ");
const idx = text.toLowerCase().indexOf("ibirapuera");
console.log("ibirapuera context", text.slice(Math.max(0, idx - 50), idx + 200));

// programacao umapaz - look for calendar table or event titles
const prog = await fetch("https://www.prefeitura.sp.gov.br/web/meio_ambiente/w/programacao-umapaz", {
  headers: { "User-Agent": "Mozilla/5.0" },
}).then((r) => r.text());

const progText = prog.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
console.log("\nprogramacao snippet", progText.slice(0, 1500));

const numericLinks = [
  ...new Set(
    [...prog.matchAll(/href=["']([^"']+)["']/gi)]
      .map((m) => m[1])
      .filter((h) => /\/w\/[^/]+\/\d{5,}/i.test(h))
  ),
];
console.log("\nnumeric w links", numericLinks.slice(0, 20));
