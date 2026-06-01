const sites = [
  ["Maní", "https://mani.com.br/"],
  ["Casa do Porco", "https://casadoporco.com/"],
  ["Evvai", "https://www.evvai.com.br/"],
  ["Braz", "https://www.brazpizza.com.br/"],
  ["Travessa", "https://www.travessa.com.br/"],
  ["Lellis", "https://lellis.com/"],
  ["Libertango", "https://www.libertango.com.br/"],
];

const patterns = [
  /property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
  /content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
  /name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
];

async function og(url) {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, redirect: "follow" });
  const html = await res.text();
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return new URL(match[1], res.url).toString();
  }
  return null;
}

for (const [name, url] of sites) {
  try {
    console.log(name, "=>", await og(url));
  } catch (error) {
    console.log(name, "ERR", error.message);
  }
}
