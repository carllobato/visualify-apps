/**
 * Google favicon URL for a workspace website hostname. Primary source for workspace avatars in ControlAI UI.
 */
const GOOGLE_FAVICON_BASE = "https://www.google.com/s2/favicons";

function hostnameFromWebsiteUrl(websiteUrl: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(websiteUrl);
  } catch {
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
  if (websiteUrl == null) {
    return null;
  }

  const trimmed = websiteUrl.trim();
  if (!trimmed) {
    return null;
  }

  const hostname = hostnameFromWebsiteUrl(trimmed);
  if (!hostname) {
    return null;
  }

  return `${GOOGLE_FAVICON_BASE}?domain=${encodeURIComponent(hostname)}&sz=128`;
}
