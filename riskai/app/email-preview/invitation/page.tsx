type SearchParams = Record<string, string | string[] | undefined>;

/** Aligns with `packages/design-system/src/styles/globals.css` :root tokens (inline for email). */
const DS = {
  surface: "#f7f7f8",
  bg: "#ffffff",
  border: "#e6e6e8",
  textPrimary: "#111111",
  textSecondary: "#5f6368",
  textTertiary: "#9aa0a6",
  primary: "#3b82f6",
  primaryText: "#ffffff",
  radiusMd: "24px",
  radiusSm: "10px",
  font:
    "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
} as const;

function getParam(searchParams: SearchParams, key: string): string {
  const value = searchParams[key];
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

/** Mirrors `buildInvitationEmail` in `website/supabase/functions/notify-on-insert/index.ts`. */
export default async function InvitationEmailPreviewPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const firstName = getParam(params, "first_name").trim();
  const projectName = getParam(params, "project_name").trim() || "your project";
  const inviterDisplayName = getParam(params, "inviter_display_name").trim() || "a team member";
  const inviteLink =
    getParam(params, "invite_link").trim() || "https://app.riskai.com.au/invite?invite_token=demo-token";
  const greetingName = firstName || "there";

  return (
    <div
      style={{
        margin: 0,
        padding: 0,
        backgroundColor: DS.surface,
        color: DS.textPrimary,
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
        style={{ margin: 0, padding: 0, width: "100%", backgroundColor: DS.surface }}
      >
        <tbody>
          <tr>
            <td
              align="center"
              style={{
                padding: "24px 12px",
                backgroundColor: DS.surface,
                fontFamily: DS.font,
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
                        backgroundColor: DS.bg,
                        border: `1px solid ${DS.border}`,
                        borderRadius: DS.radiusMd,
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
                                color: DS.textPrimary,
                                padding: "0 0 14px 0",
                              }}
                            >
                              Visualify | Risk AI
                            </td>
                          </tr>
                          <tr>
                            <td
                              style={{
                                borderTop: `1px solid ${DS.border}`,
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
                                color: DS.textPrimary,
                                padding: "0 0 14px 0",
                              }}
                            >
                              You&apos;ve been invited
                            </td>
                          </tr>
                          <tr>
                            <td
                              style={{
                                fontSize: "16px",
                                lineHeight: "24px",
                                color: DS.textPrimary,
                                padding: "0 0 10px 0",
                              }}
                            >
                              Hi {greetingName},
                            </td>
                          </tr>
                          <tr>
                            <td
                              style={{
                                fontSize: "16px",
                                lineHeight: "24px",
                                color: DS.textSecondary,
                                padding: "0 0 20px 0",
                              }}
                            >
                              {inviterDisplayName} has invited you to join{" "}
                              <span style={{ fontWeight: 700, color: DS.textPrimary }}>{projectName}</span>
                              {" "}in Visualify | Risk AI.
                            </td>
                          </tr>
                          <tr>
                            <td style={{ padding: "0 0 20px 0" }}>
                              <table role="presentation" cellSpacing={0} cellPadding={0} border={0}>
                                <tbody>
                                  <tr>
                                    <td
                                      align="center"
                                      style={{ borderRadius: DS.radiusSm, backgroundColor: DS.primary }}
                                    >
                                      <a
                                        href={inviteLink}
                                        style={{
                                          display: "inline-block",
                                          padding: "11px 18px",
                                          fontSize: "14px",
                                          lineHeight: "20px",
                                          fontWeight: 600,
                                          color: DS.primaryText,
                                          textDecoration: "none",
                                          borderRadius: DS.radiusSm,
                                        }}
                                      >
                                        Accept invitation
                                      </a>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </td>
                          </tr>
                          <tr>
                            <td style={{ padding: "0 0 16px 0" }}>
                              <table
                                role="presentation"
                                width="100%"
                                cellSpacing={0}
                                cellPadding={0}
                                border={0}
                                style={{
                                  width: "100%",
                                  backgroundColor: DS.surface,
                                  border: `1px solid ${DS.border}`,
                                  borderRadius: DS.radiusSm,
                                }}
                              >
                                <tbody>
                                  <tr>
                                    <td style={{ padding: "10px 12px" }}>
                                      <div
                                        style={{
                                          fontSize: "13px",
                                          lineHeight: "18px",
                                          color: DS.textSecondary,
                                          padding: "0 0 6px 0",
                                        }}
                                      >
                                        If the button does not work, use this link:
                                      </div>
                                      <a
                                        href={inviteLink}
                                        style={{
                                          fontSize: "13px",
                                          lineHeight: "18px",
                                          color: DS.primary,
                                          wordBreak: "break-all",
                                          textDecoration: "underline",
                                        }}
                                      >
                                        {inviteLink}
                                      </a>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </td>
                          </tr>
                          <tr>
                            <td
                              style={{
                                fontSize: "13px",
                                lineHeight: "18px",
                                color: DS.textSecondary,
                                padding: "0 0 14px 0",
                              }}
                            >
                              This invitation will expire in 7 days.
                            </td>
                          </tr>
                          <tr>
                            <td
                              style={{
                                paddingTop: "12px",
                                borderTop: `1px solid ${DS.border}`,
                                fontSize: "12px",
                                lineHeight: "16px",
                                color: DS.textTertiary,
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
