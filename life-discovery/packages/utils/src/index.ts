export function normalizeText(value: string): string {
  return value.normalize("NFKD").replace(/[^\w\s-]/g, "").trim().toLowerCase();
}

export function dedupeByKey<T>(items: T[], getKey: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = getKey(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
