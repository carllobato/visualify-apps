import { OpenProjectOnboardingLink } from "@/components/onboarding/OpenProjectOnboardingLink";
import {
  buildPortfolioAccessRequestMailto,
  formatWorkspaceList,
  type DashboardWorkspaceContext,
} from "@/lib/dashboard/dashboardAccessContext";
import { Card, CardBody } from "@visualify/design-system";

type Props = {
  kind?: "projects";
  hasAppAccess: boolean;
  workspaces: readonly DashboardWorkspaceContext[];
  isWorkspaceAdmin: boolean;
};

export function DashboardSectionEmptyState({
  hasAppAccess,
  workspaces,
  isWorkspaceAdmin,
}: Props) {
  const workspaceLabel = formatWorkspaceList(workspaces);
  const requestMailto = buildPortfolioAccessRequestMailto(workspaces.map((w) => w.name));

  if (!hasAppAccess) {
    return <LegacyEmpty isWorkspaceAdmin={isWorkspaceAdmin} />;
  }

  return (
    <Card variant="inset" className="!border-0 text-center">
      <CardBody className="py-[var(--ds-space-6)]">
        <p className="ds-dashboard-empty-title">
          {isWorkspaceAdmin ? "No projects yet" : "No projects assigned yet"}
        </p>
        <p className="mx-auto mt-2 max-w-lg text-[length:var(--ds-text-sm)] leading-relaxed text-[var(--ds-text-secondary)]">
          {isWorkspaceAdmin
            ? "Create a project in your workspace."
            : `You can open RiskAI through ${workspaceLabel}, but you are not on any project team yet. Ask a workspace administrator or a project owner to add you.`}
        </p>
        <div className="mt-5 flex flex-col items-center justify-center gap-2 sm:flex-row sm:flex-wrap">
          {isWorkspaceAdmin ? (
            <OpenProjectOnboardingLink className="ds-dashboard-empty-primary">
              Create project
            </OpenProjectOnboardingLink>
          ) : (
            <a href={requestMailto} className="ds-dashboard-empty-primary no-underline">
              Request access
            </a>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

function LegacyEmpty({ isWorkspaceAdmin }: { isWorkspaceAdmin: boolean }) {
  return (
    <Card variant="inset" className="!border-0 text-center">
      <CardBody className="py-[var(--ds-space-6)]">
        <p className="ds-dashboard-empty-title">No projects yet</p>
        {isWorkspaceAdmin ? (
          <OpenProjectOnboardingLink className="ds-dashboard-empty-primary">
            Create project
          </OpenProjectOnboardingLink>
        ) : null}
      </CardBody>
    </Card>
  );
}
