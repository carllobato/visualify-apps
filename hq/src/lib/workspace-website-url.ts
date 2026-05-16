import "server-only";

const MAX_WEBSITE_URL_LENGTH = 2048;
const HAS_URL_PROTOCOL = /^[a-z][a-z0-9+.-]*:\/\//i;

function isPlausibleWebsiteHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === "localhost") return true;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  if (host.includes(":")) return true;
  return host.includes(".");
}

export type ParseWorkspaceWebsiteUrlResult =
  | { ok: true; url: string | null }
  | { ok: false };

/**
 * Normalise optional workspace website input: trim, blank → null, bare host → https://,
 * reject clearly invalid URLs.
 */
export function parseOptionalWorkspaceWebsiteUrl(raw: string): ParseWorkspaceWebsiteUrlResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: true, url: null };
  }
  if (trimmed.length > MAX_WEBSITE_URL_LENGTH) {
    return { ok: false };
  }

  let candidate = trimmed;
  if (!HAS_URL_PROTOCOL.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return { ok: false };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false };
  }

  const hostname = parsed.hostname;
  if (!hostname || !isPlausibleWebsiteHost(hostname)) {
    return { ok: false };
  }

  return { ok: true, url: parsed.href };
}
