const routes = [
  "/api/gastro/editorial?topic=all",
  "/api/events/local",
  "/api/cinema/news",
  "/api/delivery/nearby",
  "/api/places?city=Sao%20Paulo",
  "/api/events?city=Sao%20Paulo",
  "/api/tmdb?type=now_playing",
];

async function validateDailySnapshot(baseUrl) {
  const res = await fetch(`${baseUrl}/data/daily-snapshot.json`);
  if (!res.ok) {
    console.warn("WARN /data/daily-snapshot.json unavailable (fallback runtime expected)");
    return 0;
  }
  const data = await res.json();
  const count = Array.isArray(data.items) ? data.items.length : 0;
  console.log(`OK /data/daily-snapshot.json -> ${count} items`);
  return count;
}

async function validateRoute(baseUrl, route) {
  const url = `${baseUrl}${route}`;
  const res = await fetch(url);
  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Route returned non-JSON payload: ${route}`);
  }
  const count = Array.isArray(data) ? data.length : 0;
  console.log(`${res.ok ? "OK" : "FAIL"} ${route} -> ${count} items`);
  if (!res.ok) throw new Error(`Route failed: ${route}`);
  return count;
}

async function main() {
  const baseUrl = process.argv[2] || "http://localhost:3000";
  console.log(`Validating API routes at ${baseUrl}`);
  await validateDailySnapshot(baseUrl);
  for (const route of routes) {
    await validateRoute(baseUrl, route);
  }
  console.log("All routes validated.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
