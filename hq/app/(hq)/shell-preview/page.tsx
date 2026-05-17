import { railBrandTitleClass, shellPageHeaderRailRowClassName } from "@visualify/app-shell";
import { Card, CardContent, CardHeader } from "@visualify/design-system";
import { redirect } from "next/navigation";
import { resolveAuthenticatedUser } from "@/lib/auth/resolve-authenticated-user";

export const dynamic = "force-dynamic";

const cardClass =
  "[border-width:var(--ds-border-width)] border-[var(--ds-border)] bg-[var(--ds-surface-elevated)]";

const recentActivity = [
  {
    title: "RiskAI trial started",
    detail: "Product enabled for this workspace",
    when: "2 days ago",
  },
  {
    title: "Member invited",
    detail: "alex@northwind.studio invited as Admin",
    when: "5 days ago",
  },
  {
    title: "Workspace details updated",
    detail: "Website and display name saved",
    when: "1 week ago",
  },
] as const;

const workspaceSummary = [
  { label: "Members", value: "4" },
  { label: "Active apps", value: "2" },
  { label: "Billing", value: "Trial" },
] as const;

export default async function ShellPreviewPage() {
  const user = await resolveAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-full flex-col items-start justify-start px-0 pb-10 pt-0">
      <main className="w-full max-w-none shrink-0 space-y-10">
        <div className="space-y-2.5">
          <div className={shellPageHeaderRailRowClassName}>
            <h1 className={`m-0 text-[var(--ds-text-primary)] ${railBrandTitleClass}`}>
              Northwind Studio
            </h1>
          </div>
          <p className="max-w-xl text-[length:var(--ds-text-sm)] leading-relaxed text-[var(--ds-text-secondary)]">
            Manage apps, members, and billing for this organisation workspace.
          </p>
        </div>

        <section aria-labelledby="shell-preview-overview-heading" className="space-y-4">
          <h2
            id="shell-preview-overview-heading"
            className="text-[length:var(--ds-text-lg)] font-semibold tracking-tight text-[var(--ds-text-primary)]"
          >
            Overview
          </h2>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,260px)] lg:items-start">
            <Card variant="default" className={cardClass}>
              <CardHeader className="!px-4 !py-2.5">
                <h3 className="m-0 text-sm font-semibold text-[var(--ds-text-primary)]">Recent activity</h3>
              </CardHeader>
              <CardContent className="!px-4 !pb-4 !pt-0">
                <ul className="m-0 list-none space-y-2 p-0">
                  {recentActivity.map((item) => (
                    <li
                      key={item.title}
                      className="rounded-[var(--ds-radius-sm)] border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)] px-3 py-2.5"
                    >
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-[var(--ds-text-primary)]">{item.title}</div>
                          <p className="mt-0.5 m-0 text-[length:var(--ds-text-xs)] leading-relaxed text-[var(--ds-text-secondary)]">
                            {item.detail}
                          </p>
                        </div>
                        <span className="shrink-0 text-[length:var(--ds-text-xs)] font-medium text-[var(--ds-text-tertiary)]">
                          {item.when}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card variant="default" className={cardClass}>
              <CardHeader className="!px-4 !py-2.5">
                <h3 className="m-0 text-sm font-semibold text-[var(--ds-text-primary)]">Summary</h3>
              </CardHeader>
              <CardContent className="!px-4 !pb-4 !pt-0">
                <dl className="m-0 space-y-3 p-0">
                  {workspaceSummary.map((row) => (
                    <div key={row.label} className="flex items-baseline justify-between gap-3">
                      <dt className="m-0 text-[length:var(--ds-text-xs)] font-medium text-[var(--ds-text-tertiary)]">
                        {row.label}
                      </dt>
                      <dd className="m-0 text-[length:var(--ds-text-sm)] font-semibold tabular-nums text-[var(--ds-text-primary)]">
                        {row.value}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-4 m-0 text-[length:var(--ds-text-xs)] leading-relaxed text-[var(--ds-text-secondary)]">
                  Organisation workspaces share billing boundaries. Product access follows membership and
                  subscription state on this workspace.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}
