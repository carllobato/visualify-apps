type DashboardCardProps = {
  title: string;
  children: React.ReactNode;
};

/**
 * Reusable container card for dashboard sections. Consistent padding, border, and background.
 */
export function DashboardCard({ title, children }: DashboardCardProps) {
  return (
    <section className="rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface-elevated)] overflow-hidden">
      <h2 className="text-base font-semibold text-[var(--ds-text-primary)] px-4 py-3 border-b border-[var(--ds-border)] m-0">
        {title}
      </h2>
      <div className="p-4">{children}</div>
    </section>
  );
}
