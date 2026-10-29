const html = await fetch("https://www.prefeitura.sp.gov.br/web/meio_ambiente/w/programacao-umapaz", {
  headers: { "User-Agent": "Mozilla/5.0" },
}).then((r) => r.text());

// look for portlet/article content
const articles = html.match(/<article[\s\S]*?<\/article>/gi) || [];
console.log("articles", articles.length);

// calendar/event patterns
for (const pattern of [/junho|maio|2026/gi, /planet[aá]rio/gi, /sess[aã]o/gi, /show/gi]) {
  console.log(pattern, (html.match(pattern) || []).length);
}

// data attributes or embedded json
const dataAttrs = [...html.matchAll(/data-[a-z-]+=["']([^"']{20,})["']/gi)].slice(0, 5);
console.log("data attrs sample", dataAttrs.map((m) => m[0].slice(0, 120)));

// fetch fragment API common in Liferay
const fragment = await fetch(
  "https://www.prefeitura.sp.gov.br/o/headless-delivery/v1.0/sites/20117/structured-contents?flatten=true&filter=title%20contains%20%27planet%27&pageSize=5",
  { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" } }
);
console.log("liferay api", fragment.status, (await fragment.text()).slice(0, 400));
