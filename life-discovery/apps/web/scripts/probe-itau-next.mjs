const html = await fetch("https://www.itaucultural.org.br/agenda", {
  headers: { "User-Agent": "Mozilla/5.0" },
}).then((r) => r.text());

const buildMatch = html.match(/"buildId":"([^"]+)"/);
console.log("buildId", buildMatch?.[1]);

if (buildMatch?.[1]) {
  const dataUrl = `https://www.itaucultural.org.br/_next/data/${buildMatch[1]}/agenda.json`;
  const data = await fetch(dataUrl, { headers: { "User-Agent": "Mozilla/5.0" } }).then((r) => r.json());
  console.log("keys", Object.keys(data));
  console.log(JSON.stringify(data).slice(0, 1500));
}

// Also try __NEXT_DATA__
const nextData = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
if (nextData) {
  const parsed = JSON.parse(nextData[1]);
  console.log("\nNEXT props keys", Object.keys(parsed.props?.pageProps || {}));
  console.log(JSON.stringify(parsed.props?.pageProps).slice(0, 1200));
}
