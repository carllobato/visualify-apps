import { SummaryTile } from "@/components/dashboard/SummaryTile";
import { DashboardCard } from "@/components/dashboard/DashboardCard";

type PortfolioOverviewContentProps = {
  projectCount: number;
  activeRiskCount: number;
};

export function PortfolioOverviewContent({ projectCount, activeRiskCount }: PortfolioOverviewContentProps) {
  return (
    <main className="w-full px-4 sm:px-6 py-8">
      {/* Section A — Portfolio KPI Summary */}
      <section className="mb-8" aria-labelledby="portfolio-kpi-heading">
        <h2 id="portfolio-kpi-heading" className="sr-only">
          Portfolio KPI summary
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <SummaryTile
            title="Projects"
            primaryValue={String(projectCount)}
            subtext={projectCount === 1 ? "1 project" : `${projectCount} projects`}
          />
          <SummaryTile
            title="Active Risks"
            primaryValue={String(activeRiskCount)}
            subtext={activeRiskCount === 1 ? "1 active risk" : `${activeRiskCount} active risks`}
          />
          <SummaryTile title="Contingency Held" primaryValue="—" subtext="No data yet" />
          <SummaryTile title="Risk Exposure" primaryValue="—" subtext="No data yet" />
          <SummaryTile title="Coverage Ratio" primaryValue="—" subtext="No data yet" />
        </div>
      </section>

      {/* Section B — Portfolio Risk Concentration */}
      <section className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-6" aria-labelledby="risk-concentration-heading">
        <h2 id="risk-concentration-heading" className="sr-only">
          Portfolio risk concentration
        </h2>
        <DashboardCard title="Top 5 Cost Risks">
          <p className="text-sm text-[var(--ds-text-muted)] m-0">
            No cost risk data available. Run simulations in your projects to populate this view.
          </p>
        </DashboardCard>
        <DashboardCard title="Top 5 Schedule Risks">
          <p className="text-sm text-[var(--ds-text-muted)] m-0">
            No schedule risk data available. Run simulations in your projects to populate this view.
          </p>
        </DashboardCard>
      </section>

      {/* Section C — Portfolio Distribution (Placeholder) */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6" aria-labelledby="distribution-placeholder-heading">
        <h2 id="distribution-placeholder-heading" className="sr-only">
          Portfolio distribution (placeholder)
        </h2>
        <DashboardCard title="Risk Exposure by Project">
          <p className="text-sm text-[var(--ds-text-muted)] m-0">
            Chart placeholder. Risk exposure by project will be displayed here.
          </p>
        </DashboardCard>
        <DashboardCard title="Risks by Category">
          <p className="text-sm text-[var(--ds-text-muted)] m-0">
            Chart placeholder. Risk breakdown by category will be displayed here.
          </p>
        </DashboardCard>
      </section>
    </main>
  );
}
