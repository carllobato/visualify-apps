/** Non-httpOnly cookie so the server can read pinned state for SSR (matches `riskai-side-nav-pinned` in localStorage). */
export const SIDE_NAV_PINNED_COOKIE_NAME = "riskai_side_nav_pinned";

export function parseSideNavPinnedCookie(raw: string | undefined): boolean | null {
  if (raw === "true") return true;
  if (raw === "false") return false;
  return null;
}

export function cookieValueForPinned(pinned: boolean): string {
  return pinned ? "true" : "false";
}

export function setSideNavPinnedCookie(pinned: boolean): void {
  if (typeof document === "undefined") return;
  try {
    document.cookie = `${SIDE_NAV_PINNED_COOKIE_NAME}=${cookieValueForPinned(pinned)}; Path=/; Max-Age=31536000; SameSite=Lax`;
  } catch {
    /* silent */
  }
}
