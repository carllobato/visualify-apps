import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

function isValidEmail(email: string): boolean {
  if (email.length > 320) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

type Body = {
  firstName?: unknown;
  lastName?: unknown;
  email?: unknown;
  jobTitle?: unknown;
  company?: unknown;
  source?: unknown;
};

function isDuplicateKeyError(error: {
  code?: string;
  message?: string;
  details?: string;
}): boolean {
  const combined = `${error.code ?? ""} ${error.message ?? ""} ${error.details ?? ""}`;
  if (error.code === "23505" || combined.includes("23505")) return true;
  return /duplicate key|unique constraint/i.test(combined);
}

function insertErrorUserMessage(error: {
  message?: string;
  details?: string;
  hint?: string;
}): string {
  if (process.env.NODE_ENV !== "development") {
    return "Something went wrong. Please try again in a moment.";
  }
  const msg = [error.message, error.details, error.hint].filter(Boolean).join(" — ");
  if (/relation|does not exist|schema cache/i.test(msg)) {
    return "Database table missing: run the migration in Supabase (supabase/migrations/…visualify_signup.sql) and confirm the table `visualify_signup` exists.";
  }
  if (/invalid api key|jwt|permission denied|not authorized/i.test(msg)) {
    return "Supabase rejected the request: check `SUPABASE_SERVICE_ROLE_KEY` is the service_role secret (not anon) and matches this project.";
  }
  return `Database error (dev): ${msg.slice(0, 500)}`;
}

/** Set to false or remove block before production if you prefer no dev logs. */
const DEBUG_EARLY_ACCESS = process.env.NODE_ENV === "development";

function emailDomainHint(addr: string): string {
  const i = addr.indexOf("@");
  if (i <= 0 || i === addr.length - 1) return "(no-domain)";
  return `***@${addr.slice(i + 1)}`;
}

/** True when .env still has the example hostname (DNS will fail with ENOTFOUND). */
function isPlaceholderSupabaseUrl(url: string): boolean {
  const u = url.toLowerCase();
  return u.includes("your_project_ref") || u.includes("your-project-ref") || u.includes("xxxxxx.supabase.co");
}

function placeholderUrlMessage(): string {
  return process.env.NODE_ENV === "development"
    ? "NEXT_PUBLIC_SUPABASE_URL is still a placeholder. In Supabase open Project Settings → API and copy Project URL (https://<id>.supabase.co). Paste it into .env.local, save, and restart `npm run dev`."
    : "Signup is temporarily unavailable.";
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request body." }, { status: 400 });
  }

  const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
  const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
  const emailRaw = typeof body.email === "string" ? body.email.trim() : "";
  const jobTitle =
    typeof body.jobTitle === "string" && body.jobTitle.trim() ? body.jobTitle.trim() : null;
  const company =
    typeof body.company === "string" && body.company.trim() ? body.company.trim() : null;
  const source =
    typeof body.source === "string" && body.source.trim() ? body.source.trim() : "website";

  if (DEBUG_EARLY_ACCESS) {
    console.log("[early-access][debug] request", {
      firstNameLen: firstName.length,
      lastNameLen: lastName.length,
      emailHint: typeof body.email === "string" ? emailDomainHint(body.email.trim().toLowerCase()) : "(missing)",
      jobTitleSet: jobTitle !== null,
      companySet: company !== null,
      source,
    });
  }

  if (!firstName || !lastName) {
    return NextResponse.json(
      { ok: false, message: "Please enter your first and last name." },
      { status: 400 },
    );
  }

  if (!emailRaw) {
    return NextResponse.json({ ok: false, message: "Please enter your email address." }, { status: 400 });
  }

  const email = emailRaw.toLowerCase();
  if (!isValidEmail(email)) {
    return NextResponse.json({ ok: false, message: "Please enter a valid email address." }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceRoleKey) {
    if (DEBUG_EARLY_ACCESS) {
      console.log("[early-access][debug] env", {
        hasNextPublicSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()),
        hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
      });
    }
    console.error("[early-access] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    const message =
      process.env.NODE_ENV === "development"
        ? "Supabase is not configured. Copy .env.example to .env.local and set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (Project Settings → API in the Supabase dashboard)."
        : "Signup is temporarily unavailable.";
    return NextResponse.json({ ok: false, message }, { status: 503 });
  }

  if (isPlaceholderSupabaseUrl(supabaseUrl)) {
    console.error("[early-access] NEXT_PUBLIC_SUPABASE_URL looks like a template, not a real Project URL");
    return NextResponse.json({ ok: false, message: placeholderUrlMessage() }, { status: 503 });
  }

  try {
    if (DEBUG_EARLY_ACCESS) {
      console.log("[early-access][debug] env", {
        hasNextPublicSupabaseUrl: true,
        hasServiceRoleKey: true,
      });
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("visualify_signup").insert({
      first_name: firstName,
      last_name: lastName,
      email,
      job_title: jobTitle,
      company,
      source,
    });

    if (DEBUG_EARLY_ACCESS) {
      console.log("[early-access][debug] insert", {
        ok: !error,
        errorCode: error?.code ?? null,
        errorMessage: error?.message ? String(error.message).slice(0, 200) : null,
      });
    }

    if (error) {
      if (isDuplicateKeyError(error)) {
        return NextResponse.json({
          ok: true,
          message: "You’re already on the list.",
          alreadyRegistered: true,
        });
      }
      console.error("[early-access] insert failed", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      return NextResponse.json(
        { ok: false, message: insertErrorUserMessage(error) },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: "You’re on the list — we’ll be in touch.",
      alreadyRegistered: false,
    });
  } catch (err) {
    console.error("[early-access]", err);
    if (process.env.NODE_ENV === "development" && err instanceof Error) {
      const m = err.message + (err.cause instanceof Error ? ` ${err.cause.message}` : "");
      if (/ENOTFOUND|getaddrinfo/i.test(m)) {
        return NextResponse.json(
          {
            ok: false,
            message:
              "Cannot reach Supabase (bad hostname). In .env.local set NEXT_PUBLIC_SUPABASE_URL to the Project URL from Supabase → Project Settings → API (looks like https://abcdefgh.supabase.co), then restart the dev server.",
          },
          { status: 503 },
        );
      }
      return NextResponse.json({ ok: false, message: `Server error (dev): ${err.message}` }, { status: 500 });
    }
    return NextResponse.json(
      { ok: false, message: "Something went wrong. Please try again in a moment." },
      { status: 500 },
    );
  }
}
