import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@visualify/design-system";

const elevatedCardClass =
  "[border-width:var(--ds-border-width)] border-[var(--ds-border)] bg-[var(--ds-surface-elevated)]";

const statCards = [
  { label: "Rail width", value: "72px" },
  { label: "Main column", value: "Flex" },
  { label: "Surface", value: "Framed" },
  { label: "Scroll region", value: "Body" },
] as const;

const tableRows = [
  { name: "Primary panel", type: "Content", status: "Placeholder" },
  { name: "Side panel", type: "Meta", status: "Placeholder" },
  { name: "Table", type: "Data", status: "Sample" },
] as const;

export default function ShellPreviewPage() {
  return (
    <div className="flex min-h-full flex-col items-start justify-start px-0 pb-10 pt-0">
      <main className="w-full max-w-none shrink-0 space-y-8">
        <div className="space-y-2.5">
          <h1 className="text-[length:var(--ds-text-xl)] font-semibold tracking-tight text-[var(--ds-text-primary)]">
            Visualify App Shell Preview
          </h1>
          <p className="max-w-2xl text-[length:var(--ds-text-sm)] leading-relaxed text-[var(--ds-text-secondary)]">
            Internal sandbox for the shared Visualify app shell. Use this page to check spacing,
            typography, and frame behaviour inside HQ without touching product flows.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((item) => (
            <Card key={item.label} variant="default" className={elevatedCardClass}>
              <CardContent className="!px-4 !py-3">
                <p className="m-0 text-[length:var(--ds-text-xs)] font-medium uppercase tracking-wide text-[var(--ds-text-tertiary)]">
                  {item.label}
                </p>
                <p className="mt-1 m-0 text-[length:var(--ds-text-lg)] font-semibold tabular-nums text-[var(--ds-text-primary)]">
                  {item.value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,260px)] lg:items-start">
          <Card variant="default" className={elevatedCardClass}>
            <CardHeader className="!px-4 !py-3">
              <CardTitle className="text-[length:var(--ds-text-base)] font-semibold text-[var(--ds-text-primary)]">
                Main content
              </CardTitle>
            </CardHeader>
            <CardContent className="!px-4 !pb-4 !pt-0">
              <p className="m-0 text-[length:var(--ds-text-sm)] leading-relaxed text-[var(--ds-text-secondary)]">
                Large panel area for primary layout checks. Content scrolls within the shell scroll
                region; this block is static copy for visual reference only.
              </p>

              <div className="mt-6 overflow-x-auto rounded-[var(--ds-radius-sm)] border border-[var(--ds-border)]">
                <table className="w-full min-w-[480px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--ds-border)] bg-[var(--ds-surface-default)]">
                      <th className="px-3 py-2.5 font-medium text-[var(--ds-text-secondary)]">Name</th>
                      <th className="px-3 py-2.5 font-medium text-[var(--ds-text-secondary)]">Type</th>
                      <th className="px-3 py-2.5 font-medium text-[var(--ds-text-secondary)]">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((row) => (
                      <tr
                        key={row.name}
                        className="border-b border-[var(--ds-border)] last:border-b-0"
                      >
                        <td className="px-3 py-2.5 font-medium text-[var(--ds-text-primary)]">
                          {row.name}
                        </td>
                        <td className="px-3 py-2.5 text-[var(--ds-text-secondary)]">{row.type}</td>
                        <td className="px-3 py-2.5 text-[var(--ds-text-secondary)]">{row.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card variant="default" className={elevatedCardClass}>
            <CardHeader className="!px-4 !py-3">
              <CardTitle className="text-[length:var(--ds-text-sm)] font-semibold text-[var(--ds-text-primary)]">
                Side panel
              </CardTitle>
            </CardHeader>
            <CardContent className="!px-4 !pb-4 !pt-0">
              <p className="m-0 text-[length:var(--ds-text-xs)] leading-relaxed text-[var(--ds-text-secondary)]">
                Secondary column for compact notes, filters, or metadata in real screens. Fixed
                width on large viewports; stacks under the main panel on smaller widths.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
