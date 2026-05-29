import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { productConfig } from "@/lib/product-config";

let cachedControlAIProductId: string | null = null;
let controlAIProductIdPromise: Promise<string> | null = null;

/**
 * Resolves the ControlAI catalog row in `public.visualify_products` (key = `controlai`).
 * Cached per Node process; concurrent callers share one in-flight query.
 */
export async function getControlAIProductId(supabase: SupabaseClient): Promise<string> {
  if (cachedControlAIProductId) {
    return cachedControlAIProductId;
  }
  if (controlAIProductIdPromise) {
    return controlAIProductIdPromise;
  }

  const productKey = productConfig.PRODUCT_KEY;

  controlAIProductIdPromise = (async () => {
    const { data, error } = await supabase
      .from("visualify_products")
      .select("id")
      .eq("key", productKey)
      .single();

    if (error || !data) {
      controlAIProductIdPromise = null;
      throw new Error("ControlAI product not found");
    }

    const id = data.id;
    cachedControlAIProductId = id;
    return id;
  })();

  return controlAIProductIdPromise;
}
