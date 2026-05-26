/**
 * Whether `pathname` matches a primary nav `href` (exact or nested segment).
 * Products pass the current pathname from `usePathname()` and each item's `href`.
 */
export function appShellNavHrefActive(pathname: string, href: string): boolean {
  const pathOnly = href.split("#")[0] ?? href;
  return pathname === pathOnly || (pathOnly.length > 1 && pathname.startsWith(`${pathOnly}/`));
}
