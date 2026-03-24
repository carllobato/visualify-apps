import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

const MAX_NAME = 200;
const MAX_MESSAGE = 10_000;
const MAX_COMPANY = 200;

function isValidEmail(email: string): boolean {
  if (email.length > 320) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isPlaceholderSupabaseUrl(url: string): boolean {
  const u = url.toLowerCase();
  return u.includes("your_project_ref") || u.includes("your-project-ref") || u.includes("xxxxxx.supabase.co");
}

function placeholderUrlMessage(): string {
  return process.env.NODE_ENV === "development"
    ? "NEXT_PUBLIC_SUPABASE_URL is still a placeholder. In Supabase open Project Settings → API and copy Project URL (https://<id>.supabase.co). Paste it into .env.local, save, and restart `npm run dev`."
    : "Message could not be sent. Please try again later.";
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
    return "Database table missing: run the migration in Supabase (supabase/migrations/…visualify_contact.sql) and confirm the table `visualify_contact` exists.";
  }
  if (/invalid api key|jwt|permission denied|not authorized/i.test(msg)) {
    return "Supabase rejected the request: check `SUPABASE_SERVICE_ROLE_KEY` is the service_role secret (not anon) and matches this project.";
  }
  return `Database error (dev): ${msg.slice(0, 500)}`;
}

type Body = {
  name?: unknown;
  email?: unknown;
  message?: unknown;
  company?: unknown;
  source?: unknown;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request body." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const emailRaw = typeof body.email === "string" ? body.email.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const companyTrimmed =
    typeof body.company === "string" && body.company.trim() ? body.company.trim() : null;
  if (companyTrimmed && companyTrimmed.length > MAX_COMPANY) {
    return NextResponse.json({ ok: false, message: "Company name is too long." }, { status: 400 });
  }
  const companyValue = companyTrimmed;
  const source =
    typeof body.source === "string" && body.source.trim() ? body.source.trim().slice(0, 120) : "website";

  if (!name || name.length > MAX_NAME) {
    return NextResponse.json({ ok: false, message: "Please enter your name." }, { status: 400 });
  }

  if (!emailRaw) {
    return NextResponse.json({ ok: false, message: "Please enter a valid email address." }, { status: 400 });
  }

  const email = emailRaw.toLowerCase();
  if (!isValidEmail(email)) {
    return NextResponse.json({ ok: false, message: "Please enter a valid email address." }, { status: 400 });
  }

  if (!message || message.length > MAX_MESSAGE) {
    return NextResponse.json({ ok: false, message: "Please enter a message." }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[contact] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    const messageText =
      process.env.NODE_ENV === "development"
        ? "Supabase is not configured. Copy .env.example to .env.local and set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (Project Settings → API in the Supabase dashboard)."
        : "Message could not be sent. Please try again later.";
    return NextResponse.json({ ok: false, message: messageText }, { status: 503 });
  }

  if (isPlaceholderSupabaseUrl(supabaseUrl)) {
    console.error("[contact] NEXT_PUBLIC_SUPABASE_URL looks like a template, not a real Project URL");
    return NextResponse.json({ ok: false, message: placeholderUrlMessage() }, { status: 503 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("visualify_contact").insert({
      name,
      email,
      company: companyValue,
      message,
      source,
    });

    if (error) {
      console.error("[contact] insert failed", {
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
      message: "Thanks — your message was sent. We’ll get back to you soon.",
    });
  } catch (err) {
    console.error("[contact]", err);
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
