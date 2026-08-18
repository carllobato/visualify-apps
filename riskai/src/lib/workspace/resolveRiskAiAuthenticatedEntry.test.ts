import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HOME_PATH, NO_ACCESS_PATH, POST_AUTH_ENTRY_PATH } from "@/lib/routes";
import { resolveRiskAiSessionEntry } from "./resolveRiskAiAuthenticatedEntry";

const WS_A = "ws-a";
const WS_B = "ws-b";

describe("resolveRiskAiSessionEntry — unauthenticated", () => {
  it("sends an unauthenticated user to login even when workspaces or a cookie are present", () => {
    const decision = resolveRiskAiSessionEntry({
      authenticated: false,
      pathname: "/dashboard",
      riskAiWorkspaceIds: [WS_A],
      cookieWorkspaceId: WS_A,
    });
    assert.equal(decision.kind, "login");
    assert.equal(decision.to, undefined);
    assert.equal(decision.selectedWorkspaceId, null);
  });
});

describe("resolveRiskAiSessionEntry — authenticated + 0 Workspaces", () => {
  it("sends the user to /home from post-auth landings", () => {
    for (const pathname of [POST_AUTH_ENTRY_PATH, "/dashboard", "/create-project"]) {
      const decision = resolveRiskAiSessionEntry({
        authenticated: true,
        pathname,
        riskAiWorkspaceIds: [],
        cookieWorkspaceId: null,
      });
      assert.deepEqual(
        { kind: decision.kind, to: decision.to, selectedWorkspaceId: decision.selectedWorkspaceId },
        { kind: "redirect", to: HOME_PATH, selectedWorkspaceId: null },
        pathname,
      );
    }
  });

  it("lets the user stay on /home to create a Workspace", () => {
    const decision = resolveRiskAiSessionEntry({
      authenticated: true,
      pathname: HOME_PATH,
      riskAiWorkspaceIds: [],
      cookieWorkspaceId: null,
    });
    assert.equal(decision.kind, "stay");
    assert.equal(decision.hidePrimaryNav, true);
  });

  it("lets the user stay on account settings with zero Workspaces", () => {
    const decision = resolveRiskAiSessionEntry({
      authenticated: true,
      pathname: "/account",
      riskAiWorkspaceIds: [],
      cookieWorkspaceId: null,
    });
    assert.equal(decision.kind, "stay");
  });

  it("does not send a zero-Workspace user to /no-access", () => {
    const fromDashboard = resolveRiskAiSessionEntry({
      authenticated: true,
      pathname: "/dashboard",
      riskAiWorkspaceIds: [],
      cookieWorkspaceId: null,
    });
    const fromNoAccess = resolveRiskAiSessionEntry({
      authenticated: true,
      pathname: NO_ACCESS_PATH,
      riskAiWorkspaceIds: [],
      cookieWorkspaceId: "ws-forged",
    });
    assert.notEqual(fromDashboard.to, NO_ACCESS_PATH);
    assert.notEqual(fromNoAccess.to, NO_ACCESS_PATH);
    assert.equal(fromDashboard.to, HOME_PATH);
    assert.equal(fromNoAccess.to, HOME_PATH);
    assert.equal(fromNoAccess.selectedWorkspaceId, null);
  });

  it("ignores a forged active Workspace cookie", () => {
    const decision = resolveRiskAiSessionEntry({
      authenticated: true,
      pathname: "/dashboard",
      riskAiWorkspaceIds: [],
      cookieWorkspaceId: "ws-forged",
    });
    assert.equal(decision.selectedWorkspaceId, null);
    assert.equal(decision.to, HOME_PATH);
  });
});

describe("resolveRiskAiSessionEntry — authenticated + 1 Workspace", () => {
  it("auto-enters the only Workspace from / and /dashboard", () => {
    for (const pathname of [POST_AUTH_ENTRY_PATH, "/dashboard"]) {
      const decision = resolveRiskAiSessionEntry({
        authenticated: true,
        pathname,
        riskAiWorkspaceIds: [WS_A],
        cookieWorkspaceId: null,
      });
      assert.deepEqual(
        { kind: decision.kind, to: decision.to, selectedWorkspaceId: decision.selectedWorkspaceId },
        { kind: "redirect", to: `/workspaces/${WS_A}`, selectedWorkspaceId: WS_A },
        pathname,
      );
    }
  });

  it("keeps /home as the selector so a second Workspace can still be created", () => {
    const decision = resolveRiskAiSessionEntry({
      authenticated: true,
      pathname: HOME_PATH,
      riskAiWorkspaceIds: [WS_A],
      cookieWorkspaceId: WS_A,
    });
    assert.equal(decision.kind, "stay");
    assert.equal(decision.selectedWorkspaceId, WS_A);
  });

  it("does not let a forged cookie replace the only entitled Workspace", () => {
    const decision = resolveRiskAiSessionEntry({
      authenticated: true,
      pathname: "/dashboard",
      riskAiWorkspaceIds: [WS_A],
      cookieWorkspaceId: "ws-forged",
    });
    assert.equal(decision.selectedWorkspaceId, WS_A);
    assert.equal(decision.to, `/workspaces/${WS_A}`);
  });
});

