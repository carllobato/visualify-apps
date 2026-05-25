/** Known Visualify surfaces with a public origin. */
export const VISUALIFY_PRODUCT_KEYS = ["website", "hq", "riskai", "os"] as const;

export type VisualifyProductKey = (typeof VISUALIFY_PRODUCT_KEYS)[number];

/** `NEXT_PUBLIC_*` origin override for a product (full origin, no trailing slash). */
export type VisualifyProductOriginEnvVar =
  | "NEXT_PUBLIC_WEBSITE_ORIGIN"
  | "NEXT_PUBLIC_HQ_ORIGIN"
  | "NEXT_PUBLIC_RISKAI_ORIGIN"
  | "NEXT_PUBLIC_OS_ORIGIN";

export type VisualifyProductDefinition = {
  readonly key: VisualifyProductKey;
  /** Production default origin (scheme + host, no trailing slash). */
  readonly defaultOrigin: string;
  /** Primary signed-in entry path relative to the product origin. */
  readonly dashboardPath: string;
  readonly originEnvVar: VisualifyProductOriginEnvVar;
};

/** HQ app launcher path (relative to {@link getProductOrigin} for `hq`). */
export const HQ_APPS_PATH = "/apps";

/**
 * Platform product registry — single source of truth for default origins and dashboard paths.
 * Env overrides are applied in {@link resolveOriginFromProduct} / {@link getProductOrigin}.
 */
export const VISUALIFY_PRODUCTS: Readonly<Record<VisualifyProductKey, VisualifyProductDefinition>> = {
  website: {
    key: "website",
    defaultOrigin: "https://visualify.com.au",
    dashboardPath: "/",
    originEnvVar: "NEXT_PUBLIC_WEBSITE_ORIGIN",
  },
  hq: {
    key: "hq",
    defaultOrigin: "https://hq.visualify.com.au",
    dashboardPath: HQ_APPS_PATH,
    originEnvVar: "NEXT_PUBLIC_HQ_ORIGIN",
  },
  riskai: {
    key: "riskai",
    defaultOrigin: "https://riskai.visualify.com.au",
    dashboardPath: "/dashboard",
    originEnvVar: "NEXT_PUBLIC_RISKAI_ORIGIN",
  },
  os: {
    key: "os",
    defaultOrigin: "https://os.visualify.com.au",
    dashboardPath: "/today",
    originEnvVar: "NEXT_PUBLIC_OS_ORIGIN",
  },
};

export function getProductDefinition(productKey: VisualifyProductKey): VisualifyProductDefinition {
  return VISUALIFY_PRODUCTS[productKey];
}

export function isVisualifyProductKey(value: string): value is VisualifyProductKey {
  return (VISUALIFY_PRODUCT_KEYS as readonly string[]).includes(value);
}
