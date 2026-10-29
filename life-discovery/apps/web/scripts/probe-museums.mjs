const sites = [
  ["Pinacoteca", "https://pinacoteca.org.br/visita/exposicoes-em-cartaz/"],
  ["CCBB", "https://culturabancodobrasil.com.br/portal/sao-paulo/programacao/"],
  ["IMS", "https://ims.com.br/programacao/sao-paulo/"],
];

for (const [name, url] of sites) {
  const html = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } }).then((r) => `${r.status} ${(r.ok ? "ok" : "fail")} len=${(await r.text()).length}`);
  console.log(name, url, html);
}