describe("resolveRiskAiSessionEntry — authenticated + 2+ Workspaces", () => {
  it("sends the user to the /home selector when no valid active Workspace cookie is set", () => {
    const decision = resolveRiskAiSessionEntry({
      authenticated: true,
      pathname: "/dashboard",
      riskAiWorkspaceIds: [WS_A, WS_B],
      cookieWorkspaceId: null,
    });
    assert.equal(decision.kind, "redirect");
    assert.equal(decision.to, `${HOME_PATH}?next=${encodeURIComponent("/dashboard")}`);
    assert.equal(decision.selectedWorkspaceId, null);
    assert.equal(decision.needsSelection, true);
  });

  it("sends the user to /home from the bare post-auth path when selection is required", () => {
    const decision = resolveRiskAiSessionEntry({
      authenticated: true,
      pathname: POST_AUTH_ENTRY_PATH,
      riskAiWorkspaceIds: [WS_A, WS_B],
      cookieWorkspaceId: null,
    });
    assert.equal(decision.kind, "redirect");
    assert.equal(decision.to, HOME_PATH);
    assert.equal(decision.needsSelection, true);
  });

  it("keeps /home as the selector even when a valid active Workspace cookie is set", () => {
    const decision = resolveRiskAiSessionEntry({
      authenticated: true,
      pathname: HOME_PATH,
      riskAiWorkspaceIds: [WS_A, WS_B],
      cookieWorkspaceId: WS_B,
    });
    assert.equal(decision.kind, "stay");
    assert.equal(decision.selectedWorkspaceId, WS_B);
    assert.equal(decision.needsSelection, false);
  });

  it("keeps a valid active Workspace cookie and does not bounce dashboard away", () => {
    const decision = resolveRiskAiSessionEntry({
      authenticated: true,
      pathname: "/dashboard",
      riskAiWorkspaceIds: [WS_A, WS_B],
      cookieWorkspaceId: WS_B,
    });
    assert.equal(decision.kind, "stay");
    assert.equal(decision.selectedWorkspaceId, WS_B);
    assert.equal(decision.needsSelection, false);
  });

  it("enters the cookied Workspace from the bare post-auth path", () => {
    const decision = resolveRiskAiSessionEntry({
      authenticated: true,
      pathname: POST_AUTH_ENTRY_PATH,
      riskAiWorkspaceIds: [WS_A, WS_B],
      cookieWorkspaceId: WS_B,
    });
    assert.equal(decision.kind, "redirect");
    assert.equal(decision.to, `/workspaces/${WS_B}`);
    assert.equal(decision.selectedWorkspaceId, WS_B);
  });

  it("does not grant access from an invalid active Workspace cookie", () => {
    const decision = resolveRiskAiSessionEntry({
      authenticated: true,
      pathname: "/dashboard",
      riskAiWorkspaceIds: [WS_A, WS_B],
      cookieWorkspaceId: "ws-forged",
    });
    assert.equal(decision.selectedWorkspaceId, null);
    assert.equal(decision.needsSelection, true);
    assert.equal(decision.kind, "redirect");
    assert.equal(decision.to, `${HOME_PATH}?next=${encodeURIComponent("/dashboard")}`);
  });
});

describe("resolveRiskAiSessionEntry — product isolation", () => {
  it("does not require user-level product grants to enter RiskAI", () => {
    const decision = resolveRiskAiSessionEntry({
      authenticated: true,
      pathname: "/dashboard",
      riskAiWorkspaceIds: [],
      cookieWorkspaceId: null,
    });
    assert.equal(decision.kind, "redirect");
    assert.equal(decision.to, HOME_PATH);
    assert.equal("hasProductAccess" in decision, false);
    assert.equal("userProductGrants" in decision, false);
  });

  it("does not treat entitlements for other Visualify products as RiskAI Workspaces", () => {
    const decision = resolveRiskAiSessionEntry({
      authenticated: true,
      pathname: "/dashboard",
      riskAiWorkspaceIds: [],
      cookieWorkspaceId: "report-workspace",
    });
    assert.equal(decision.selectedWorkspaceId, null);
    assert.equal(decision.to, HOME_PATH);
  });
});
