const html = await fetch("https://www.itaucultural.org.br/agenda", {
  headers: { "User-Agent": "Mozilla/5.0" },
}).then((r) => r.text());
const buildId = html.match(/"buildId":"([^"]+)"/)?.[1];
const data = await fetch(`https://www.itaucultural.org.br/_next/data/${buildId}/agenda.json`).then((r) => r.json());

for (const s of data.pageProps.schedules.slice(0, 5)) {
  const nested = s.schedules;
  console.log(s.title.slice(0, 60));
  console.log("  nested len", nested?.length, "ticket", s.ticket, "online", s.online);
  if (nested?.length) console.log("  first nested", JSON.stringify(nested[0]).slice(0, 300));
}
