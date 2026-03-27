import { NextResponse } from "next/server";
import {
  createVisualifyProjectInvitationAndInvite,
  InviteToProjectError,
} from "@/lib/auth/projectInviteByEmail";
import { requireUser } from "@/lib/auth/requireUser";
import { getProjectIfAccessible } from "@/lib/db/projectAccess";
import { getProjectMembersViewerContext } from "@/lib/db/projectMemberAccess";
import type { ProjectMemberRole } from "@/types/projectMembers";
import { firstRpcTableRow } from "@/lib/supabase/rpcTableFirstRow";
import { supabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ROLES: ProjectMemberRole[] = ["owner", "editor", "viewer"];

function isRole(v: unknown): v is ProjectMemberRole {
  return typeof v === "string" && (ROLES as string[]).includes(v);
}

function logProjectInviteDiagnostic(payload: {
  projectId: string;
  code: string;
  phase?: string;
}) {
  const line = {
    scope: "riskai:project-invite",
    ...payload,
    at: new Date().toISOString(),
  };
  if (process.env.NODE_ENV === "development") {
    console.warn(line);
  } else {
    console.error(line);
  }
}

function isAlreadyRegisteredMessage(lower: string): boolean {
  return (
    lower.includes("already registered") ||
    lower.includes("already been registered") ||
    lower.includes("user already registered")
  );
}

function isMissingServiceRoleMessage(raw: string): boolean {
  const lower = raw.toLowerCase();
  return (
    lower.includes("supabase_service_role_key") ||
    lower.includes("admin operations") ||
    lower.includes("missing required environment variable")
  );
}

/**
 * POST /api/projects/[projectId]/members/invite — Record a pending invitation (outbound email via webhook).
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
  if (!isRole(body.role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }
  const role = body.role;

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
    return NextResponse.json({ error: "RPC_ERROR", message: "Could not verify email." }, { status: 500 });
  }

  const match = firstRpcTableRow(found);
  const rpcUserIdRaw = match?.user_id ?? match?.id;
  const alreadyMember = match?.already_member === true;

  if (match && rpcUserIdRaw != null && alreadyMember) {
    return NextResponse.json(
      {
        error: "USER_ALREADY_EXISTS",
        message: "This user is already a member of the project.",
      },
      { status: 409 }
    );
  }

  try {
    await createVisualifyProjectInvitationAndInvite({
      projectId,
      email,
      firstName,
      surname,
      role,
      invitedByUserId: user.id,
    });
  } catch (e) {
    if (e instanceof InviteToProjectError) {
      logProjectInviteDiagnostic({
        projectId,
        code: e.code,
        phase: e.phase,
      });

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
    logProjectInviteDiagnostic({
      projectId,
      code: "UNEXPECTED",
    });

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

    const lower = raw.toLowerCase();
    if (isAlreadyRegisteredMessage(lower)) {
      return NextResponse.json(
        {
          error: "USER_ALREADY_EXISTS",
          message: "An account already exists for this email. Use Add member to add them.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "INVITE_FAILED", message: "Could not send the invitation. Try again or contact support." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, message: "Invitation sent." });
}
