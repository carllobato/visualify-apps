import { OpenPortfolioOnboardingLink } from "@/components/onboarding/OpenPortfolioOnboardingLink";
import { OpenProjectOnboardingLink } from "@/components/onboarding/OpenProjectOnboardingLink";
import {
  buildPortfolioAccessRequestMailto,
  formatWorkspaceList,
  type DashboardWorkspaceContext,
} from "@/lib/dashboard/dashboardAccessContext";
import { Card, CardBody } from "@visualify/design-system";

type Props = {
  kind: "portfolios" | "projects";
  hasAppAccess: boolean;
  workspaces: readonly DashboardWorkspaceContext[];
  isWorkspaceAdmin: boolean;
  /** Parent portfolio for Create project when opened from a single-portfolio context. */
  preferredPortfolioId?: string | null;
  /** Accessible portfolio count — informational only; projects no longer require a portfolio. */
  portfolioCount?: number;
};

export function DashboardSectionEmptyState({
  kind,
  hasAppAccess,
  workspaces,
  isWorkspaceAdmin,
  preferredPortfolioId = null,
}: Props) {
  const workspaceLabel = formatWorkspaceList(workspaces);
  const requestMailto = buildPortfolioAccessRequestMailto(workspaces.map((w) => w.name));

  if (!hasAppAccess) {
    return (
      <LegacyEmpty
        kind={kind}
        isWorkspaceAdmin={isWorkspaceAdmin}
        preferredPortfolioId={preferredPortfolioId}
      />
    );
  }

  if (kind === "portfolios") {
    return (
      <Card variant="inset" className="text-center">
        <CardBody className="py-[var(--ds-space-6)]">
          <p className="ds-dashboard-empty-title">
            {isWorkspaceAdmin ? "No portfolios yet" : "No portfolios assigned yet"}
          </p>
          <p className="mx-auto mt-2 max-w-lg text-[length:var(--ds-text-sm)] leading-relaxed text-[var(--ds-text-secondary)]">
            You have <span className="font-medium">RiskAI app access</span> through {workspaceLabel}.
            Portfolios are an optional way to group related projects.{" "}
            {isWorkspaceAdmin
              ? "Create a portfolio when you want to organise projects together."
              : "Ask a workspace administrator or a portfolio owner to add you to a portfolio when you're ready."}
          </p>
          <div className="mt-5 flex flex-col items-center justify-center gap-2 sm:flex-row sm:flex-wrap">
            {isWorkspaceAdmin ? (
              <OpenPortfolioOnboardingLink className="ds-dashboard-empty-primary">
                Create portfolio
              </OpenPortfolioOnboardingLink>
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

  return (
    <Card variant="inset" className="!border-0 text-center">
      <CardBody className="py-[var(--ds-space-6)]">
        <p className="ds-dashboard-empty-title">
          {isWorkspaceAdmin ? "No projects yet" : "No projects assigned yet"}
        </p>
        <p className="mx-auto mt-2 max-w-lg text-[length:var(--ds-text-sm)] leading-relaxed text-[var(--ds-text-secondary)]">
          {isWorkspaceAdmin
            ? "Create a project in your workspace. You can optionally group it into a portfolio later."
            : `You can open RiskAI through ${workspaceLabel}, but you are not on any project team yet. Ask a workspace administrator or a portfolio or project owner to add you.`}
        </p>
        <div className="mt-5 flex flex-col items-center justify-center gap-2 sm:flex-row sm:flex-wrap">
          {isWorkspaceAdmin ? (
            <OpenProjectOnboardingLink
              className="ds-dashboard-empty-primary"
              portfolioId={preferredPortfolioId}
            >
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

function LegacyEmpty({
  kind,
  isWorkspaceAdmin,
  preferredPortfolioId = null,
}: {
  kind: "portfolios" | "projects";
  isWorkspaceAdmin: boolean;
  preferredPortfolioId?: string | null;
}) {
  if (kind === "portfolios") {
    return (
      <Card variant="inset" className="text-center">
        <CardBody className="py-[var(--ds-space-6)]">
          <p className="ds-dashboard-empty-title">No portfolios yet</p>
          {isWorkspaceAdmin ? (
            <OpenPortfolioOnboardingLink className="ds-dashboard-empty-primary">
              Create portfolio
            </OpenPortfolioOnboardingLink>
          ) : null}
        </CardBody>
      </Card>
    );
  }

  return (
    <Card variant="inset" className="!border-0 text-center">
      <CardBody className="py-[var(--ds-space-6)]">
        <p className="ds-dashboard-empty-title">No projects yet</p>
        {isWorkspaceAdmin ? (
          <OpenProjectOnboardingLink
            className="ds-dashboard-empty-primary"
            portfolioId={preferredPortfolioId}
          >
            Create project
          </OpenProjectOnboardingLink>
        ) : null}
      </CardBody>
    </Card>
  );
}
