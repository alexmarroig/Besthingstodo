const html = await fetch("https://www.itaucultural.org.br/agenda", {
  headers: { "User-Agent": "Mozilla/5.0" },
}).then((r) => r.text());

const buildId = html.match(/"buildId":"([^"]+)"/)?.[1];
const data = await fetch(`https://www.itaucultural.org.br/_next/data/${buildId}/agenda.json`, {
  headers: { "User-Agent": "Mozilla/5.0" },
}).then((r) => r.json());

const s = data.pageProps.schedules[0];
console.log("keys", Object.keys(s));
for (const k of ["startDate", "endDate", "date", "scheduleDate", "start", "end", "period", "dates"]) {
  if (s[k] !== undefined) console.log(k, s[k]);
}
console.log("url pattern", `https://www.itaucultural.org.br/agenda/${s.slug}`);
