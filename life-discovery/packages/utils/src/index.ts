export function normalizeText(value: string): string {
  return value.normalize("NFKD").replace(/[^\w\s-]/g, "").trim().toLowerCase();
}
