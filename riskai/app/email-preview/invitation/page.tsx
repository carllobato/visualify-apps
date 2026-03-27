type SearchParams = Record<string, string | string[] | undefined>;

function getParam(searchParams: SearchParams, key: string): string {
  const value = searchParams[key];
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

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
    <div style={{ margin: 0, padding: "24px", backgroundColor: "#f7f7f8", minHeight: "100vh" }}>
      <table
        role="presentation"
        width="100%"
        cellSpacing={0}
        cellPadding={0}
        border={0}
        style={{ maxWidth: "600px", margin: "0 auto", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif", color: "#111111" }}
      >
        <tbody>
          <tr>
            <td style={{ padding: 0 }}>
              <div style={{ backgroundColor: "#ffffff", border: "1px solid #e6e6e8", borderRadius: "12px", padding: "28px" }}>
                <div style={{ fontSize: "18px", lineHeight: "24px", fontWeight: 700, color: "#111111", margin: "0 0 20px 0" }}>Visualify | Risk AI</div>
                <div style={{ fontSize: "28px", lineHeight: "34px", fontWeight: 700, color: "#111111", margin: "0 0 18px 0" }}>You&apos;ve been invited</div>
                <p style={{ margin: "0 0 12px 0", fontSize: "16px", lineHeight: "24px", color: "#111111" }}>Hi {greetingName},</p>
                <p style={{ margin: "0 0 24px 0", fontSize: "16px", lineHeight: "24px", color: "#5f6368" }}>
                  {inviterDisplayName} has invited you to join{" "}
                  <span style={{ fontWeight: 600, color: "#111111" }}>{projectName}</span>
                  {" "}in Visualify | Risk AI.
                </p>

                <table role="presentation" cellSpacing={0} cellPadding={0} border={0} style={{ margin: "0 0 24px 0" }}>
                  <tbody>
                    <tr>
                      <td style={{ borderRadius: "8px", backgroundColor: "#3b82f6" }}>
                        <a
                          href={inviteLink}
                          style={{
                            display: "inline-block",
                            padding: "12px 20px",
                            fontSize: "15px",
                            lineHeight: "20px",
                            fontWeight: 600,
                            color: "#ffffff",
                            textDecoration: "none",
                            borderRadius: "8px",
                          }}
                        >
                          Accept invitation
                        </a>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div style={{ margin: "0 0 20px 0", padding: "12px 14px", backgroundColor: "#f7f7f8", border: "1px solid #e6e6e8", borderRadius: "8px" }}>
                  <div style={{ margin: "0 0 6px 0", fontSize: "13px", lineHeight: "18px", color: "#5f6368" }}>If the button does not work, use this link:</div>
                  <a href={inviteLink} style={{ fontSize: "13px", lineHeight: "18px", color: "#3b82f6", wordBreak: "break-all", textDecoration: "underline" }}>
                    {inviteLink}
                  </a>
                </div>

                <p style={{ margin: "0 0 18px 0", fontSize: "13px", lineHeight: "18px", color: "#5f6368" }}>This invitation will expire in 7 days.</p>
                <div style={{ paddingTop: "14px", borderTop: "1px solid #e6e6e8", fontSize: "12px", lineHeight: "16px", color: "#9aa0a6" }}>Powered by Visualify</div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
