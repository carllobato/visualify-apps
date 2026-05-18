import { NextResponse } from "next/server";
import {
  getProjectAccessForUser,
  type ProjectRow,
} from "@/lib/db/projectAccess";
import type { ProjectPermissions } from "@/types/projectPermissions";
import { supabaseServerClient } from "@/lib/supabase/server";

export function parseProjectIdFromBody(body: unknown): string | null {
  if (body == null || typeof body !== "object") return null;
  const raw = (body as Record<string, unknown>).projectId;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function accessDeniedResponse(
  denied: AssertProjectAccessDenied
): NextResponse {
  if (denied.error === "unauthorized") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export function permissionDeniedResponse(message = "Permission denied"): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 });
}

export type AssertProjectAccessOk = {
  project: ProjectRow;
  permissions: ProjectPermissions;
  /** From the same `visualify_projects` row as access resolution; avoids a second project query in layout. */
  portfolioId: string | null;
};
export type AssertProjectAccessDenied =
  | { error: "unauthorized" }
  | { error: "forbidden" };
export type AssertProjectAccessResult =
  | AssertProjectAccessOk
  | AssertProjectAccessDenied;

/**
 * Server-only. Verifies the current user can read the project and returns capability flags
 * (table owner, project_members role, or inherited read as viewer via `can_read_project`).
 */
export async function assertProjectAccess(
  projectId: string
): Promise<AssertProjectAccessResult> {
  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "unauthorized" };
  }

  const bundle = await getProjectAccessForUser(projectId, user.id);
  if (!bundle) {
    return { error: "forbidden" };
  }

  return {
    project: bundle.project,
    permissions: bundle.permissions,
    portfolioId: bundle.portfolioId,
  };
}

/** When `projectId` is present in the body, require read access to that project. */
export async function assertOptionalProjectReadFromBody(
  body: unknown
): Promise<AssertProjectAccessOk | NextResponse | null> {
  const projectId = parseProjectIdFromBody(body);
  if (!projectId) return null;
  const access = await assertProjectAccess(projectId);
  if ("error" in access) return accessDeniedResponse(access);
  return access;
}

/** When `projectId` is present in the body, require canEditContent (risks, runs, AI extract). */
export async function assertOptionalProjectContentEditFromBody(
  body: unknown
): Promise<AssertProjectAccessOk | NextResponse | null> {
  const projectId = parseProjectIdFromBody(body);
  if (!projectId) return null;
  const access = await assertProjectAccess(projectId);
  if ("error" in access) return accessDeniedResponse(access);
  if (!access.permissions.canEditContent) {
    return permissionDeniedResponse();
  }
  return access;
}

/** When `projectId` is present in the body, require canEditProjectMetadata (settings sync). */
export async function assertOptionalProjectMetadataEditFromBody(
  body: unknown
): Promise<AssertProjectAccessOk | NextResponse | null> {
  const projectId = parseProjectIdFromBody(body);
  if (!projectId) return null;
  const access = await assertProjectAccess(projectId);
  if ("error" in access) return accessDeniedResponse(access);
  if (!access.permissions.canEditProjectMetadata) {
    return permissionDeniedResponse();
  }
  return access;
}
