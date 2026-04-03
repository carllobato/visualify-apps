type SearchParams = Record<string, string | string[] | undefined>;

/** Layout tokens; colors use `.email-preview-root` CSS vars (light/dark via theme toggle). */
const EP = {
  radiusMd: "16px",
  radiusSm: "10px",
  font:
    "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
} as const;

function getParam(searchParams: SearchParams, key: string): string {
  const value = searchParams[key];
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

/**
 * Preview for Supabase “Password changed notification” (`riskai/supabase/email-templates/password_changed_notification.html`).
 * Dev: /email-preview/password-changed (website app).
 */
export default async function PasswordChangedEmailPreviewPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const email = getParam(params, "email").trim() || "you@example.com";

  return (
    <div
      className="email-preview-root"
      style={{
        margin: 0,
        padding: 0,
        backgroundColor: "var(--ep-surface)",
        color: "var(--ep-text-primary)",
        minHeight: "100vh",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <table
        role="presentation"
        width="100%"
        cellSpacing={0}
        cellPadding={0}
        border={0}
        style={{ margin: 0, padding: 0, width: "100%", backgroundColor: "var(--ep-surface)" }}
      >
        <tbody>
          <tr>
            <td
              align="center"
              style={{
                padding: "24px 12px",
                backgroundColor: "var(--ep-surface)",
                fontFamily: EP.font,
              }}
            >
              <table
                role="presentation"
                width={600}
                cellSpacing={0}
                cellPadding={0}
                border={0}
                style={{ width: "100%", maxWidth: "600px" }}
              >
                <tbody>
                  <tr>
                    <td
                      style={{
                        backgroundColor: "var(--ep-bg)",
                        border: "1px solid var(--ep-border)",
                        borderRadius: EP.radiusMd,
                        padding: "24px",
                      }}
                    >
                      <table role="presentation" width="100%" cellSpacing={0} cellPadding={0} border={0}>
                        <tbody>
                          <tr>
                            <td
                              style={{
                                fontSize: "16px",
                                lineHeight: "24px",
                                fontWeight: 600,
                                color: "var(--ep-text-primary)",
                                padding: "0 0 14px 0",
                              }}
                            >
                              Visualify | Risk AI
                            </td>
                          </tr>
                          <tr>
                            <td
                              style={{
                                borderTop: "1px solid var(--ep-border)",
                                fontSize: 0,
                                lineHeight: 0,
                                height: 0,
                                padding: "0 0 14px 0",
                              }}
                            >
                              &nbsp;
                            </td>
                          </tr>
                          <tr>
                            <td
                              style={{
                                fontSize: "24px",
                                lineHeight: "30px",
                                fontWeight: 700,
                                color: "var(--ep-text-primary)",
                                padding: "0 0 14px 0",
                              }}
                            >
                              Your password has been changed
                            </td>
                          </tr>
                          <tr>
                            <td
                              style={{
                                fontSize: "16px",
                                lineHeight: "24px",
                                color: "var(--ep-text-primary)",
                                padding: "0 0 10px 0",
                              }}
                            >
                              Hi there,
                            </td>
                          </tr>
                          <tr>
                            <td
                              style={{
                                fontSize: "16px",
                                lineHeight: "24px",
                                color: "var(--ep-text-secondary)",
                                padding: "0 0 16px 0",
                              }}
                            >
                              Your password for Visualify has been successfully updated.
                            </td>
                          </tr>
                          <tr>
                            <td
                              style={{
                                fontSize: "16px",
                                lineHeight: "24px",
                                color: "var(--ep-text-secondary)",
                                padding: "0 0 20px 0",
                              }}
                            >
                              This notice applies to{" "}
                              <span style={{ fontWeight: 700, color: "var(--ep-text-primary)" }}>{email}</span>.
                            </td>
                          </tr>
                          <tr>
                            <td
                              style={{
                                fontSize: "13px",
                                lineHeight: "18px",
                                color: "var(--ep-text-secondary)",
                                padding: "0 0 14px 0",
                              }}
                            >
                              If you did not make this change, please contact support immediately.
                            </td>
                          </tr>
                          <tr>
                            <td
                              style={{
                                paddingTop: "12px",
                                borderTop: "1px solid var(--ep-border)",
                                fontSize: "12px",
                                lineHeight: "16px",
                                color: "var(--ep-text-tertiary)",
                              }}
                            >
                              Powered by Visualify
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
