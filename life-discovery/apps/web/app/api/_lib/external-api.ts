import { NextResponse } from "next/server";

type CacheOptions = {
  revalidate: number;
  stale?: number;
  fallbackMaxAge?: number;
};

export function cacheHeaders({ revalidate, stale = Math.floor(revalidate / 3) }: CacheOptions) {
  return {
    "Cache-Control": `public, s-maxage=${revalidate}, stale-while-revalidate=${stale}`,
  };
}

export function fallbackHeaders({ fallbackMaxAge = 60 }: CacheOptions) {
  return {
    "Cache-Control": `public, s-maxage=${fallbackMaxAge}`,
  };
}

export function jsonWithCache<T>(payload: T, cache: CacheOptions) {
  return NextResponse.json(payload, { headers: cacheHeaders(cache) });
}

export function jsonFallback<T>(payload: T, cache: CacheOptions) {
  return NextResponse.json(payload, { headers: fallbackHeaders(cache) });
}

export async function fetchExternalJson<T>(
  url: string,
  options: RequestInit & { revalidate: number; timeoutMs?: number } = { revalidate: 600 }
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 8000);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      next: { revalidate: options.revalidate },
    });
    if (!res.ok) throw new Error(`External API error: ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}
