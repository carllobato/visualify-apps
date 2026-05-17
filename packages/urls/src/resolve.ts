import { readPublicEnv, resolveOriginFromProduct } from "./env";
import {
  getProductDefinition,
  HQ_APPS_PATH,
  type VisualifyProductKey,
} from "./products";

/** Strip trailing slashes from an origin or URL base. */
export function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, "");
}

/** Extract hostname from an origin URL. Returns `undefined` when the value is not a valid URL. */
export function hostFromOrigin(origin: string): string | undefined {
  const trimmed = origin.trim();
  if (!trimmed) {
    return undefined;
  }
  try {
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const hostname = new URL(withScheme).hostname;
    return hostname || undefined;
  } catch {
    return undefined;
  }
}

/**
 * RiskAI app origin for shared platform code.
 * Canonical: `NEXT_PUBLIC_RISKAI_ORIGIN`. Legacy: `NEXT_PUBLIC_APP_ORIGIN`.
 */
export function resolveRiskAiPublicOrigin(): string {
  return normalizeOrigin(
    readPublicEnv("NEXT_PUBLIC_RISKAI_ORIGIN") ??
      readPublicEnv("NEXT_PUBLIC_APP_ORIGIN") ??
      getProductOrigin("riskai"),
  );
}

/**
 * RiskAI app origin for marketing / website CTAs.
 * Canonical: `NEXT_PUBLIC_RISKAI_ORIGIN`. Legacy: `NEXT_PUBLIC_RISKAI_APP_ORIGIN`.
 */
export function resolveRiskAiMarketingOrigin(): string {
  return normalizeOrigin(
    readPublicEnv("NEXT_PUBLIC_RISKAI_ORIGIN") ??
      readPublicEnv("NEXT_PUBLIC_RISKAI_APP_ORIGIN") ??
      getProductOrigin("riskai"),
  );
}

/** Join a normalized origin with a path segment (path must start with `/` unless empty). */
export function joinOriginPath(origin: string, path: string): string {
  const base = normalizeOrigin(origin);
  const trimmedPath = path.trim();
  if (!trimmedPath || trimmedPath === "/") {
    return base;
  }
  const segment = trimmedPath.startsWith("/") ? trimmedPath : `/${trimmedPath}`;
  return `${base}${segment}`;
}

/**
 * Public origin for a Visualify product (no trailing slash).
 *
 * @example getProductOrigin("riskai") // https://riskai.visualify.com.au
 */
export function getProductOrigin(productKey: VisualifyProductKey): string {
  const product = getProductDefinition(productKey);
  return normalizeOrigin(resolveOriginFromProduct(product));
}

/**
 * Canonical dashboard / launcher URL for a product (origin + {@link VisualifyProductDefinition.dashboardPath}).
 *
 * @example getProductDashboardUrl("riskai") // https://riskai.visualify.com.au/dashboard
 */
export function getProductDashboardUrl(productKey: VisualifyProductKey): string {
  const product = getProductDefinition(productKey);
  return joinOriginPath(getProductOrigin(productKey), product.dashboardPath);
}

/**
 * HQ apps launcher URL (`{hq origin}/apps`).
 * Matches historical `NEXT_PUBLIC_HQ_APPS_URL` default: `https://hq.visualify.com.au/apps`.
 */
export function getHqAppsUrl(): string {
  return joinOriginPath(getProductOrigin("hq"), HQ_APPS_PATH);
}
