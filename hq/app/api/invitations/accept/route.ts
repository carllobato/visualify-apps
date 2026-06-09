import { NextResponse } from "next/server";
import {
  acceptWorkspaceInvitation,
  isValidInviteToken,
} from "@/lib/auth/acceptWorkspaceInvitation";
import { requireUser } from "@/lib/auth/requireUser";
import { writeVisualifyActiveWorkspaceIdCookie } from "@/lib/workspace-settings-data";

export const dynamic = "force-dynamic";

async function readInviteToken(request: Request): Promise<string | null> {
  const url = new URL(request.url);
  const fromQuery = url.searchParams.get("invite_token");
  if (fromQuery?.trim()) return fromQuery.trim();

  if (request.method === "POST") {
    try {
      const body = (await request.json()) as { invite_token?: unknown };
      const t = typeof body.invite_token === "string" ? body.invite_token.trim() : "";
      if (t) return t;
    } catch {
      return null;
    }
  }

  return null;
}

function resultToResponse(result: Awaited<ReturnType<typeof acceptWorkspaceInvitation>>) {
  if (result.ok) {
    return NextResponse.json({
      ok: true,
      resource_type: "workspace",
      workspace_id: result.workspace_id,
    });
  }

  const body: { error: string; message?: string; code?: string } = {
    error: result.code,
  };
  if (result.message) body.message = result.message;
  if (result.code === "SERVICE_ROLE_MISSING") body.code = "SERVICE_ROLE_MISSING";

  return NextResponse.json(body, { status: result.httpStatus });
}

async function handleAccept(request: Request) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const rawToken = await readInviteToken(request);
  if (!rawToken) {
    return NextResponse.json({ error: "invite_token is required" }, { status: 400 });
  }
  if (!isValidInviteToken(rawToken)) {
    return NextResponse.json({ error: "INVALID_INVITATION" }, { status: 400 });
  }

  const result = await acceptWorkspaceInvitation({
    inviteToken: rawToken,
    user: { id: user.id, email: user.email },
  });

  if (result.ok) {
    await writeVisualifyActiveWorkspaceIdCookie(result.workspace_id);
  }

  return resultToResponse(result);
}

/**
 * GET /api/invitations/accept?invite_token=… — Accept a pending workspace invitation (session cookie).
 */
export async function GET(request: Request) {
  return handleAccept(request);
}

/**
 * POST /api/invitations/accept — Body: `{ "invite_token": "…" }` (query param also supported).
 */
export async function POST(request: Request) {
  return handleAccept(request);
}
