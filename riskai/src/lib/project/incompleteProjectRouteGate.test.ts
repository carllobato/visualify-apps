import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { resolveProjectPermissions } from "@/lib/db/projectPermissions.logic";
import { riskAiProjectRailHrefs } from "@/lib/layout/resolveRiskAiRailActiveNav";
import {
  createProjectShellRedirectPath,
  isProjectInformationSetupPath,
  projectInformationSetupPath,
  resolveIncompleteProjectRouteGate,
} from "./incompleteProjectRouteGate";

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const HREFS = riskAiProjectRailHrefs(PROJECT_ID);

const LAYOUT = fileURLToPath(
  new URL("../../../app/(protected)/projects/[projectId]/layout.tsx", import.meta.url),
);
const CREATE_PROJECT = fileURLToPath(
  new URL("../../../app/(protected)/create-project/page.tsx", import.meta.url),
);
const PROJECT_INFORMATION = fileURLToPath(
  new URL("../../../app/(protected)/project/ProjectInformationPage.tsx", import.meta.url),
);
const SIDEBAR = fileURLToPath(
  new URL("../../components/layout/Sidebar.tsx", import.meta.url),
);
const PROJECT_PATCH_ROUTE = fileURLToPath(
  new URL("../../../app/api/projects/[projectId]/route.ts", import.meta.url),
);

describe("resolveIncompleteProjectRouteGate", () => {
  it("gates incomplete Project Overview direct access", () => {
    assert.deepEqual(
      resolveIncompleteProjectRouteGate({
        pathname: HREFS.overview,
        projectId: PROJECT_ID,
        complete: false,
      }),
      { action: "redirect", url: HREFS.settings },
    );
  });

  it("gates incomplete Risk Register direct access", () => {
    assert.deepEqual(
      resolveIncompleteProjectRouteGate({
        pathname: HREFS.risks,
        projectId: PROJECT_ID,
        complete: false,
      }),
      { action: "redirect", url: HREFS.settings },
    );
  });

  it("gates incomplete Simulation direct access", () => {
    assert.deepEqual(
      resolveIncompleteProjectRouteGate({
        pathname: HREFS.simulation,
        projectId: PROJECT_ID,
        complete: false,
      }),
      { action: "redirect", url: HREFS.settings },
    );
  });

  it("gates incomplete Report direct access", () => {
    assert.deepEqual(
      resolveIncompleteProjectRouteGate({
        pathname: HREFS.report,
        projectId: PROJECT_ID,
        complete: false,
      }),
      { action: "redirect", url: HREFS.settings },
    );
  });

  it("keeps Project Settings accessible while incomplete", () => {
    assert.deepEqual(
      resolveIncompleteProjectRouteGate({
        pathname: HREFS.settings,
        projectId: PROJECT_ID,
        complete: false,
      }),
      { action: "allow" },
    );
    assert.equal(isProjectInformationSetupPath(HREFS.settings, PROJECT_ID), true);
    assert.equal(isProjectInformationSetupPath(`/riskai/projects/${PROJECT_ID}/settings`, PROJECT_ID), true);
  });

  it("does not loop a read-only user between protected pages", () => {
    const overview = resolveIncompleteProjectRouteGate({
      pathname: HREFS.overview,
      projectId: PROJECT_ID,
      complete: false,
    });
    assert.equal(overview.action, "redirect");
    if (overview.action !== "redirect") return;
    const landed = resolveIncompleteProjectRouteGate({
      pathname: overview.url,
      projectId: PROJECT_ID,
      complete: false,
    });
    assert.deepEqual(landed, { action: "allow" });
    assert.equal(overview.url, projectInformationSetupPath(PROJECT_ID));
  });

  it("retains existing direct-route behaviour for a complete Project", () => {
    for (const pathname of [HREFS.overview, HREFS.risks, HREFS.simulation, HREFS.report, HREFS.settings]) {
      assert.deepEqual(
        resolveIncompleteProjectRouteGate({
          pathname,
          projectId: PROJECT_ID,
          complete: true,
        }),
        { action: "allow" },
      );
    }
    assert.deepEqual(HREFS, {
      overview: `/projects/${PROJECT_ID}`,
      risks: `/projects/${PROJECT_ID}/risks`,
      simulation: `/projects/${PROJECT_ID}/simulation`,
      report: `/projects/${PROJECT_ID}/report`,
      settings: `/projects/${PROJECT_ID}/settings`,
    });
  });

  it("sends a /create-project shell to setup instead of a usable Project Overview", () => {
    assert.equal(createProjectShellRedirectPath(PROJECT_ID), HREFS.settings);
    assert.notEqual(createProjectShellRedirectPath(PROJECT_ID), HREFS.overview);
    const afterCreate = resolveIncompleteProjectRouteGate({
      pathname: HREFS.overview,
      projectId: PROJECT_ID,
      complete: false,
    });
    assert.deepEqual(afterCreate, { action: "redirect", url: HREFS.settings });
  });
});

