/**
 * Invoked by Supabase Database Webhooks on INSERT into `visualify_signup` or `visualify_contact`.
 * Sends a notification email via Resend (optional: skips if RESEND_API_KEY is unset).
 *
 * Security: deploy with JWT verification disabled and require `Authorization: Bearer <WEBHOOK_SECRET>`.
 * See supabase/NOTIFY_SETUP.md.
 */

const NOTIFY_TO_DEFAULT = "help@visualify.com.au";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type WebhookInsertPayload = {
  type?: string;
  table?: string;
  schema?: string;
  record?: Record<string, unknown> | null;
};

async function sendResendEmail(params: {
  apiKey: string;
  from: string;
  to: string;
  replyTo: string;
  subject: string;
  text: string;
  html: string;
}): Promise<{ ok: boolean; status: number; body: string }> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: params.from,
      to: [params.to],
      reply_to: params.replyTo,
      subject: params.subject,
      text: params.text,
      html: params.html,
    }),
  });
  const body = await res.text();
  return { ok: res.ok, status: res.status, body };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const webhookSecret = Deno.env.get("WEBHOOK_SECRET")?.trim();
  const auth = req.headers.get("authorization");
  if (!webhookSecret || auth !== `Bearer ${webhookSecret}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let payload: WebhookInsertPayload;
  try {
    payload = (await req.json()) as WebhookInsertPayload;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (payload.schema !== "public" || payload.type !== "INSERT" || !payload.record) {
    return new Response(JSON.stringify({ ok: true, skipped: "not_insert" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const table = payload.table;
  const record = payload.record;

  const apiKey = Deno.env.get("RESEND_API_KEY")?.trim();
  if (!apiKey) {
    console.warn("[notify-on-insert] RESEND_API_KEY not set; skipping email");
    return new Response(JSON.stringify({ ok: true, skipped: "no_resend" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const from =
    Deno.env.get("CONTACT_FROM_EMAIL")?.trim() || "Visualify <onboarding@resend.dev>";
  const notifyTo = Deno.env.get("NOTIFY_TO_EMAIL")?.trim() || NOTIFY_TO_DEFAULT;

  let subject: string;
  let replyTo: string;
  let text: string;
  let html: string;

  if (table === "visualify_signup") {
    const first = String(record.first_name ?? "").trim();
    const last = String(record.last_name ?? "").trim();
    const email = String(record.email ?? "").trim().toLowerCase();
    if (!email) {
      console.warn("[notify-on-insert] signup row missing email");
      return new Response(JSON.stringify({ ok: true, skipped: "no_email" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    replyTo = email;
    subject = `Early access: ${first} ${last}`.trim() || `Early access: ${email}`;
    const lines = [
      `Name: ${first} ${last}`.trim(),
      `Email: ${email}`,
      record.job_title ? `Job title: ${String(record.job_title)}` : null,
      record.company ? `Company: ${String(record.company)}` : null,
      record.source ? `Source: ${String(record.source)}` : null,
    ].filter(Boolean) as string[];
    text = lines.join("\n");
    html = `<p><strong>Name:</strong> ${escapeHtml(`${first} ${last}`.trim() || "—")}</p><p><strong>Email:</strong> ${escapeHtml(email)}</p>${
      record.job_title
        ? `<p><strong>Job title:</strong> ${escapeHtml(String(record.job_title))}</p>`
        : ""
    }${record.company ? `<p><strong>Company:</strong> ${escapeHtml(String(record.company))}</p>` : ""}${
      record.source ? `<p><strong>Source:</strong> ${escapeHtml(String(record.source))}</p>` : ""
    }`;
  } else if (table === "visualify_contact") {
    const name = String(record.name ?? "").trim();
    const email = String(record.email ?? "").trim().toLowerCase();
    const message = String(record.message ?? "").trim();
    if (!email || !message) {
      console.warn("[notify-on-insert] contact row missing email or message");
      return new Response(JSON.stringify({ ok: true, skipped: "incomplete" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    replyTo = email;
    subject = "Visualify — Get in touch";
    const company = record.company ? String(record.company).trim() : "";
    text = [`Name: ${name}`, `Email: ${email}`, company ? `Company: ${company}` : null, "", "Message:", message]
      .filter((line) => line !== null)
      .join("\n");
    html = `<p><strong>Name:</strong> ${escapeHtml(name || "—")}</p><p><strong>Email:</strong> ${escapeHtml(email)}</p>${
      company ? `<p><strong>Company:</strong> ${escapeHtml(company)}</p>` : ""
    }<p><strong>Message:</strong></p><p style="white-space:pre-wrap">${escapeHtml(message)}</p>`;
  } else {
    return new Response(JSON.stringify({ ok: true, skipped: "unknown_table" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const result = await sendResendEmail({
      apiKey,
      from,
      to: notifyTo,
      replyTo,
      subject,
      text,
      html,
    });
    if (!result.ok) {
      console.warn("[notify-on-insert] Resend error", result.status, result.body.slice(0, 500));
      return new Response(JSON.stringify({ ok: false, error: "resend_failed", status: result.status }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.warn("[notify-on-insert] send failed", err);
    return new Response(JSON.stringify({ ok: false, error: "send_exception" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
});
