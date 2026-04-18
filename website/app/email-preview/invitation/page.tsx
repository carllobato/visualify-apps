type SearchParams = Record<string, string | string[] | undefined>;

/** Layout tokens; colors use `.email-preview-root` CSS vars (light/dark via theme toggle). */
const EP = {
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
                              You&apos;ve been invited
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
                              Hi {greetingName},
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
                              {inviterDisplayName} has invited you to join{" "}
                              <span style={{ fontWeight: 700, color: "var(--ep-text-primary)" }}>{projectName}</span>
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
                                      style={{ borderRadius: EP.radiusSm, backgroundColor: "var(--ep-primary)" }}
                                    >
                                      <a
                                        href={inviteLink}
                                        style={{
                                          display: "inline-block",
                                          padding: "11px 18px",
                                          fontSize: "14px",
                                          lineHeight: "20px",
                                          fontWeight: 600,
                                          color: "var(--ep-primary-text)",
                                          textDecoration: "none",
                                          borderRadius: EP.radiusSm,
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
                                  backgroundColor: "var(--ep-surface)",
                                  border: "1px solid var(--ep-border)",
                                  borderRadius: EP.radiusSm,
                                }}
                              >
                                <tbody>
                                  <tr>
                                    <td style={{ padding: "10px 12px" }}>
                                      <div
                                        style={{
                                          fontSize: "13px",
                                          lineHeight: "18px",
                                          color: "var(--ep-text-secondary)",
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
                                          color: "var(--ep-primary)",
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
                                color: "var(--ep-text-secondary)",
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
