/**
 * Customer-facing Project lists: active = `archived_at IS NULL`.
 * Direct single-Project access does not use these filters.
 */

export function filterActiveProjects<T extends { is: (column: string, value: null) => T }>(
  query: T,
): T {
  return query.is("archived_at", null);
}

export function filterArchivedProjects<
  T extends { not: (column: string, operator: "is", value: null) => T },
>(query: T): T {
  return query.not("archived_at", "is", null);
}
