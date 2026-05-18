import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import {
  authEmailMapFromRpcRows,
  isMemberAuthEmailsRpcMissing,
  memberAuthEmailLookup,
} from "@/lib/db/memberAuthEmailsMap";
import { getProjectIfAccessible } from "@/lib/db/projectAccess";
import {
  canAssignProjectInviteRole,
  isProjectMemberRole,
} from "@/lib/db/memberInviteRoles";
import { getProjectMembersViewerContext } from "@/lib/db/projectMemberAccess";
import type {
  ProjectMemberRole,
  ProfileDisplayRow,
  ProjectMemberWithProfileRow,
  ProjectWorkspaceRole,
} from "@/types/projectMembers";
import { coerceProfileFromUnknown } from "@/lib/profileDisplayCoerce";
import {
  normalizeWorkspaceRole,
  type WorkspaceRole,
} from "@visualify/workspace-product-access";
import { firstRpcTableRow } from "@/lib/supabase/rpcTableFirstRow";
import {
  createVisualifyProjectInvitationAndInvite,
  ensureVisualifyProfileForAuthUser,
  InviteToProjectError,
} from "@/lib/auth/projectInviteByEmail";
import { supabaseAdminClient } from "@/lib/supabase/admin";
import { supabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function splitInviteNameFromEmail(email: string): { firstName: string; surname: string } {
  const localPart = email.split("@")[0]?.trim() ?? "";
  const cleaned = localPart.replace(/[._+\-]+/g, " ").trim();
  const segments = cleaned.split(/\s+/).filter(Boolean);
  const toTitle = (v: string) => (v ? `${v[0].toUpperCase()}${v.slice(1).toLowerCase()}` : "");
  const first = toTitle(segments[0] ?? "");
  const rest = segments.slice(1).map(toTitle).join(" ").trim();
  return {
    firstName: first || "Invited",
    surname: rest || "User",
  };
}

function isMissingServiceRoleMessage(raw: string): boolean {
  const lower = raw.toLowerCase();
  return (
    lower.includes("supabase_service_role_key") ||
    lower.includes("admin operations") ||
    lower.includes("missing required environment variable")
  );
}

function isActiveWorkspaceMemberStatus(value: string | null | undefined): boolean {
  if (value == null || value === "") return true;
  return value.trim().toLowerCase() === "active";
}

function workspaceRoleLabel(role: WorkspaceRole): string {
  switch (role) {
    case "owner":
      return "Workspace owner";
    case "admin":
      return "Workspace admin";
    case "member":
      return "Workspace member";
    case "viewer":
      return "Workspace viewer";
    default:
      return "Workspace member";
  }
}

function syntheticWorkspaceMemberId(workspaceId: string, userId: string): string {
  return `workspace:${workspaceId}:${userId}`;
}

/**
 * Merges direct project_members (authoritative) with active workspace members.
 * Dedupes by user_id; direct rows always win over inherited workspace rows.
 */
async function loadMergedProjectMemberRows(
  supabase: Awaited<ReturnType<typeof supabaseServerClient>>,
  projectId: string,
  directRawRows: Record<string, unknown>[],
): Promise<ProjectMemberWithProfileRow[]> {
  // Direct rows are authoritative for role, id, and edit/remove targets.
  const shaped: ProjectMemberWithProfileRow[] = directRawRows.map((raw) => ({
    id: raw.id as string,
    project_id: raw.project_id as string,
    user_id: raw.user_id as string,
    role: raw.role as ProjectMemberRole,
    created_at: raw.created_at as string,
    updated_at: raw.updated_at as string,
    profiles: null,
    email: null,
    resolvedProfile: null,
    membershipSource: "direct",
    isProjectMemberEditable: true,
  }));

  const directUserIds = new Set(shaped.map((r) => r.user_id));

  const { data: project, error: projectErr } = await supabase
    .from("visualify_projects")
    .select("workspace_id, portfolio_id")
    .eq("id", projectId)
    .maybeSingle();

  if (projectErr) {
    console.error("[project-members] GET project workspace scope:", projectErr.message);
    return shaped;
  }

  let workspaceId =
    typeof project?.workspace_id === "string" && project.workspace_id.trim().length > 0
      ? project.workspace_id.trim()
      : null;

  if (!workspaceId) {
    const portfolioId =
      typeof project?.portfolio_id === "string" && project.portfolio_id.trim().length > 0
        ? project.portfolio_id.trim()
        : null;
    if (portfolioId) {
      const { data: portfolio, error: portfolioErr } = await supabase
        .from("visualify_portfolios")
        .select("workspace_id")
        .eq("id", portfolioId)
        .maybeSingle();
      if (portfolioErr) {
        console.error("[project-members] GET portfolio workspace_id:", portfolioErr.message);
        return shaped;
      }
      workspaceId =
        typeof portfolio?.workspace_id === "string" && portfolio.workspace_id.trim().length > 0
          ? portfolio.workspace_id.trim()
          : null;
    }
  }

  if (!workspaceId) {
    return shaped;
  }

  const { data: workspaceRows, error: workspaceErr } = await supabase
    .from("visualify_workspace_members")
    .select("user_id, role, status, created_at")
    .eq("workspace_id", workspaceId);

  if (workspaceErr) {
    console.error("[project-members] GET workspace members:", workspaceErr.message);
    return shaped;
  }

  for (const row of workspaceRows ?? []) {
    const userId = typeof row.user_id === "string" ? row.user_id.trim() : "";
    if (!userId || directUserIds.has(userId)) {
      continue;
    }
    if (!isActiveWorkspaceMemberStatus(row.status as string | null | undefined)) {
      continue;
    }

    const workspaceRole = normalizeWorkspaceRole(row.role as string | null | undefined);
    if (!workspaceRole) {
      continue;
    }

    const createdAt =
      typeof row.created_at === "string" && row.created_at.trim().length > 0
        ? row.created_at
        : "";

    // Inherited workspace rows are read-only in the members UI (no project_members id).
    shaped.push({
      id: syntheticWorkspaceMemberId(workspaceId, userId),
      project_id: projectId,
      user_id: userId,
      role: workspaceRole as ProjectMemberRole,
      created_at: createdAt,
      updated_at: createdAt,
      profiles: null,
      email: null,
      resolvedProfile: null,
      membershipSource: "workspace",
      workspaceRole: workspaceRole as ProjectWorkspaceRole,
      roleLabel: workspaceRoleLabel(workspaceRole),
      isProjectMemberEditable: false,
    });
  }

  return shaped;
}

/**
 * GET /api/projects/[projectId]/members — Member rows + profiles map (direct + inherited workspace).
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const { projectId } = await context.params;
  if (!projectId) {
    return NextResponse.json({ error: "Project ID required" }, { status: 400 });
  }

  const project = await getProjectIfAccessible(projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const supabase = await supabaseServerClient();
  const viewer = await getProjectMembersViewerContext(supabase, projectId, user.id);
  if (!viewer) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Load members without embedding profiles: PostgREST only exposes embeds for FKs present
  // in the live DB schema cache (e.g. user_id → visualify_profiles). If user_id still references
  // auth.users, embed fails; batch-fetch profile rows below instead.
  const { data: members, error: mErr } = await supabase
    .from("visualify_project_members")
    .select("id, project_id, user_id, role, created_at, updated_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (mErr) {
    return NextResponse.json({ error: mErr.message }, { status: 500 });
  }

  const rawRows = (members ?? []) as Record<string, unknown>[];

  let shaped = await loadMergedProjectMemberRows(supabase, projectId, rawRows);

  const memberUserIds = [...new Set(shaped.map((r) => r.user_id))];
  const profilesMap: Record<string, ProfileDisplayRow> = {};

  if (memberUserIds.length > 0) {
    const { data: profileRows, error: profilesErr } = await supabase
      .from("visualify_profiles")
      .select("id, email, first_name, surname, company")
      .in("id", memberUserIds);

    if (profilesErr) {
      return NextResponse.json({ error: profilesErr.message }, { status: 500 });
    }

    for (const row of profileRows ?? []) {
      const p = coerceProfileFromUnknown(row);
      if (!p?.id) continue;
      profilesMap[p.id] = p;
      if (typeof row === "object" && row !== null && "id" in row) {
        const raw = (row as { id: unknown }).id;
        const rawStr = raw == null ? "" : String(raw);
        if (rawStr && rawStr !== p.id) profilesMap[rawStr] = p;
      }
    }
  }

  let authEmails: Record<string, string> = {};
  if (memberUserIds.length > 0) {
    const { data: authRows, error: authErr } = await supabase.rpc(
      "riskai_project_member_auth_emails",
      { p_project_id: projectId, p_user_ids: memberUserIds }
    );
    if (authErr) {
      if (isMemberAuthEmailsRpcMissing(authErr)) {
        authEmails = {};
      } else {
        return NextResponse.json({ error: authErr.message }, { status: 500 });
      }
    } else {
      authEmails = authEmailMapFromRpcRows(authRows);
    }
  }

  shaped = shaped.map((r) => {
    const canonical = profilesMap[r.user_id] ?? null;
    const profileEmail = canonical?.email?.trim();
    return {
      ...r,
      profiles: canonical,
      resolvedProfile: canonical,
      email: profileEmail || memberAuthEmailLookup(authEmails, r.user_id) || r.email || null,
    };
  });

  const profiles: Record<string, ProfileDisplayRow> = {};
  for (const r of shaped) {
    const p = r.profiles;
    if (p && !Array.isArray(p) && p.id) {
      profiles[r.user_id] = p;
    }
  }

  return NextResponse.json({
    members: shaped,
    profiles,
    viewer,
    roleSemantics: {
      owner: "Full access",
      editor: "Can view settings, edit project details, invite members",
      viewer: "View only",
    },
  });
}

/**
 * POST /api/projects/[projectId]/members — Invite by email (pending invitation; accept adds membership).
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const { projectId } = await context.params;
  if (!projectId) {
    return NextResponse.json({ error: "Project ID required" }, { status: 400 });
  }

  const supabase = await supabaseServerClient();
  const viewer = await getProjectMembersViewerContext(supabase, projectId, user.id);
  if (!viewer) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  if (!viewer.canInviteMembers) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  const project = await getProjectIfAccessible(projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  let body: { email?: unknown; role?: unknown; first_name?: unknown; surname?: unknown };
  try {
    body = (await request.json()) as {
      email?: unknown;
      role?: unknown;
      first_name?: unknown;
      surname?: unknown;
    };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }
  const firstName = typeof body.first_name === "string" ? body.first_name.trim() : "";
  const surname = typeof body.surname === "string" ? body.surname.trim() : "";
  if (!firstName || !surname) {
    return NextResponse.json({ error: "First name and surname are required" }, { status: 400 });
  }
  if (!isProjectMemberRole(body.role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }
  const role = body.role;
  if (!canAssignProjectInviteRole(viewer.memberRole, role)) {
    return NextResponse.json(
      { error: "PERMISSION_DENIED", message: "You cannot assign that role." },
      { status: 403 }
    );
  }

  const { data: found, error: rpcErr } = await supabase.rpc(
    "riskai_find_profile_by_email_for_project",
    { p_email: email, p_project_id: projectId }
  );

  if (rpcErr) {
    const msg = rpcErr.message?.toLowerCase() ?? "";
    if (msg.includes("permission") || msg.includes("policy") || msg.includes("denied")) {
      return NextResponse.json(
        { error: "PERMISSION_DENIED", message: "Permission denied" },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: rpcErr.message }, { status: 500 });
  }

  const match = firstRpcTableRow(found);
  const rpcUserIdRaw = match?.user_id ?? match?.id;

  if (match && rpcUserIdRaw != null && match.already_member === true) {
    return NextResponse.json({ ok: true, already_member: true }, { status: 200 });
  }

  if (match && rpcUserIdRaw != null) {
    const existingAuthUserId =
      typeof rpcUserIdRaw === "string" ? rpcUserIdRaw : String(rpcUserIdRaw);
    try {
      const admin = supabaseAdminClient();
      await ensureVisualifyProfileForAuthUser(admin, {
        userId: existingAuthUserId,
        email,
      });
    } catch {
      // Best-effort: invitation row + email must still succeed; accept flow also ensures a profile.
    }
  }

  const derivedName = splitInviteNameFromEmail(email);

  try {
    await createVisualifyProjectInvitationAndInvite({
      projectId,
      email,
      firstName: derivedName.firstName,
      surname: derivedName.surname,
      role,
      invitedByUserId: user.id,
    });
  } catch (e) {
    if (e instanceof InviteToProjectError) {
      if (e.code === "SERVICE_ROLE_UNAVAILABLE") {
        return NextResponse.json(
          {
            error: "INVITE_NOT_CONFIGURED",
            message:
              "Sending invitations is not configured. Add SUPABASE_SERVICE_ROLE_KEY to the server environment.",
          },
          { status: 503 }
        );
      }
      if (e.code === "INVITATION_DB_FAILED") {
        return NextResponse.json(
          {
            error: "INVITATION_DB_FAILED",
            message: "Could not save the invitation. Try again or contact support.",
          },
          { status: 500 }
        );
      }
      return NextResponse.json(
        {
          error: "INVITE_FAILED",
          message: "Could not send the invitation. Try again or contact support.",
        },
        { status: 500 }
      );
    }

    const raw = e instanceof Error ? e.message : String(e);
    if (isMissingServiceRoleMessage(raw)) {
      return NextResponse.json(
        {
          error: "INVITE_NOT_CONFIGURED",
          message:
            "Sending invitations is not configured. Add SUPABASE_SERVICE_ROLE_KEY to the server environment.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      {
        error: "INVITE_FAILED",
        message: "Could not send the invitation. Try again or contact support.",
      },
      { status: 500 }
    );
  }

  if (!match || rpcUserIdRaw == null) {
    return NextResponse.json(
      {
        ok: true,
        invitation_sent: true,
        message: "Invitation sent. They will be added to the project after signup.",
      },
      { status: 200 }
    );
  }

  return NextResponse.json({ ok: true, invitation_sent: true }, { status: 200 });
}
