/**
 * MVP workspace logo URL from website hostname (Clearbit). Clearbit is best-effort only — many
 * domains have no logo or return broken images. UI should fall back to {@link resolveWorkspaceFaviconUrl}
 * and then initials/icon. Provider logic is isolated here so it can later be replaced with Brandfetch,
 * Logo.dev, upload, or a storage cache.
 */
const CLEARBIT_LOGO_BASE = "https://logo.clearbit.com";

/**
 * Derive a logo image URL from a normalised workspace website URL. Does not fetch or validate
 * that the logo exists — callers store the returned URL on `visualify_workspaces.logo_url`.
 */
export function resolveWorkspaceLogoUrl(websiteUrl: string | null): string | null {
  if (websiteUrl == null) {
    return null;
  }

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

  if (!hostname) {
    return null;
  }

  return `${CLEARBIT_LOGO_BASE}/${hostname}`;
}
