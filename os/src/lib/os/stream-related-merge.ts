import "server-only";

/** Merge query rows by id, preserving first-seen order then appending new ids. */
export function mergeById<T extends { id: string }>(
  primary: T[],
  secondary: T[],
  limit: number,
): T[] {
  const seen = new Set<string>();
  const merged: T[] = [];

  for (const item of [...primary, ...secondary]) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    merged.push(item);
    if (merged.length >= limit) break;
  }

  return merged;
}
