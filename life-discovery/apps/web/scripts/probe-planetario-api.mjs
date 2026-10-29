const html = await fetch("https://www.prefeitura.sp.gov.br/web/meio_ambiente/w/programacao-umapaz", {
  headers: { "User-Agent": "Mozilla/5.0" },
}).then((r) => r.text());

const apis = [
  ...new Set(
    [...html.matchAll(/https?:\/\/[^"'\s]+(?:api|graphql|headless|programacao|evento|calendar)[^"'\s]*/gi)].map((m) => m[0])
  ),
];
console.log("api urls in html", apis.slice(0, 20));

const relativeApis = [
  ...new Set([...html.matchAll(/\/o\/[^"'\s]+/gi)].map((m) => m[0]).filter((u) => u.length < 120)),
].slice(0, 30);
console.log("liferay /o paths", relativeApis);

// search for collection renderer config
const collections = [...html.matchAll(/collectionId["\s:=]+(\d+)/gi)].map((m) => m[1]);
console.log("collection ids", [...new Set(collections)]);

// try common liferay asset publisher API
for (const id of [...new Set(collections)].slice(0, 3)) {
  const url = `https://www.prefeitura.sp.gov.br/o/layout-list-retriever/v1.0/collections/${id}/items?pageSize=10`;
  const res = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" } });
  console.log("collection", id, res.status, (await res.text()).slice(0, 500));
}
