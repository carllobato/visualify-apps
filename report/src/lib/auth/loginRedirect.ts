/**
 * Login redirect with optional return path (requires `x-pathname` from `proxy.ts`).
 */
export function buildLoginRedirectUrl(pathname: string): string {
  const base = "/login";
  if (!pathname || pathname === "/") return base;
  return `${base}?next=${encodeURIComponent(pathname)}`;
}
