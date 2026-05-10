import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { supabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PROFILE_DBG = "[hq-profile-save-debug]";

function cookieNamesOnly(cookieHeader: string | null): string[] {
  if (!cookieHeader?.trim()) return [];
  return cookieHeader
    .split(";")
    .map((part) => {
      const t = part.trim();
      const i = t.indexOf("=");
      return i === -1 ? t : t.slice(0, i).trim();
    })
    .filter(Boolean);
}

function logProfileSaveDiagnostics(
  phase: "before-require-user" | "after-require-user",
  request: Request,
  opts: {
    cookieNames: string[];
    requireUserResult?: "user" | "next-response";
    userId?: string;
    userEmail?: string;
  },
) {
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  const pathname = new URL(request.url).pathname;
  const hasSbCookie = opts.cookieNames.some((n) => n.startsWith("sb-"));

  /** Single-line JSON so Next dev / hosting log pipelines preserve fields (no secrets). */
  console.log(
    JSON.stringify({
      tag: PROFILE_DBG,
      phase,
      host,
      pathname,
      cookieNames: opts.cookieNames,
      hasSbCookie,
      ...(opts.requireUserResult !== undefined
        ? { requireUserResult: opts.requireUserResult }
        : {}),
      ...(opts.userId !== undefined ? { userId: opts.userId } : {}),
      ...(opts.userEmail !== undefined ? { userEmail: opts.userEmail } : {}),
    }),
  );
}

/** Upsert `public.visualify_profiles` for the signed-in user (HQ cookie session). */
export async function POST(request: Request) {
  const cookieNames = cookieNamesOnly(request.headers.get("cookie"));
  logProfileSaveDiagnostics("before-require-user", request, { cookieNames });

  const user = await requireUser();

  if (user instanceof NextResponse) {
    logProfileSaveDiagnostics("after-require-user", request, {
      cookieNames,
      requireUserResult: "next-response",
    });
    console.log(
      JSON.stringify({ tag: PROFILE_DBG, message: "profile-save-unauthorized-no-user" }),
    );
    return user;
  }

  logProfileSaveDiagnostics("after-require-user", request, {
    cookieNames,
    requireUserResult: "user",
    userId: user.id,
    userEmail: user.email ?? "",
  });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const first_name = typeof o.first_name === "string" ? o.first_name.trim() : "";
  const last_name = typeof o.last_name === "string" ? o.last_name.trim() : "";
  const company = typeof o.company === "string" ? o.company.trim() : "";
  const roleRaw = typeof o.role === "string" ? o.role.trim() : "";
  const role = roleRaw.length > 0 ? roleRaw : null;

  if (!first_name || !last_name || !company) {
    return NextResponse.json(
      { error: "First name, last name, and company are required." },
      { status: 400 },
    );
  }

  const supabase = await supabaseServerClient();
  const { error: upErr } = await supabase.from("visualify_profiles").upsert(
    {
      id: user.id,
      first_name,
      surname: last_name,
      email: user.email ?? null,
      company,
      role,
    },
    { onConflict: "id" },
  );

  if (upErr) {
    return NextResponse.json(
      { error: upErr.message, details: upErr.details, hint: upErr.hint, code: upErr.code },
      { status: 500 },
    );
  }

  const { error: metaErr } = await supabase.auth.updateUser({
    data: {
      onboarding_profile_complete: true,
      role,
    },
  });

  if (metaErr) {
    return NextResponse.json({ error: metaErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
