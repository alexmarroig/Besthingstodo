const sites = [
  ["MIS", "https://mis-sp.org.br/programacao/"],
  ["MIS alt", "https://www.mis-sp.org.br/"],
  ["Itau Cultural", "https://itau.com.br/cultural/programacao"],
  ["Itau alt", "https://www.itaucultural.org.br/programacao"],
  ["Planetario", "https://prefeitura.sp.gov.br/web/meio_ambiente/umapaz/planetario_ibirapuera/"],
  ["SESC Paulista", "https://www.sescsp.org.br/unidades/paulista/"],
  ["SESC Pinheiros", "https://www.sescsp.org.br/unidades/pinheiros/"],
  ["SESC 24 de Maio", "https://www.sescsp.org.br/unidades/24-de-maio/"],
];

for (const [name, url] of sites) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", "Accept-Language": "pt-BR" }, redirect: "follow" });
    const html = await res.text();
    console.log(name, res.status, res.url.replace(/^https?:\/\//, "").slice(0, 60), "len", html.length, "jsonld", (html.match(/application\/ld\+json/g) || []).length);
  } catch (e) {
    console.log(name, "ERR", e.message);
  }
}
