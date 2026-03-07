export function safeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  return tags.map((x) => String(x));
}
