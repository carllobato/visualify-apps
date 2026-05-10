import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/** Row slice from `public.visualify_profiles` (id = auth user id). */
export type VisualifyProfileRow = {
  first_name: string | null;
  surname: string | null;
  company: string | null;
  role: string | null;
};

function nonEmpty(s: string | null | undefined): string | null {
  if (s == null) return null;
  const t = s.trim();
  return t || null;
}

export async function fetchVisualifyProfileRow(
  supabase: SupabaseClient,
  userId: string,
): Promise<VisualifyProfileRow | null> {
  const { data, error } = await supabase
    .from("visualify_profiles")
    .select("first_name,surname,company,role")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return data as VisualifyProfileRow;
}

/**
 * Prefer `public.visualify_profiles`; fill gaps from auth `user_metadata` (legacy).
 */
export function displayProfileFieldsFromSources(
  profileRow: VisualifyProfileRow | null,
  meta: Record<string, unknown> | undefined,
): {
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  role: string | null;
} {
  const m = meta ?? {};
  const metaFirst = typeof m.first_name === "string" ? m.first_name.trim() || null : null;
  const metaLast = typeof m.last_name === "string" ? m.last_name.trim() || null : null;
  const metaCompany = typeof m.company === "string" ? m.company.trim() || null : null;
  const metaRole = typeof m.role === "string" ? m.role.trim() || null : null;

  return {
    firstName: nonEmpty(profileRow?.first_name) ?? metaFirst,
    lastName: nonEmpty(profileRow?.surname) ?? metaLast,
    company: nonEmpty(profileRow?.company) ?? metaCompany,
    role: nonEmpty(profileRow?.role) ?? metaRole,
  };
}
