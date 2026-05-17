export function mergeClass(base: string, extra?: string): string {
  return extra?.trim() ? `${base} ${extra.trim()}` : base;
}
