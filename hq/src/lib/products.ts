import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/** `visualify_products.key` for Report workspace entitlements. */
export const REPORT_PRODUCT_KEY = "report";

let cachedReportProductId: string | null = null;
let reportProductIdPromise: Promise<string> | null = null;

/**
 * Resolves the Report catalog row in `public.visualify_products` (key = `report`).
 * Cached per Node process; concurrent callers share one in-flight query.
 */
export async function getReportProductId(supabase: SupabaseClient): Promise<string> {
  if (cachedReportProductId) {
    return cachedReportProductId;
  }
  if (reportProductIdPromise) {
    return reportProductIdPromise;
  }

  reportProductIdPromise = (async () => {
    const { data, error } = await supabase
      .from("visualify_products")
      .select("id")
      .eq("key", REPORT_PRODUCT_KEY)
      .single();

    if (error || !data?.id) {
      reportProductIdPromise = null;
      throw new Error(`Report product not found (key=${REPORT_PRODUCT_KEY})`);
    }

    cachedReportProductId = data.id;
    return data.id;
  })();

  return reportProductIdPromise;
}