describe("incomplete Project routing wiring", () => {
  it("enforces the gate in the Project layout from canonical completeness only", () => {
    const layout = readFileSync(LAYOUT, "utf8");
    assert.match(layout, /isCanonicalProjectComplete/);
    assert.match(layout, /CANONICAL_PROJECT_COMPLETENESS_SELECT/);
    assert.match(layout, /resolveIncompleteProjectRouteGate/);
    assert.match(layout, /setupGate\.action === "redirect"/);
    assert.equal(layout.includes("visualify_project_settings"), false);
    assert.equal(layout.includes("localStorage"), false);
    assert.equal(layout.includes("isProjectContextComplete"), false);
  });

  it("keeps Project Settings as the setup destination and does not hide it", () => {
    const page = readFileSync(PROJECT_INFORMATION, "utf8");
    assert.match(page, /PROJECT_SETUP_INCOMPLETE_EDITOR_NOTICE/);
    assert.match(page, /PROJECT_SETUP_INCOMPLETE_READONLY_NOTICE/);
    assert.match(page, /canEditProjectMetadata/);
    assert.equal(page.includes("resolveIncompleteProjectRouteGate"), false);
  });

  it("does not let /create-project land on a usable incomplete Project", () => {
    const page = readFileSync(CREATE_PROJECT, "utf8");
    assert.match(page, /createProjectShellRedirectPath\(projectId\)/);
    assert.equal(page.includes("router.replace(riskaiPath(`/projects/${projectId}`))"), false);
    assert.equal(page.includes("router.replace(riskaiPath(`/projects/${projectId}/simulation`))"), false);
  });

  it("keeps complete-Project navigation links in the Project rail", () => {
    const sidebar = readFileSync(SIDEBAR, "utf8");
    assert.match(sidebar, /Project Overview/);
    assert.match(sidebar, /\$\{projectNavBase\}\/risks/);
    assert.match(sidebar, /\$\{projectNavBase\}\/simulation/);
    assert.match(sidebar, /\$\{projectNavBase\}\/settings/);
  });

  it("does not grant Project Editor metadata authority because a Project is incomplete", () => {
    const editor = resolveProjectPermissions({
      tableOwnerUserId: "owner",
      currentUserId: "editor",
      memberRole: "editor",
    });
    assert.ok(editor);
    assert.equal(editor.canEditProjectMetadata, false);
    assert.equal(editor.canEditContent, true);

    const layout = readFileSync(LAYOUT, "utf8");
    assert.equal(layout.includes("canEditProjectMetadata: true"), false);
    assert.equal(layout.includes("permissions.canEditProjectMetadata = true"), false);

    const projectRoute = readFileSync(PROJECT_PATCH_ROUTE, "utf8");
    assert.match(projectRoute, /!bundle\.permissions\.canEditProjectMetadata/);
  });

  it("keeps incomplete Projects on the S4.5D gate rather than settings fallback for gated routes", () => {
    for (const pathname of [HREFS.overview, HREFS.risks, HREFS.simulation, HREFS.report]) {
      assert.deepEqual(
        resolveIncompleteProjectRouteGate({
          pathname,
          projectId: PROJECT_ID,
          complete: false,
        }),
        { action: "redirect", url: HREFS.settings },
      );
    }
  });
});
