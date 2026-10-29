// Smoke test das novas fontes (sem importar TS)
const today = new Date().toISOString().slice(0, 10);

const mis = await fetch(
  `https://mis-sp.org.br/wp-json/tribe/events/v1/events?per_page=3&start_date=${today}`
).then((r) => r.json());
console.log("MIS tribe", mis.events?.length, mis.events?.[0]?.title?.slice(0, 50));

const html = await fetch("https://www.itaucultural.org.br/agenda").then((r) => r.text());
const buildId = html.match(/"buildId":"([^"]+)"/)?.[1];
const itau = await fetch(`https://www.itaucultural.org.br/_next/data/${buildId}/agenda.json`).then((r) => r.json());
console.log("Itaú", itau.pageProps?.schedules?.length, itau.pageProps?.schedules?.[0]?.title?.slice(0, 50));

const planetHtml = await fetch(
  "https://prefeitura.sp.gov.br/web/meio_ambiente/w/programacao-sessoes-planet%C3%A1rio"
).then((r) => r.text());
const planetCount = [...planetHtml.matchAll(/href=["']([^"']+)["']/gi)]
  .map((m) => m[1])
  .filter((h) => /\/web\/meio_ambiente\/w\/sess/i.test(h)).length;
console.log("Planetário sessões links", planetCount);

const sescHtml = await fetch("https://www.sescsp.org.br/unidades/pinheiros/").then((r) => r.text());
const sescCount = [...sescHtml.matchAll(/href=["']([^"']+)["']/gi)]
  .map((m) => m[1])
  .filter((h) => /\/editorial\//i.test(h) && !/\/editorial\/?$/i.test(h.replace(/\/$/, ""))).length;
console.log("Sesc Pinheiros editorial", sescCount);
