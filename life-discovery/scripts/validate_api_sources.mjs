const routes = [
  "/api/gastro/editorial?topic=all",
  "/api/events/local",
  "/api/cinema/news",
  "/api/delivery/nearby",
  "/api/places?city=Sao%20Paulo",
  "/api/events?city=Sao%20Paulo",
  "/api/tmdb?type=now_playing",
];

async function validateRoute(baseUrl: string, route: string) {
  const url = `${baseUrl}${route}`;
  const res = await fetch(url);
  const data = await res.json();
  const count = Array.isArray(data) ? data.length : 0;
  console.log(`${res.ok ? "OK" : "FAIL"} ${route} -> ${count} items`);
  if (!res.ok) throw new Error(`Route failed: ${route}`);
  return count;
}

async function main() {
  const baseUrl = process.argv[2] || "http://localhost:3000";
  console.log(`Validating API routes at ${baseUrl}`);
  for (const route of routes) {
    await validateRoute(baseUrl, route);
  }
  console.log("All routes validated.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
