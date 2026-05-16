import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { createWorkspaceForOwner } from "@/lib/create-workspace";
import { writeVisualifyActiveWorkspaceIdCookie } from "@/lib/workspace-settings-data";
import { parseOptionalWorkspaceWebsiteUrl } from "@/lib/workspace-website-url";
import { isWorkspaceCreateType } from "@/types/workspace-create";

export const dynamic = "force-dynamic";

/**
 * POST /api/workspaces — Create a workspace and owner membership for the signed-in user.
 * Sets `visualify_active_workspace_id` on success. No client-side table writes.
 */
export async function POST(request: Request) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const name = typeof o.name === "string" ? o.name.trim() : "";
  const workspaceTypeRaw = typeof o.workspace_type === "string" ? o.workspace_type.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "Workspace name is required" }, { status: 400 });
  }
  if (!isWorkspaceCreateType(workspaceTypeRaw)) {
    return NextResponse.json({ error: "Invalid workspace type" }, { status: 400 });
  }

  let websiteUrl: string | null = null;
  if (o.website_url !== undefined && o.website_url !== null) {
    if (typeof o.website_url !== "string") {
      return NextResponse.json({ error: "Invalid website URL" }, { status: 400 });
    }
    const websiteParsed = parseOptionalWorkspaceWebsiteUrl(o.website_url);
    if (!websiteParsed.ok) {
      return NextResponse.json({ error: "Invalid website URL" }, { status: 400 });
    }
    websiteUrl = websiteParsed.url;
  }

  const result = await createWorkspaceForOwner({
    ownerUserId: user.id,
    name,
    workspaceType: workspaceTypeRaw,
    websiteUrl,
  });

  if (!result.ok) {
    if (result.code === "SERVICE_ROLE_UNAVAILABLE") {
      return NextResponse.json(
        {
          error: "WORKSPACE_CREATE_NOT_CONFIGURED",
          message: "Workspace creation is not configured on the server (missing service role).",
        },
        { status: 503 },
      );
    }
    if (result.code === "INVALID_INPUT") {
      return NextResponse.json(
        { error: "Invalid workspace name or website URL" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Could not create workspace" }, { status: 500 });
  }

  await writeVisualifyActiveWorkspaceIdCookie(result.workspaceId);

  return NextResponse.json({ ok: true, workspace_id: result.workspaceId });
}
