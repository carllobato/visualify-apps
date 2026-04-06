import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Email signature template",
  robots: { index: false, follow: false },
};

type SearchParams = Record<string, string | string[] | undefined>;

function getParam(searchParams: SearchParams, key: string, fallback: string): string {
  const value = searchParams[key];
  const raw = Array.isArray(value) ? value[0] : value;
  const s = typeof raw === "string" ? raw.trim() : "";
  return s.length > 0 ? s : fallback;
}

/** When the query key is absent, use default; when present (even empty), use trimmed value. */
function getParamAllowEmpty(
  searchParams: SearchParams,
  key: string,
  defaultIfAbsent: string,
): string {
  if (!Object.prototype.hasOwnProperty.call(searchParams, key)) {
    return defaultIfAbsent;
  }
  const value = searchParams[key];
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" ? raw.trim() : "";
}

const FONT =
  "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

/**
 * Inline hex only — safe to paste into Gmail / Outlook (no CSS variables).
 * Light theme; matches invitation email palette from `.email-preview-root`.
 */
function buildSignatureHtml(params: {
  name: string;
  title: string;
  email: string;
  phone: string;
  company: string;
  subtitle: string;
  website: string;
  websiteLabel: string;
}): string {
  const { name, title, email, phone, company, subtitle, website, websiteLabel } = params;
  const titleRow =
    title.length > 0
      ? `<tr><td style="padding:0 0 8px 0;font-size:13px;line-height:18px;color:#5f6368;">${escapeHtml(title)}</td></tr>`
      : "";
  const phoneRow =
    phone.length > 0
      ? `<tr><td style="padding:2px 0 0 0;font-size:13px;line-height:18px;color:#5f6368;font-family:${FONT};">${escapeHtml(phone)}</td></tr>`
      : "";
  const subtitleRow =
    subtitle.length > 0
      ? `<tr><td style="padding:4px 0 0 0;font-size:13px;line-height:18px;color:#5f6368;font-weight:400;">${escapeHtml(subtitle)}</td></tr>`
      : "";
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0;padding:0;font-family:${FONT};"><tbody>
<tr><td style="padding:0 0 ${title.length > 0 ? "4" : "6"}px 0;font-size:15px;line-height:20px;font-weight:600;color:#111111;">${escapeHtml(name)}</td></tr>
${titleRow}
<tr><td style="padding:0 0 2px 0;font-size:13px;line-height:18px;"><a href="mailto:${escapeAttr(email)}" style="color:#3b82f6;text-decoration:none;">${escapeHtml(email)}</a></td></tr>
${phoneRow}
<tr><td style="padding:14px 0 0 0;font-size:24px;line-height:28px;font-weight:700;color:#111111;letter-spacing:-0.02em;">${escapeHtml(company)}</td></tr>
${subtitleRow}
<tr><td style="padding:8px 0 0 0;font-size:12px;line-height:16px;"><a href="${escapeAttr(website)}" style="color:#3b82f6;text-decoration:underline;" target="_blank" rel="noopener noreferrer">${escapeHtml(websiteLabel)}</a></td></tr>
</tbody></table>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, "&#39;");
}

/**
 * Dev: /email-preview/signature
 * Optional query: name, title, email, phone, company (brand wordmark), subtitle, website, website_label
 */
export default async function EmailSignaturePreviewPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const name = getParam(sp, "name", "Carl Lobato");
  const title = getParam(sp, "title", "");
  const email = getParam(sp, "email", "carl@visualify.com.au");
  const phone = getParam(sp, "phone", "");
  const company = getParam(sp, "company", "Visualify");
  const subtitle = getParamAllowEmpty(
    sp,
    "subtitle",
    "Risk intelligence for capital projects",
  );
  const website = getParam(sp, "website", "https://visualify.com.au");
  const websiteLabel = getParam(sp, "website_label", "visualify.com.au");

  const html = buildSignatureHtml({
    name,
    title,
    email,
    phone,
    company,
    subtitle,
    website,
    websiteLabel,
  });

  const exampleQuery =
    "?subtitle=Your%20tagline&title=Founder&phone=%2B61%20400%20000%20000";

  return (
    <div className="email-preview-root min-h-screen bg-[var(--ep-surface)] text-[var(--ep-text-primary)]">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <p className="text-muted mb-1 text-sm font-medium">Temporary</p>
        <h1 className="mb-2 text-2xl font-semibold tracking-tight">Email signature template</h1>
        <p className="text-muted mb-2 text-sm leading-relaxed">
          Open this page on your deployed site or locally, then copy the preview below (select the boxed
          area) into your mail client, or copy the HTML from the text field.
        </p>
        <p className="text-muted mb-6 font-mono text-xs break-all">
          <span className="font-sans font-medium text-foreground">URL: </span>
          /email-preview/signature
          {exampleQuery}
        </p>

        <div className="mb-4 rounded-lg border border-[var(--ep-border)] bg-[var(--ep-bg)] p-4">
          <p className="text-muted mb-2 text-xs font-medium uppercase tracking-wide">Preview</p>
          <div
            className="rounded-md border border-dashed border-[var(--ep-border)] bg-white p-4 dark:bg-[var(--ep-bg)]"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>

        <label className="text-muted mb-1 block text-xs font-medium uppercase tracking-wide">
          HTML (copy for clients that accept raw HTML)
        </label>
        <textarea
          readOnly
          className="border-border bg-background text-foreground mb-8 h-48 w-full rounded-lg border p-3 font-mono text-xs"
          spellCheck={false}
          value={html}
        />

        <div className="text-muted space-y-2 text-sm">
          <p className="font-medium text-foreground">Query parameters (optional)</p>
          <ul className="list-inside list-disc space-y-1">
            <li>
              <code className="rounded bg-neutral-100 px-1 py-0.5 text-xs dark:bg-neutral-800">name</code>
            </li>
            <li>
              <code className="rounded bg-neutral-100 px-1 py-0.5 text-xs dark:bg-neutral-800">title</code>{" "}
              (omit or leave empty to hide job title)
            </li>
            <li>
              <code className="rounded bg-neutral-100 px-1 py-0.5 text-xs dark:bg-neutral-800">email</code>
            </li>
            <li>
              <code className="rounded bg-neutral-100 px-1 py-0.5 text-xs dark:bg-neutral-800">phone</code>{" "}
              (omit for no phone line)
            </li>
            <li>
              <code className="rounded bg-neutral-100 px-1 py-0.5 text-xs dark:bg-neutral-800">company</code>{" "}
              (brand wordmark; default Visualify)
            </li>
            <li>
              <code className="rounded bg-neutral-100 px-1 py-0.5 text-xs dark:bg-neutral-800">subtitle</code>{" "}
              (under the Visualify wordmark; use <code className="text-xs">?subtitle=</code> with no value to hide)
            </li>
            <li>
              <code className="rounded bg-neutral-100 px-1 py-0.5 text-xs dark:bg-neutral-800">website</code>{" "}
              (full URL)
            </li>
            <li>
              <code className="rounded bg-neutral-100 px-1 py-0.5 text-xs dark:bg-neutral-800">
                website_label
              </code>{" "}
              (link text)
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
