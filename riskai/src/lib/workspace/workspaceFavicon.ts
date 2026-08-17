/**
 * Google favicon URL for a workspace website hostname.
 * Same derivation as HQ / Report / ControlAI — the browser loads the image; no extra service.
 */
const GOOGLE_FAVICON_BASE = "https://www.google.com/s2/favicons";

function parsedWebsiteUrl(websiteUrl: string | null): URL | null {
  if (websiteUrl == null) {
    return null;
  }

  const trimmed = websiteUrl.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return new URL(trimmed);
  } catch {
    return null;
  }
}

function hostnameFromWebsiteUrl(websiteUrl: string): string | null {
  const parsed = parsedWebsiteUrl(websiteUrl);
  if (!parsed) {
    return null;
  }

  let hostname = parsed.hostname.toLowerCase();
  if (hostname.startsWith("www.")) {
    hostname = hostname.slice(4);
  }

  return hostname || null;
}

/**
 * Derive a favicon image URL from a normalised workspace website URL. Does not fetch or validate
 * the image — the browser loads it on the client.
 */
export function resolveWorkspaceFaviconUrl(websiteUrl: string | null): string | null {
  const hostname = hostnameFromWebsiteUrl(websiteUrl ?? "");
  if (!hostname) {
    return null;
  }

  return `${GOOGLE_FAVICON_BASE}?domain=${encodeURIComponent(hostname)}&sz=128`;
}

/**
 * Direct `/favicon.ico` on the workspace origin. Used when Google only has the 16×16 globe
 * placeholder. Keeps `www` from the stored URL so the request matches the live site.
 */
export function resolveWorkspaceSiteFaviconUrl(websiteUrl: string | null): string | null {
  const parsed = parsedWebsiteUrl(websiteUrl);
  if (!parsed) {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return null;
  }

  if (!parsed.hostname) {
    return null;
  }

  return `${parsed.origin}/favicon.ico`;
}

/** Image URLs for the rail avatar: Google, then site `.ico`, then stored logo. */
export function workspaceAvatarImageUrls(
  websiteUrl: string | null,
  logoUrl: string | null | undefined,
): Array<string | null> {
  return [resolveWorkspaceFaviconUrl(websiteUrl), resolveWorkspaceSiteFaviconUrl(websiteUrl), logoUrl ?? null];
}
