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

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function buildInvitationEmail(params: {
  firstName: string;
  projectName: string;
  inviterDisplayName: string;
  inviteLink: string;
}): { text: string; html: string } {
  const greetingName = params.firstName || "there";
  const text = [
    "Visualify | Risk AI",
    "",
    "You've been invited",
    "",
    `Hi ${greetingName},`,
    "",
    `${params.inviterDisplayName} has invited you to join ${params.projectName} in Visualify | Risk AI.`,
    "",
    "Accept invitation:",
    params.inviteLink,
    "",
    "If the button does not work, copy and paste this link into your browser:",
    params.inviteLink,
    "",
    "This invitation will expire in 7 days.",
    "",
    "Powered by Visualify",
  ].join("\n");
  const html = `
      <!doctype html>
      <html lang="en">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="x-apple-disable-message-reformatting" />
        <meta name="color-scheme" content="light only" />
        <meta name="supported-color-schemes" content="light only" />
      </head>
      <body bgcolor="#f4f4f5" style="margin:0;padding:0;background-color:#f4f4f5;color:#1f1f1f;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f4f4f5" style="margin:0;padding:0;width:100%;background-color:#f4f4f5;">
        <tr>
          <td align="center" bgcolor="#f4f4f5" style="padding:24px 12px;background-color:#f4f4f5;font-family:Arial,'Segoe UI',Helvetica,sans-serif;">
            <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;">
              <tr>
                <td bgcolor="#ffffff" style="background-color:#ffffff;border:1px solid #e6e6e8;border-radius:14px;padding:24px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                      <td style="font-size:16px;line-height:24px;font-weight:600;color:#1f1f1f;padding:0 0 14px 0;">
                        Visualify | Risk AI
                      </td>
                    </tr>
                    <tr>
                      <td style="border-top:1px solid #e6e6e8;font-size:0;line-height:0;height:0;padding:0 0 14px 0;">&nbsp;</td>
                    </tr>
                    <tr>
                      <td style="font-size:24px;line-height:30px;font-weight:700;color:#1f1f1f;padding:0 0 14px 0;">
                        You've been invited
                      </td>
                    </tr>
                    <tr>
                      <td style="font-size:16px;line-height:24px;color:#1f1f1f;padding:0 0 10px 0;">
                        Hi ${escapeHtml(greetingName)},
                      </td>
                    </tr>
                    <tr>
                      <td style="font-size:16px;line-height:24px;color:#333333;padding:0 0 20px 0;">
                        ${escapeHtml(params.inviterDisplayName)} has invited you to join
                        <span style="font-weight:700;color:#1f1f1f;">${escapeHtml(params.projectName)}</span>
                        in Visualify | Risk AI.
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:0 0 20px 0;">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                          <tr>
                            <td align="center" bgcolor="#A5573D" style="border-radius:10px;background-color:#A5573D;">
                              <!--[if mso]>
                              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${escapeHtml(params.inviteLink)}" style="height:42px;v-text-anchor:middle;width:190px;" arcsize="14%" stroke="f" fillcolor="#A5573D">
                                <w:anchorlock/>
                                <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:14px;font-weight:700;">
                                  Accept invitation
                                </center>
                              </v:roundrect>
                              <![endif]-->
                              <!--[if !mso]><!-- -->
                              <a
                                href="${escapeHtml(params.inviteLink)}"
                                style="display:inline-block;padding:11px 18px;font-size:14px;line-height:20px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;"
                              >
                                Accept invitation
                              </a>
                              <!--<![endif]-->
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:0 0 16px 0;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f8f8f8" style="width:100%;background-color:#f8f8f8;border:1px solid #e6e6e8;border-radius:10px;">
                          <tr>
                            <td style="padding:10px 12px;">
                              <div style="font-size:13px;line-height:18px;color:#555555;padding:0 0 6px 0;">
                                If the button does not work, use this link:
                              </div>
                              <a href="${escapeHtml(params.inviteLink)}" style="font-size:13px;line-height:18px;color:#A5573D;word-break:break-all;text-decoration:underline;">
                                ${escapeHtml(params.inviteLink)}
                              </a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="font-size:13px;line-height:18px;color:#555555;padding:0 0 14px 0;">
                        This invitation will expire in 7 days.
                      </td>
                    </tr>
                    <tr>
                      <td style="padding-top:12px;border-top:1px solid #e6e6e8;font-size:12px;line-height:16px;color:#888888;">
                        Powered by Visualify
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      </body>
      </html>
    `;
  return { text, html };
}

Deno.serve(async (req) => {
  if (req.method === "GET") {
    const url = new URL(req.url);
    if (url.searchParams.get("preview") === "visualify_invitations") {
      const firstName = url.searchParams.get("first_name")?.trim() || "";
      const projectName = url.searchParams.get("project_name")?.trim() || "your project";
      const inviterDisplayName = url.searchParams.get("inviter_display_name")?.trim() || "a team member";
      const inviteLink =
        url.searchParams.get("invite_link")?.trim() || "https://app.riskai.com.au/invite?invite_token=demo-token";
      const preview = buildInvitationEmail({
        firstName,
        projectName,
        inviterDisplayName,
        inviteLink,
      });
      return new Response(preview.html, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }
    return new Response("Method Not Allowed", { status: 405 });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
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

  let to = notifyTo;
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
  } else if (table === "visualify_invitations") {
    const status = String(record.status ?? "").trim().toLowerCase();
    if (status !== "pending") {
      return new Response(JSON.stringify({ ok: true, skipped: "not_pending" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const email = String(record.email ?? "").trim().toLowerCase();
    const firstName = String(record.first_name ?? "").trim();
    const projectName = String(record.project_name ?? "").trim() || "your project";
    const inviterDisplayName = String(record.inviter_display_name ?? "").trim() || "a team member";
    const inviteToken = String(record.invite_token ?? "").trim();
    const riskaiOrigin = Deno.env.get("RISKAI_APP_ORIGIN")?.trim();
    const invitationReplyTo =
      Deno.env.get("CONTACT_FROM_EMAIL")?.trim() ||
      Deno.env.get("NOTIFY_TO_EMAIL")?.trim() ||
      NOTIFY_TO_DEFAULT;

    if (!email || !inviteToken || !riskaiOrigin) {
      console.warn("[notify-on-insert] invitation row missing required fields");
      return new Response(JSON.stringify({ ok: true, skipped: "incomplete_invitation" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const inviteLink = `${riskaiOrigin.replace(/\/+$/, "")}/invite?invite_token=${encodeURIComponent(inviteToken)}`;
    to = email;
    replyTo = invitationReplyTo;
    subject = `You're invited to join ${projectName}`;
    const invitationEmail = buildInvitationEmail({
      firstName,
      projectName,
      inviterDisplayName,
      inviteLink,
    });
    text = invitationEmail.text;
    html = invitationEmail.html;
  } else {
    return new Response(JSON.stringify({ ok: true, skipped: "unknown_table" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!to || !isValidEmail(to)) {
    console.error("[notify-on-insert] INVALID EMAIL:", to);
    return new Response(
      JSON.stringify({ ok: true, skipped: "invalid_to_email", to }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const result = await sendResendEmail({
      apiKey,
      from,
      to,
      replyTo,
      subject,
      text,
      html,
    });
    if (!result.ok) {
      console.warn("[notify-on-insert] Resend error", result.status, result.body);
      return new Response(
        JSON.stringify({
          ok: false,
          error: "resend_failed",
          status: result.status,
          resend_body: result.body,
        }),
        {
          status: 502,
          headers: { "Content-Type": "application/json" },
        }
      );
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
