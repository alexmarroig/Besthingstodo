const STORAGE_KEY = "life_image_cache_v2";
const imageUrlById = new Map<string, string>();
const inFlightRequests = new Map<string, Promise<string | null>>();
let storageHydrated = false;

function hydrateFromSession() {
  if (storageHydrated || typeof window === "undefined") return;
  storageHydrated = true;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, string>;
    for (const [id, url] of Object.entries(parsed)) {
      if (id && url) imageUrlById.set(id, url);
    }
  } catch {
    // ignore storage errors
  }
}

function persistToSession() {
  if (typeof window === "undefined") return;
  try {
    const obj: Record<string, string> = {};
    let count = 0;
    for (const [id, url] of imageUrlById.entries()) {
      obj[id] = url;
      count += 1;
      if (count >= 250) break;
    }
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch {
    // ignore quota errors
  }
}

export function getCachedImageUrl(id?: string | null): string | null {
  if (!id) return null;
  hydrateFromSession();
  return imageUrlById.get(id) || null;
}

export function setCachedImageUrl(id: string, url: string | null | undefined) {
  if (!id || !url) return;
  hydrateFromSession();
  imageUrlById.set(id, url);
  persistToSession();
}

export function setCachedImageUrls(entries: Record<string, string | null | undefined>) {
  hydrateFromSession();
  for (const [id, url] of Object.entries(entries)) {
    if (id && url) imageUrlById.set(id, url);
  }
  persistToSession();
}

export async function fetchEditorialImageDeduped(id: string, resolverUrl: string): Promise<string | null> {
  const cached = getCachedImageUrl(id);
  if (cached) return cached;

  const existing = inFlightRequests.get(resolverUrl);
  if (existing) return existing;

  const promise = fetch(resolverUrl, { cache: "force-cache" })
    .then((res) => (res.ok ? res.json() : { url: null }))
    .then((payload) => {
      const url = typeof payload?.url === "string" && payload.url.trim() ? payload.url.trim() : null;
      if (id && url) setCachedImageUrl(id, url);
      return url;
    })
    .catch(() => null)
    .finally(() => {
      inFlightRequests.delete(resolverUrl);
    });

  inFlightRequests.set(resolverUrl, promise);
  return promise;
}

export function preloadImageUrls(urls: Array<string | null | undefined>, limit = 8) {
  if (typeof window === "undefined") return;
  const seen = new Set<string>();
  const toPreload: string[] = [];

  for (const url of urls) {
    if (!url || seen.has(url) || toPreload.length >= limit) continue;
    seen.add(url);
    toPreload.push(url);
  }

  const run = () => {
    for (const url of toPreload) {
      const img = new window.Image();
      img.decoding = "async";
      img.src = url;
    }
  };

  if ("requestIdleCallback" in window) {
    (window as any).requestIdleCallback(run, { timeout: 1200 });
  } else {
    setTimeout(run, 120);
  }
}
