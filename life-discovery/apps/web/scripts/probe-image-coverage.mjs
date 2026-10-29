const endpoints = [
  ["/api/places?city=Sao%20Paulo&categories=catering.restaurant", "places"],
  ["/api/events/local?limit=15", "events-local"],
  ["/api/gastro/editorial?limit=12", "gastro"],
  ["/api/cinema/news?limit=8", "cinema-news"],
  ["/api/tmdb?type=now_playing", "tmdb"],
];

function stats(items, label) {
  const list = Array.isArray(items) ? items : [];
  const withImg = list.filter((i) => i.image_url);
  const hosts = {};
  for (const i of withImg) {
    try {
      const h = new URL(i.image_url).hostname;
      hosts[h] = (hosts[h] || 0) + 1;
    } catch {
      hosts.invalid = (hosts.invalid || 0) + 1;
    }
  }
  console.log(`\n${label}: ${withImg.length}/${list.length} com imagem`);
  console.log("hosts", hosts);
  for (const i of list.slice(0, 3)) {
    console.log(" -", i.title?.slice(0, 50), i.image_url ? "✓" : "✗", i.source);
  }
}

const base = process.env.BASE || "http://localhost:3010";

for (const [path, label] of endpoints) {
  try {
    const res = await fetch(base + path);
    const data = await res.json();
    stats(data, label);
  } catch (e) {
    console.log(label, "FAIL", e.message);
  }
}
