import "server-only";

import { hasProductAccess as hasProductAccessWithClient } from "@visualify/workspace-product-access";
import { supabaseServerClient } from "@/lib/supabase/server";

export async function hasProductAccess(userId: string, productKey: string): Promise<boolean> {
  const supabase = await supabaseServerClient();
  return hasProductAccessWithClient(supabase, userId, productKey);
}
