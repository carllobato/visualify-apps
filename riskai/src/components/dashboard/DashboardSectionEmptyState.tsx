import Link from "next/link";
import { OpenPortfolioOnboardingLink } from "@/components/onboarding/OpenPortfolioOnboardingLink";
import { OpenProjectOnboardingLink } from "@/components/onboarding/OpenProjectOnboardingLink";
import {
  buildPortfolioAccessRequestMailto,
  formatWorkspaceList,
  type DashboardWorkspaceContext,
} from "@/lib/dashboard/dashboardAccessContext";
import { productConfig } from "@/lib/product-config";
import { Card, CardBody } from "@visualify/design-system";

const secondaryCtaClass =
  "inline-flex items-center justify-center rounded-[var(--ds-radius-sm)] border border-[var(--ds-border)] bg-[var(--ds-surface-default)] px-4 py-2 text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-primary)] no-underline hover:bg-[var(--ds-surface-hover)]";

type Props = {
  kind: "portfolios" | "projects";
  hasAppAccess: boolean;
  workspaces: readonly DashboardWorkspaceContext[];
  isWorkspaceAdmin: boolean;
};

export function DashboardSectionEmptyState({
  kind,
  hasAppAccess,
  workspaces,
  isWorkspaceAdmin,
}: Props) {
  const workspaceLabel = formatWorkspaceList(workspaces);
  const requestMailto = buildPortfolioAccessRequestMailto(workspaces.map((w) => w.name));
  const hqUrl = productConfig.HQ_APPS_URL;

  if (!hasAppAccess) {
    return kind === "portfolios" ? (
      <LegacyEmpty kind={kind} isWorkspaceAdmin={isWorkspaceAdmin} />
    ) : (
      <LegacyEmpty kind={kind} isWorkspaceAdmin={isWorkspaceAdmin} />
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
            You have <span className="font-medium">RiskAI app access</span> through {workspaceLabel}, but
            portfolios and projects are permissioned separately.{" "}
            {isWorkspaceAdmin
              ? "Create a portfolio to organise work, or open HQ to manage your workspace."
              : "Ask a workspace admin or portfolio owner to add you to a portfolio when you're ready to work."}
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
            <Link href={hqUrl} className={secondaryCtaClass} target="_blank" rel="noopener noreferrer">
              {isWorkspaceAdmin ? "Open Visualify HQ" : "Ask workspace admin in HQ"}
            </Link>
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
            ? "Projects belong to portfolios. Create a project once you have a portfolio, or ask a portfolio owner to invite you to an existing project."
            : `You can open RiskAI through ${workspaceLabel}, but you are not on any project team yet. Ask a portfolio or project owner to add you.`}
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
          {!isWorkspaceAdmin ? (
            <Link href={hqUrl} className={secondaryCtaClass} target="_blank" rel="noopener noreferrer">
              Ask workspace admin in HQ
            </Link>
          ) : null}
        </div>
      </CardBody>
    </Card>
  );
}

function LegacyEmpty({
  kind,
  isWorkspaceAdmin,
}: {
  kind: "portfolios" | "projects";
  isWorkspaceAdmin: boolean;
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
          <OpenProjectOnboardingLink className="ds-dashboard-empty-primary">
            Create project
          </OpenProjectOnboardingLink>
        ) : null}
      </CardBody>
    </Card>
  );
}
