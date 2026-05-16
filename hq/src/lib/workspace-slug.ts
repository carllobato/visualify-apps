import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_SLUG_LENGTH = 64;
const MAX_UNIQUE_ATTEMPTS = 32;

/**
 * Derive a kebab-case slug from a workspace display name (lowercase, alphanumeric segments).
 */
export function slugifyWorkspaceName(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH);

  return base.length > 0 ? base : "workspace";
}

function isPostgresUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "23505"
  );
}

async function slugExists(admin: SupabaseClient, slug: string): Promise<boolean> {
  const { data, error } = await admin
    .from("visualify_workspaces")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("slugExists:", error.message);
    throw error;
  }

  return Boolean(data?.id);
}

/**
 * Pick a unique `visualify_workspaces.slug` for the given name (base slug, then `-2`, `-3`, …).
 */
export async function allocateUniqueWorkspaceSlug(
  admin: SupabaseClient,
  workspaceName: string,
): Promise<string> {
  const base = slugifyWorkspaceName(workspaceName);

  for (let attempt = 0; attempt < MAX_UNIQUE_ATTEMPTS; attempt++) {
    const candidate =
      attempt === 0 ? base : `${base}-${attempt + 1}`.slice(0, MAX_SLUG_LENGTH);

    if (!(await slugExists(admin, candidate))) {
      return candidate;
    }
  }

  const fallback = `${base}-${Date.now().toString(36)}`.slice(0, MAX_SLUG_LENGTH);
  if (!(await slugExists(admin, fallback))) {
    return fallback;
  }

  throw new Error("Could not allocate a unique workspace slug");
}

export { isPostgresUniqueViolation };
