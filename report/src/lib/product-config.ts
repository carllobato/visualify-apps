import "server-only";

import { getHqAppsUrl, readPublicEnv } from "@visualify/urls";

/**
 * Visualify Report product identity.
 *
 * - `NEXT_PUBLIC_VISUALIFY_PRODUCT_KEY` must match `visualify_products.key` in Supabase when set.
 * - `NEXT_PUBLIC_HQ_APPS_URL` is where users without entitlement are sent (HQ apps launcher).
 */
const DEFAULT_PRODUCT_KEY = "report";

export const productConfig = {
  /** Same as `visualify_products.key` for workspace entitlement checks. */
  get PRODUCT_KEY(): string {
    const value = process.env.NEXT_PUBLIC_VISUALIFY_PRODUCT_KEY?.trim();
    return value || DEFAULT_PRODUCT_KEY;
  },
  /** HQ (or equivalent) apps URL when the signed-in user has no subscription for this product. */
  get HQ_APPS_URL(): string {
    return readPublicEnv("NEXT_PUBLIC_HQ_APPS_URL") ?? getHqAppsUrl();
  },
};
