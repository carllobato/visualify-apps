/** Display-only: strip legacy product suffix from stored project names. */
export function formatProjectDisplayName(name: string | null | undefined): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return "Untitled";
  const withoutSuffix = trimmed.replace(/\s*\(ControlAI\)\s*$/i, "").trim();
  return withoutSuffix || "Untitled";
}
