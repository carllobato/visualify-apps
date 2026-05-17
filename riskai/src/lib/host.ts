import {
  getProductOrigin,
  readPublicEnv,
  VISUALIFY_PRODUCTS,
  type VisualifyProductKey,
} from "@visualify/urls";
import { hasLegacyRiskAiPrefix, isAuthenticatedAppPath } from "@/lib/routes";

function defaultProductHost(productKey: VisualifyProductKey): string {
  return new URL(VISUALIFY_PRODUCTS[productKey].defaultOrigin).hostname;
}

/** App subdomain (e.g. app.visualify.com.au). */
export const APP_HOST = readPublicEnv("NEXT_PUBLIC_APP_HOST") ?? defaultProductHost("riskai");
/** Marketing site apex (e.g. visualify.com.au). */
export const WEBSITE_HOST = readPublicEnv("NEXT_PUBLIC_WEBSITE_HOST") ?? defaultProductHost("website");

export const APP_ORIGIN = readPublicEnv("NEXT_PUBLIC_APP_ORIGIN") ?? getProductOrigin("riskai");
export const SITE_ORIGIN = readPublicEnv("NEXT_PUBLIC_WEBSITE_ORIGIN") ?? getProductOrigin("website");

export function normalizeHost(host: string): string {
  return host.split(":")[0]?.toLowerCase() ?? "";
}

/** True for local development hosts (treated like the app host). */
export function isLocalhost(host: string): boolean {
  const h = normalizeHost(host);
  return h === "localhost" || h === "127.0.0.1" || h === "::1";
}

export function isAppHost(host: string): boolean {
  const h = normalizeHost(host);
  if (isLocalhost(h)) return true;
  const app = normalizeHost(APP_HOST);
  return h === app;
}

export function isWebsiteHost(host: string): boolean {
  const h = normalizeHost(host);
  if (isLocalhost(h)) return false;
  const site = normalizeHost(WEBSITE_HOST);
  return h === site || h === `www.${site}`;
}

/** Paths that only exist on the app host; website visitors are sent to the app origin. */
export function isAppAreaPath(pathname: string): boolean {
  if (isAuthenticatedAppPath(pathname)) return true;
  if (hasLegacyRiskAiPrefix(pathname)) return true;
  return false;
}

/** Login entry path for a request host (app host uses `/`; website uses `/login`). */
export function getLoginPathForHost(host: string): "/" | "/login" {
  return isAppHost(host) ? "/" : "/login";
}
