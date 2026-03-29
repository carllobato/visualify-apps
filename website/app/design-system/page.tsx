import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import {
  Badge,
  BarChartPrimitive,
  Button,
  Callout,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  ChartShowcase,
  ColumnChartPrimitive,
  DonutChartPrimitive,
  FieldError,
  HelperText,
  Input,
  Label,
  LineChartPrimitive,
  PieChartPrimitive,
  DashboardTile,
  DashboardTileDelta,
  DashboardTileKpi,
  DashboardTileStatus,
  StatBlock,
  StatusBlock,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
  Tabs,
  Textarea,
  chartShowcaseBarData,
  chartShowcaseColumnData,
  chartShowcaseLineData,
  chartShowcasePieData,
} from "@visualify/design-system";
import { ThemePreviewShell } from "./theme-preview-shell";

export const metadata: Metadata = {
  title: "Design System — Visualify",
  description: "Internal reference for shared Visualify styling tokens and components.",
  robots: { index: false, follow: false },
};

/** Colour tokens used by chart primitives and the Dashboard “Chart type cards” (Pie, Donut, Bar, Column, Line). */
const chartColorSwatches: { token: string; label: string; style: CSSProperties }[] = [
  { token: "--ds-chart-series-1", label: "Series 1", style: { backgroundColor: "var(--ds-chart-series-1)" } },
  { token: "--ds-chart-series-2", label: "Series 2", style: { backgroundColor: "var(--ds-chart-series-2)" } },
  { token: "--ds-chart-series-3", label: "Series 3", style: { backgroundColor: "var(--ds-chart-series-3)" } },
  { token: "--ds-chart-series-4", label: "Series 4", style: { backgroundColor: "var(--ds-chart-series-4)" } },
  { token: "--ds-chart-series-5", label: "Series 5", style: { backgroundColor: "var(--ds-chart-series-5)" } },
  { token: "--ds-chart-series-6", label: "Series 6", style: { backgroundColor: "var(--ds-chart-series-6)" } },
  { token: "--ds-chart-emphasis", label: "Emphasis (monochrome highlight)", style: { backgroundColor: "var(--ds-chart-emphasis)" } },
  { token: "--ds-chart-muted-series", label: "Muted series", style: { backgroundColor: "var(--ds-chart-muted-series)" } },
  { token: "--ds-chart-insight-positive", label: "Insight positive", style: { backgroundColor: "var(--ds-chart-insight-positive)" } },
  { token: "--ds-chart-insight-negative", label: "Insight negative", style: { backgroundColor: "var(--ds-chart-insight-negative)" } },
  { token: "--ds-chart-annotation", label: "Annotation / neutral insight", style: { backgroundColor: "var(--ds-chart-annotation)" } },
  { token: "--ds-chart-grid", label: "Grid lines", style: { backgroundColor: "var(--ds-chart-grid)" } },
  { token: "--ds-chart-axis", label: "Axis & labels", style: { backgroundColor: "var(--ds-chart-axis)" } },
  { token: "--ds-chart-surface", label: "Plot surface", style: { backgroundColor: "var(--ds-chart-surface)" } },
  { token: "--ds-chart-panel", label: "Panel fill", style: { backgroundColor: "var(--ds-chart-panel)" } },
  {
    token: "--ds-chart-panel-border",
    label: "Panel border",
    style: { border: "2px solid var(--ds-chart-panel-border)", backgroundColor: "var(--ds-surface-default)" },
  },
];

const colorSwatches: { token: string; label: string; style: CSSProperties }[] = [
  { token: "--ds-primary", label: "Primary", style: { backgroundColor: "var(--ds-primary)" } },
  { token: "--ds-primary-foreground", label: "Primary foreground", style: { backgroundColor: "var(--ds-primary-foreground)" } },
  { token: "--ds-background", label: "Background", style: { backgroundColor: "var(--ds-background)" } },
  { token: "--ds-foreground", label: "Foreground", style: { backgroundColor: "var(--ds-foreground)" } },
  { token: "--ds-muted", label: "Muted", style: { backgroundColor: "var(--ds-muted)" } },
  { token: "--ds-muted-foreground", label: "Muted foreground", style: { backgroundColor: "var(--ds-muted-foreground)" } },
  { token: "--ds-card", label: "Card", style: { backgroundColor: "var(--ds-card)" } },
  { token: "--ds-card-foreground", label: "Card foreground", style: { backgroundColor: "var(--ds-card-foreground)" } },
  { token: "--ds-border", label: "Border", style: { border: "2px solid var(--ds-border)" } },
  { token: "--ds-border-subtle", label: "Border subtle", style: { border: "2px solid var(--ds-border-subtle)", backgroundColor: "var(--ds-surface-default)" } },
  { token: "--ds-surface-hover", label: "Surface hover", style: { backgroundColor: "var(--ds-surface-hover)" } },
];

const semanticStatuses = ["success", "warning", "danger", "info", "neutral"] as const;
const spaceScale = [
  "--ds-space-1",
  "--ds-space-2",
  "--ds-space-3",
  "--ds-space-4",
  "--ds-space-5",
  "--ds-space-6",
  "--ds-space-8",
  "--ds-space-10",
  "--ds-space-12",
] as const;
const radiusScale = ["--ds-radius-sm", "--ds-radius-md", "--ds-radius-lg", "--ds-radius-xl"] as const;
const shadowScale = ["--ds-shadow-sm", "--ds-shadow-md", "--ds-shadow-lg"] as const;
const typeScale = [
  "--ds-text-xs",
  "--ds-text-sm",
  "--ds-text-base",
  "--ds-text-lg",
  "--ds-text-xl",
  "--ds-text-2xl",
  "--ds-text-3xl",
] as const;
const statusUseCases: Record<(typeof semanticStatuses)[number], string> = {
  success: "Confirmed or complete state",
  warning: "Requires attention, still recoverable",
  danger: "Failure or destructive outcome",
  info: "Informational/supporting context",
  neutral: "Background or non-critical state",
};

const surfaceTextPatterns = [
  {
    title: "Primary panel content",
    surfaceToken: "--ds-surface-default",
    textToken: "--ds-text-primary",
    surfaceClass: "bg-[var(--ds-surface-default)]",
    textClass: "text-[var(--ds-text-primary)]",
    helperClass: "text-[var(--ds-text-secondary)]",
    helper: "Use for default cards and key body copy.",
  },
  {
    title: "Secondary grouped context",
    surfaceToken: "--ds-surface-muted",
    textToken: "--ds-text-secondary",
    surfaceClass: "bg-[var(--ds-surface-muted)]",
    textClass: "text-[var(--ds-text-secondary)]",
    helperClass: "text-[var(--ds-text-muted)]",
    helper: "Use for side context, filters, and labels.",
  },
  {
    title: "Elevated panels and cards",
    surfaceToken: "--ds-surface-elevated",
    textToken: "--ds-text-primary",
    surfaceClass: "bg-[var(--ds-surface-elevated)]",
    textClass: "text-[var(--ds-text-primary)]",
    helperClass: "text-[var(--ds-text-secondary)]",
    helper: "Use for raised cards and spotlight regions.",
  },
  {
    title: "Inset background layer",
    surfaceToken: "--ds-surface-inset",
    textToken: "--ds-text-muted",
    surfaceClass: "bg-[var(--ds-surface-inset)]",
    textClass: "text-[var(--ds-text-muted)]",
    helperClass: "text-[var(--ds-text-muted)]",
    helper: "Use for low-priority regions and boundaries.",
  },
] as const;

const riskSemanticLevels = [
  { key: "low", label: "Low" },
  { key: "medium", label: "Medium" },
  { key: "high", label: "High" },
  { key: "critical", label: "Critical" },
  { key: "emerging", label: "Emerging" },
  { key: "volatile", label: "Volatile" },
  { key: "neutral", label: "Neutral" },
] as const;

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="border-t border-[var(--ds-border)] pt-8 first:border-t-0 first:pt-0">
      <header className="mb-4">
        <h2 className="text-[length:var(--ds-text-xl)] font-semibold tracking-tight text-[var(--ds-text-primary)]">{title}</h2>
        <p className="mt-1 text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">{description}</p>
      </header>
      {children}
    </section>
  );
}

function DsReference({ idPrefix }: { idPrefix: "light" | "dark" }) {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-12">
      <header
        className="rounded-[var(--ds-radius-lg)] border border-[var(--ds-border)] bg-[var(--ds-surface-elevated)] p-6 shadow-[var(--ds-shadow-sm)] dark:shadow-none"
      >
        <p className="text-[length:var(--ds-text-xs)] uppercase tracking-[0.12em] text-[var(--ds-text-muted)]">Internal reference</p>
        <h1 className="mt-2 text-[length:var(--ds-text-3xl)] font-semibold tracking-tight text-[var(--ds-text-primary)]">Visualify design system</h1>
        <p className="mt-2 max-w-2xl text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
          Shared foundation from <code>@visualify/design-system</code>, reviewed in {idPrefix} mode.
        </p>
      </header>

      <Section
        title="Foundations"
        description="Semantic status, text, surface, spacing, radius, shadow, typography, card and border tokens, and font stack."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Core tokens</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {colorSwatches.map((item) => (
                <div
                  key={item.token}
                  className="grid grid-cols-[auto_1fr] items-center gap-3 rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] bg-[var(--ds-surface-elevated)] px-3 py-2 shadow-[var(--ds-shadow-sm)] dark:bg-[var(--ds-surface-elevated)] dark:shadow-none"
                >
                  <div className="h-8 w-8 rounded-[var(--ds-radius-sm)] border border-[var(--ds-border)]" style={item.style} />
                  <div>
                    <p className="text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-primary)]">{item.label}</p>
                    <p className="font-mono text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">{item.token}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Status tokens</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {semanticStatuses.map((status) => (
                <div
                  key={status}
                  className="rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] bg-[var(--ds-surface-default)] p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded-full border border-[var(--ds-border)]" style={{ backgroundColor: `var(--ds-status-${status})` }} />
                      <p className="text-[length:var(--ds-text-sm)] font-medium capitalize text-[var(--ds-text-primary)]">{status}</p>
                    </div>
                    <p className="font-mono text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">{`--ds-status-${status}`}</p>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--ds-border)] pt-2">
                    <p className="text-[length:var(--ds-text-xs)] text-[var(--ds-text-secondary)]">{statusUseCases[status]}</p>
                    <Badge status={status}>{status}</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Surface + text tokens</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {surfaceTextPatterns.map((pattern) => (
                <div
                  key={pattern.surfaceToken}
                  className={`rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] p-3 ${pattern.surfaceClass}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={`text-[length:var(--ds-text-sm)] font-medium ${pattern.textClass}`}>{pattern.title}</p>
                      <p className={`mt-1 text-[length:var(--ds-text-xs)] ${pattern.helperClass}`}>{pattern.helper}</p>
                    </div>
                    <Button size="sm" variant="secondary">Action</Button>
                  </div>
                  <div className="mt-3 rounded-[var(--ds-radius-sm)] border border-[var(--ds-border)] bg-[var(--ds-surface-elevated)] p-2">
                    <p className="text-[length:var(--ds-text-xs)] text-[var(--ds-text-secondary)]">Sample line item with supporting detail.</p>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 font-mono text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">
                    <span>{pattern.surfaceToken}</span>
                    <span>+</span>
                    <span>{pattern.textToken}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Scales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-primary)]">Spacing</p>
                {spaceScale.map((token) => (
                  <div key={token} className="grid grid-cols-[120px_1fr] items-center gap-3">
                    <p className="font-mono text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">{token}</p>
                    <div className="h-2 rounded-full border border-[var(--ds-border)] bg-[var(--ds-surface-muted)]">
                      <div className="h-2 rounded-full bg-[var(--ds-primary)]" style={{ width: `var(${token})` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-primary)]">Radius</p>
                  <div className="flex flex-wrap gap-2">
                    {radiusScale.map((token) => (
                      <div key={token} className="space-y-1 text-center">
                        <div
                          className="h-9 w-9 border border-[var(--ds-border)] bg-[var(--ds-surface-muted)]"
                          style={{ borderRadius: `var(${token})` }}
                        />
                        <p className="font-mono text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">{token.replace("--ds-radius-", "")}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-primary)]">Shadows</p>
                  <div className="grid gap-2">
                    {shadowScale.map((token) => (
                      <div
                        key={token}
                        className="flex items-center justify-between rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] bg-[var(--ds-surface-elevated)] px-3 py-2"
                        style={{ boxShadow: `var(${token})` }}
                      >
                        <p className="text-[length:var(--ds-text-xs)] text-[var(--ds-text-secondary)]">Elevation sample</p>
                        <p className="font-mono text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">{token}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-primary)]">Typography</p>
                {typeScale.map((token) => (
                  <p key={token} style={{ fontSize: `var(${token})` }} className="flex items-baseline justify-between gap-2 text-[var(--ds-text-primary)]">
                    <span>Decision-ready reference text</span>
                    <span className="font-mono text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">{token}</span>
                  </p>
                ))}
              </div>
              <div className="space-y-2 border-t border-[var(--ds-border)] pt-4">
                <p className="text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-primary)]">Font stack</p>
                <p
                  className="text-[length:var(--ds-text-sm)] text-[var(--ds-text-primary)]"
                  style={{ fontFamily: "var(--ds-font-sans)" }}
                >
                  The quick brown fox jumps over the lazy dog.
                </p>
                <p className="font-mono text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">--ds-font-sans</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section
        title="Focus and control tokens"
        description="Row and keyboard-focus highlight surfaces, plus strong control border steps for primary actions."
      >
        <Card variant="elevated">
          <CardContent className="grid gap-[var(--ds-space-6)] md:grid-cols-2">
            <div className="space-y-[var(--ds-space-2)]">
              <p className="text-[length:var(--ds-text-xs)] font-medium text-[var(--ds-text-secondary)]">Focus highlight</p>
              <div
                className="rounded-[var(--ds-radius-md)] px-[var(--ds-space-3)] py-[var(--ds-space-2)] text-[length:var(--ds-text-sm)] text-[var(--ds-text-primary)]"
                style={{
                  backgroundColor: "var(--ds-focus-highlight-bg)",
                  outline: "2px solid var(--ds-focus-highlight-outline)",
                  outlineOffset: 0,
                }}
              >
                Highlighted row
              </div>
              <div className="space-y-[var(--ds-space-1)] font-mono text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">
                <p>--ds-focus-highlight-bg</p>
                <p>--ds-focus-highlight-outline</p>
              </div>
            </div>
            <div className="space-y-[var(--ds-space-2)]">
              <p className="text-[length:var(--ds-text-xs)] font-medium text-[var(--ds-text-secondary)]">Control borders</p>
              <div className="grid grid-cols-3 gap-[var(--ds-space-2)]">
                <div className="space-y-[var(--ds-space-2)]">
                  <div
                    className="h-[var(--ds-space-10)] rounded-[var(--ds-radius-sm)] bg-[var(--ds-surface-default)]"
                    style={{ border: "2px solid var(--ds-border)" }}
                  />
                  <p className="font-mono text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">--ds-border</p>
                </div>
                <div className="space-y-[var(--ds-space-2)]">
                  <div
                    className="h-[var(--ds-space-10)] rounded-[var(--ds-radius-sm)] bg-[var(--ds-surface-default)]"
                    style={{ border: "2px solid var(--ds-control-strong-border-hover)" }}
                  />
                  <p className="font-mono text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">--ds-control-strong-border-hover</p>
                </div>
                <div className="space-y-[var(--ds-space-2)]">
                  <div
                    className="h-[var(--ds-space-10)] rounded-[var(--ds-radius-sm)] bg-[var(--ds-surface-default)]"
                    style={{ border: "2px solid var(--ds-control-strong-border-active)" }}
                  />
                  <p className="font-mono text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">--ds-control-strong-border-active</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </Section>

      <Section title="Buttons" description="Primary, secondary, ghost variants, size support, icons, and disabled states."><Card variant="elevated"><CardContent className="space-y-4"><div className="flex flex-wrap gap-2"><Button>Primary</Button><Button variant="secondary">Secondary</Button><Button variant="ghost">Ghost</Button></div><div className="flex flex-wrap items-center gap-2"><Button size="sm">Small</Button><Button size="md">Medium</Button><Button size="lg">Large</Button></div><div className="flex flex-wrap gap-2"><Button leftIcon="+" rightIcon="→">Create report</Button><Button variant="secondary" disabled>Disabled secondary</Button><Button variant="ghost" disabled>Disabled ghost</Button></div></CardContent></Card></Section>

      <Section title="Form primitives" description="Input/Textarea states with Label, HelperText, and FieldError patterns."><div className="grid gap-4 md:grid-cols-2"><Card variant="elevated"><CardContent className="space-y-4"><div><Label htmlFor={`${idPrefix}-email`}>Email</Label><Input id={`${idPrefix}-email`} placeholder="jane@visualify.ai" /><HelperText>Used for report notifications.</HelperText></div><div><Label htmlFor={`${idPrefix}-name-invalid`}>Workspace name</Label><Input id={`${idPrefix}-name-invalid`} aria-invalid="true" defaultValue="!" /><FieldError>Name must be at least 3 characters.</FieldError></div><div><Label htmlFor={`${idPrefix}-disabled-input`}>Disabled input</Label><Input id={`${idPrefix}-disabled-input`} disabled defaultValue="Readonly value" /></div></CardContent></Card><Card variant="elevated"><CardContent className="space-y-4"><div><Label htmlFor={`${idPrefix}-notes`}>Notes</Label><Textarea id={`${idPrefix}-notes`} placeholder="Write team notes..." /><HelperText>Multiline field with muted placeholder text.</HelperText></div><div><Label htmlFor={`${idPrefix}-error-textarea`}>Issue details</Label><Textarea id={`${idPrefix}-error-textarea`} aria-invalid defaultValue="broken" /><FieldError>Please include at least 20 characters.</FieldError></div></CardContent></Card></div></Section>

      <Section
        title="Cards and panels"
        description="Default card, elevated card, inset panel, and CardHeader/CardContent/CardFooter structure at multiple widths."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <Card variant="default">
            <CardContent>Default card on base surface.</CardContent>
          </Card>
          <Card variant="elevated">
            <CardContent>Elevated card with subtle shadow.</CardContent>
          </Card>
          <Card variant="inset">
            <CardContent>Inset panel for grouped context.</CardContent>
          </Card>
        </div>
        <div className="mt-4 space-y-4">
          <Card variant="elevated" className="w-full">
            <CardHeader>
              <CardTitle>CardHeader</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
                CardContent area for main details. <span className="text-[var(--ds-text-muted)]">Full width.</span>
              </p>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button variant="secondary" size="sm">
                Cancel
              </Button>
            </CardFooter>
          </Card>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
            <Card variant="elevated" className="w-full max-w-xs shrink-0">
              <CardHeader>
                <CardTitle>CardHeader</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
                  CardContent area for main details. <span className="text-[var(--ds-text-muted)]">max-w-xs.</span>
                </p>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button variant="secondary" size="sm">
                  Cancel
                </Button>
              </CardFooter>
            </Card>
            <Card variant="elevated" className="w-full max-w-md">
              <CardHeader>
                <CardTitle>CardHeader</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
                  CardContent area for main details. <span className="text-[var(--ds-text-muted)]">max-w-md.</span>
                </p>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button variant="secondary" size="sm">
                  Cancel
                </Button>
              </CardFooter>
            </Card>
          </div>
          <Card variant="elevated" className="mx-auto w-full max-w-2xl">
            <CardHeader>
              <CardTitle>CardHeader</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
                CardContent area for main details. <span className="text-[var(--ds-text-muted)]">Centered, max-w-2xl.</span>
              </p>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button variant="secondary" size="sm">
                Cancel
              </Button>
            </CardFooter>
          </Card>
        </div>
      </Section>

      <Section
        title="Dashboard Blocks"
        description="Reference layouts for dashboards: KPI tiles, section panels, chart shells, KPI+mini-chart, and percentile summaries. Card primitives and tokens only—no chart library."
      >
        <div className="space-y-[var(--ds-space-8)]">
          {/* —— Tiles —— */}
          <div className="space-y-4">
            <p className="m-0 text-[length:var(--ds-text-xs)] font-medium uppercase tracking-[0.06em] text-[var(--ds-text-muted)]">
              Tiles
            </p>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-[var(--ds-space-4)]">
              {/* Stat */}
              <DashboardTileKpi
                label="Contingency value"
                value="$4.2M"
                helperText="Baseline contingency budget"
              />

              {/* Status */}
              <DashboardTileStatus label="Overall status" value="On Track" tone="success" />

              {/* Delta */}
              <DashboardTileDelta label="Funding gap" value="$2.4M required" tone="unfavorable" />

              {/* Insight */}
              <DashboardTile>
                <p className="m-0 text-[length:var(--ds-text-xs)] font-medium uppercase tracking-wide text-[var(--ds-text-muted)]">
                  Key insight
                </p>
                <p className="m-0 mt-2 text-[length:var(--ds-text-sm)] leading-relaxed text-[var(--ds-text-secondary)]">
                  Top three cost risks account for most of the simulated exposure. Closing data gaps on the remaining
                  drivers would tighten confidence in this view.
                </p>
              </DashboardTile>
            </div>

            {/* Section Panel */}
            <Card variant="inset" className="overflow-hidden">
              <CardHeader className="border-b border-[var(--ds-border)] px-[var(--ds-dashboard-section-header-padding-x)] py-[var(--ds-dashboard-section-header-padding-y)]">
                <CardTitle className="text-[length:var(--ds-text-base)]">Baseline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-[var(--ds-dashboard-section-body-padding)]">
                <p className="m-0 text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
                  Placeholder body: grouped metrics or controls for this dashboard section.
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-[var(--ds-space-3)]">
                  <div className="rounded-[var(--ds-radius-sm)] border border-[var(--ds-border)] bg-[var(--ds-surface-default)] p-[var(--ds-dashboard-summary-cell-padding)]">
                    <p className="m-0 text-[length:var(--ds-text-xs)] font-medium uppercase tracking-wide text-[var(--ds-text-muted)]">
                      Block A
                    </p>
                    <p className="m-0 mt-1 text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-primary)]">—</p>
                  </div>
                  <div className="rounded-[var(--ds-radius-sm)] border border-[var(--ds-border)] bg-[var(--ds-surface-default)] p-[var(--ds-dashboard-summary-cell-padding)]">
                    <p className="m-0 text-[length:var(--ds-text-xs)] font-medium uppercase tracking-wide text-[var(--ds-text-muted)]">
                      Block B
                    </p>
                    <p className="m-0 mt-1 text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-primary)]">—</p>
                  </div>
                  <div className="rounded-[var(--ds-radius-sm)] border border-[var(--ds-border)] bg-[var(--ds-surface-default)] p-[var(--ds-dashboard-summary-cell-padding)]">
                    <p className="m-0 text-[length:var(--ds-text-xs)] font-medium uppercase tracking-wide text-[var(--ds-text-muted)]">
                      Block C
                    </p>
                    <p className="m-0 mt-1 text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-primary)]">—</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* —— Chart blocks —— */}
          <div className="space-y-4">
            <p className="m-0 text-[length:var(--ds-text-xs)] font-medium uppercase tracking-[0.06em] text-[var(--ds-text-muted)]">
              Chart blocks
            </p>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3 xl:gap-[var(--ds-space-4)]">
              {/* Chart Panel Block */}
              <Card className="overflow-hidden xl:col-span-2">
                <CardContent className="p-[var(--ds-chart-panel-padding)]">
                  <div className="mb-[var(--ds-chart-header-gap)]">
                    <p className="m-0 text-[length:var(--ds-text-sm)] font-semibold text-[var(--ds-text-primary)]">
                      Cost distribution
                    </p>
                  </div>
                  <div className="h-72 w-full overflow-hidden rounded-[var(--ds-radius-sm)] border border-[var(--ds-chart-panel-border)] bg-[var(--ds-chart-surface)] p-[var(--ds-chart-panel-padding)]">
                    <div className="flex h-full items-center justify-center">
                      <p className="m-0 text-[length:var(--ds-text-sm)] text-[var(--ds-text-muted)]">Chart area</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Chart + KPI Block */}
              <Card className="overflow-hidden">
                <CardContent className="p-[var(--ds-chart-panel-padding)]">
                  <div className="mb-[var(--ds-chart-header-gap)]">
                    <div className="text-[length:var(--ds-text-xs)] font-medium uppercase tracking-wide text-[var(--ds-text-muted)]">
                      Net exposure
                    </div>
                    <div className="mt-1 text-[length:var(--ds-text-lg)] font-semibold tabular-nums leading-snug text-[var(--ds-text-primary)]">
                      4.2k
                    </div>
                  </div>
                  <div className="h-32 w-full overflow-hidden rounded-[var(--ds-radius-sm)] border border-[var(--ds-chart-panel-border)] bg-[var(--ds-chart-surface)] p-[var(--ds-chart-panel-padding)]">
                    <div className="flex h-full items-center justify-center">
                      <p className="m-0 text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">Chart area</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* —— Summary blocks —— */}
          <div className="space-y-4">
            <p className="m-0 text-[length:var(--ds-text-xs)] font-medium uppercase tracking-[0.06em] text-[var(--ds-text-muted)]">
              Summary blocks
            </p>
            {/* Percentile Summary Block */}
            <Card>
              <CardHeader className="border-b border-[var(--ds-border)] px-[var(--ds-dashboard-section-header-padding-x)] py-[var(--ds-dashboard-section-header-padding-y)]">
                <CardTitle className="text-[length:var(--ds-text-base)]">Percentiles</CardTitle>
              </CardHeader>
              <CardContent className="p-[var(--ds-dashboard-section-body-padding)]">
                <div className="grid grid-cols-2 gap-[var(--ds-space-3)] sm:grid-cols-3 lg:grid-cols-6">
                  {(
                    [
                      { label: "P10", value: "$1.1M" },
                      { label: "P25", value: "$1.8M" },
                      { label: "P50", value: "$2.4M" },
                      { label: "P75", value: "$3.1M" },
                      { label: "P90", value: "$3.9M" },
                      { label: "P99", value: "$5.2M" },
                    ] as const
                  ).map((cell) => (
                    <div
                      key={cell.label}
                      className="rounded-[var(--ds-radius-sm)] border border-[var(--ds-border)] bg-[var(--ds-surface-inset)] p-[var(--ds-dashboard-summary-cell-padding)]"
                    >
                      <div className="text-[length:var(--ds-text-xs)] font-medium uppercase tracking-wide text-[var(--ds-text-muted)]">
                        {cell.label}
                      </div>
                      <div className="mt-0.5 text-[length:var(--ds-text-lg)] font-semibold tabular-nums text-[var(--ds-text-primary)]">
                        {cell.value}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* —— Example cards —— */}
          <div className="space-y-4">
            <p className="m-0 text-[length:var(--ds-text-xs)] font-medium uppercase tracking-[0.06em] text-[var(--ds-text-muted)]">
              Example cards
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 xl:gap-[var(--ds-space-4)]">
              {/* A. Positive delta */}
              <DashboardTileDelta label="Funding position" value="$1.2M surplus" tone="favorable" />

              {/* B. Negative delta */}
              <DashboardTileDelta label="Schedule position" value="18 days required" tone="unfavorable" />

              {/* C. Neutral status */}
              <DashboardTileStatus label="Data confidence" value="Moderate" tone="neutral" />

              {/* D. Warning status */}
              <DashboardTileStatus label="Programme health" value="At Risk" tone="warning" />

              {/* E. KPI with helper */}
              <DashboardTileKpi
                label="Target confidence"
                value="P80"
                helperText="Approved reporting threshold"
              />

              {/* F. Narrative insight */}
              <DashboardTile>
                <p className="m-0 text-[length:var(--ds-text-xs)] font-medium uppercase tracking-wide text-[var(--ds-text-muted)]">
                  Executive readout
                </p>
                <p className="m-0 mt-2 text-[length:var(--ds-text-sm)] leading-relaxed text-[var(--ds-text-secondary)]">
                  Exposure is concentrated in two workstreams.
                </p>
                <p className="m-0 mt-1.5 text-[length:var(--ds-text-sm)] leading-relaxed text-[var(--ds-text-secondary)]">
                  Schedule risk is elevated relative to last month.
                </p>
              </DashboardTile>

              {/* G. Mini ranked list */}
              <Card className="overflow-hidden">
                <CardHeader className="border-b border-[var(--ds-border)] px-[var(--ds-dashboard-section-header-padding-x)] py-[var(--ds-dashboard-section-header-padding-y)]">
                  <CardTitle className="text-[length:var(--ds-text-base)]">Top drivers</CardTitle>
                </CardHeader>
                <CardContent className="p-[var(--ds-dashboard-section-body-padding)]">
                  <ul className="m-0 list-none space-y-2.5 p-0">
                    <li className="flex items-center gap-3 border-b border-[var(--ds-border-subtle)] pb-2.5 last:border-b-0 last:pb-0">
                      <span
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--ds-surface-muted)] text-[length:var(--ds-text-xs)] font-medium text-[var(--ds-text-secondary)]"
                        aria-hidden
                      >
                        1
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-primary)]">
                        Interface scope
                      </span>
                      <span className="shrink-0 text-[length:var(--ds-text-sm)] font-medium tabular-nums text-[var(--ds-text-primary)]">
                        $2.1M
                      </span>
                    </li>
                    <li className="flex items-center gap-3 border-b border-[var(--ds-border-subtle)] pb-2.5 last:border-b-0 last:pb-0">
                      <span
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--ds-surface-muted)] text-[length:var(--ds-text-xs)] font-medium text-[var(--ds-text-secondary)]"
                        aria-hidden
                      >
                        2
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-primary)]">
                        Third-party delivery
                      </span>
                      <span className="shrink-0 text-[length:var(--ds-text-sm)] font-medium tabular-nums text-[var(--ds-text-primary)]">
                        $1.4M
                      </span>
                    </li>
                    <li className="flex items-center gap-3">
                      <span
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--ds-surface-muted)] text-[length:var(--ds-text-xs)] font-medium text-[var(--ds-text-secondary)]"
                        aria-hidden
                      >
                        3
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-primary)]">
                        Integration testing
                      </span>
                      <span className="shrink-0 text-[length:var(--ds-text-sm)] font-medium tabular-nums text-[var(--ds-text-primary)]">
                        $0.9M
                      </span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* H. Compact table */}
              <Card className="overflow-hidden md:col-span-2 xl:col-span-3">
                <CardHeader className="border-b border-[var(--ds-border)] px-[var(--ds-dashboard-section-header-padding-x)] py-[var(--ds-dashboard-section-header-padding-y)]">
                  <CardTitle className="text-[length:var(--ds-text-base)]">Risk summary</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto p-[var(--ds-dashboard-section-body-padding)]">
                  <div className="rounded-[var(--ds-radius-sm)] border border-[var(--ds-border)] bg-[var(--ds-surface-default)]">
                    <Table className="text-[length:var(--ds-dashboard-table-compact-font-size)]">
                      <TableHead>
                        <TableRow>
                          <TableHeadCell className="py-[var(--ds-dashboard-table-compact-cell-padding-y)] px-[var(--ds-dashboard-table-compact-cell-padding-x)] text-left normal-case tracking-normal">
                            Risk
                          </TableHeadCell>
                          <TableHeadCell className="py-[var(--ds-dashboard-table-compact-cell-padding-y)] px-[var(--ds-dashboard-table-compact-cell-padding-x)] text-left normal-case tracking-normal">
                            Severity
                          </TableHeadCell>
                          <TableHeadCell className="py-[var(--ds-dashboard-table-compact-cell-padding-y)] px-[var(--ds-dashboard-table-compact-cell-padding-x)] text-right normal-case tracking-normal">
                            Exposure
                          </TableHeadCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        <TableRow>
                          <TableCell className="py-[var(--ds-dashboard-table-compact-cell-padding-y)] px-[var(--ds-dashboard-table-compact-cell-padding-x)] text-[var(--ds-text-primary)]">
                            Data migration
                          </TableCell>
                          <TableCell className="py-[var(--ds-dashboard-table-compact-cell-padding-y)] px-[var(--ds-dashboard-table-compact-cell-padding-x)] text-[var(--ds-text-secondary)]">
                            High
                          </TableCell>
                          <TableCell className="py-[var(--ds-dashboard-table-compact-cell-padding-y)] px-[var(--ds-dashboard-table-compact-cell-padding-x)] text-right font-medium tabular-nums text-[var(--ds-text-primary)]">
                            $3.2M
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="py-[var(--ds-dashboard-table-compact-cell-padding-y)] px-[var(--ds-dashboard-table-compact-cell-padding-x)] text-[var(--ds-text-primary)]">
                            Vendor delay
                          </TableCell>
                          <TableCell className="py-[var(--ds-dashboard-table-compact-cell-padding-y)] px-[var(--ds-dashboard-table-compact-cell-padding-x)] text-[var(--ds-text-secondary)]">
                            Medium
                          </TableCell>
                          <TableCell className="py-[var(--ds-dashboard-table-compact-cell-padding-y)] px-[var(--ds-dashboard-table-compact-cell-padding-x)] text-right font-medium tabular-nums text-[var(--ds-text-primary)]">
                            $1.1M
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="py-[var(--ds-dashboard-table-compact-cell-padding-y)] px-[var(--ds-dashboard-table-compact-cell-padding-x)] text-[var(--ds-text-primary)]">
                            Regulatory review
                          </TableCell>
                          <TableCell className="py-[var(--ds-dashboard-table-compact-cell-padding-y)] px-[var(--ds-dashboard-table-compact-cell-padding-x)] text-[var(--ds-text-secondary)]">
                            Low
                          </TableCell>
                          <TableCell className="py-[var(--ds-dashboard-table-compact-cell-padding-y)] px-[var(--ds-dashboard-table-compact-cell-padding-x)] text-right font-medium tabular-nums text-[var(--ds-text-primary)]">
                            $0.4M
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* —— Chart type cards —— */}
          <div className="space-y-4">
            <p className="m-0 text-[length:var(--ds-text-xs)] font-medium uppercase tracking-[0.06em] text-[var(--ds-text-muted)]">
              Chart type cards
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 xl:gap-[var(--ds-space-4)]">
              <Card className="overflow-hidden">
                <CardContent className="p-4">
                  <PieChartPrimitive
                    title="Pie"
                    data={chartShowcasePieData}
                    insight="By segment"
                    status="neutral"
                    colorMode="categorical"
                    variant="distribution"
                  />
                </CardContent>
              </Card>
              <Card className="overflow-hidden">
                <CardContent className="p-4">
                  <DonutChartPrimitive
                    title="Donut"
                    data={chartShowcasePieData}
                    insight="Focus segment"
                    status="neutral"
                    colorMode="categorical"
                    variant="distribution"
                    highlightIndex={1}
                  />
                </CardContent>
              </Card>
              <Card className="overflow-hidden">
                <CardContent className="p-4">
                  <BarChartPrimitive
                    title="Bar"
                    data={chartShowcaseBarData}
                    insight="Regions"
                    status="neutral"
                    colorMode="categorical"
                    variant="comparison"
                  />
                </CardContent>
              </Card>
              <Card className="overflow-hidden">
                <CardContent className="p-4">
                  <ColumnChartPrimitive
                    title="Column"
                    data={chartShowcaseColumnData}
                    insight="Monthly"
                    status="neutral"
                    colorMode="categorical"
                    variant="comparison"
                  />
                </CardContent>
              </Card>
              <Card className="overflow-hidden">
                <CardContent className="p-4">
                  <LineChartPrimitive
                    title="Line"
                    data={chartShowcaseLineData}
                    insight="Trend"
                    status="positive"
                    colorMode="categorical"
                    variant="comparison"
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Table primitives" description="Clean headers, consistent row borders, and compact realistic data examples.">
        <div className="space-y-4">
          <Card variant="elevated">
            <CardContent className="overflow-x-auto">
              <div className="rounded-[var(--ds-radius-sm)] border border-[var(--ds-border)] bg-[var(--ds-surface-default)]">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeadCell>Team</TableHeadCell>
                      <TableHeadCell>Owner</TableHeadCell>
                      <TableHeadCell>Status</TableHeadCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>RiskOps</TableCell>
                      <TableCell>Sarah</TableCell>
                      <TableCell>
                        <Badge status="success">Healthy</Badge>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Fraud Analytics</TableCell>
                      <TableCell>Ken</TableCell>
                      <TableCell>
                        <Badge status="warning">Watch</Badge>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Compact data example</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <div className="rounded-[var(--ds-radius-sm)] border border-[var(--ds-border)] bg-[var(--ds-surface-default)]">
                <Table className="text-[13px]">
                  <TableHead>
                    <TableRow>
                      <TableHeadCell>Rule</TableHeadCell>
                      <TableHeadCell>Events</TableHeadCell>
                      <TableHeadCell>Last run</TableHeadCell>
                      <TableHeadCell>Result</TableHeadCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>Velocity check</TableCell>
                      <TableCell>142</TableCell>
                      <TableCell>2m ago</TableCell>
                      <TableCell>
                        <Badge status="success">Pass</Badge>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Geo mismatch</TableCell>
                      <TableCell>33</TableCell>
                      <TableCell>6m ago</TableCell>
                      <TableCell>
                        <Badge status="danger">Alert</Badge>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section
        title="Status semantics"
        description="Subtle and strong status surfaces: background, foreground, and border tokens for each semantic family."
      >
        <div className="grid gap-[var(--ds-space-4)] md:grid-cols-2 xl:grid-cols-3">
          {semanticStatuses.map((status) => (
            <div
              key={status}
              className="space-y-[var(--ds-space-3)] rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] bg-[var(--ds-surface-default)] p-[var(--ds-space-4)]"
            >
              <p className="text-[length:var(--ds-text-sm)] font-semibold capitalize text-[var(--ds-text-primary)]">{status}</p>
              <div className="flex flex-col gap-[var(--ds-space-2)]">
                <div
                  className="rounded-[var(--ds-radius-sm)] px-[var(--ds-space-3)] py-[var(--ds-space-2)] text-[length:var(--ds-text-sm)]"
                  style={{
                    backgroundColor: `var(--ds-status-${status}-subtle-bg)`,
                    color: `var(--ds-status-${status}-subtle-fg)`,
                    border: `1px solid var(--ds-status-${status}-subtle-border)`,
                  }}
                >
                  Subtle
                </div>
                <div
                  className="rounded-[var(--ds-radius-sm)] px-[var(--ds-space-3)] py-[var(--ds-space-2)] text-[length:var(--ds-text-sm)]"
                  style={{
                    backgroundColor: `var(--ds-status-${status}-strong-bg)`,
                    color: `var(--ds-status-${status}-strong-fg)`,
                    border: `1px solid var(--ds-status-${status}-strong-border)`,
                  }}
                >
                  Strong
                </div>
              </div>
              <div className="space-y-[var(--ds-space-1)] font-mono text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">
                <p>{`--ds-status-${status}-subtle-bg`}</p>
                <p>{`--ds-status-${status}-subtle-fg`}</p>
                <p>{`--ds-status-${status}-subtle-border`}</p>
                <p>{`--ds-status-${status}-strong-bg`}</p>
                <p>{`--ds-status-${status}-strong-fg`}</p>
                <p>{`--ds-status-${status}-strong-border`}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Status and feedback" description="Semantic badge usage and lightweight info/warning/danger/success callouts.">
        <div className="space-y-4">
          <Card variant="elevated">
            <CardContent className="flex flex-wrap gap-2">
              <Badge status="neutral">Neutral</Badge>
              <Badge status="success">Success</Badge>
              <Badge status="warning">Warning</Badge>
              <Badge status="danger">Danger</Badge>
              <Badge status="info">Info</Badge>
              <Badge status="success" variant="strong">
                Success strong
              </Badge>
            </CardContent>
          </Card>
          <div className="grid gap-3 md:grid-cols-2">
            <Callout status="info">
              Info callout: deployment window starts in 15 minutes.
            </Callout>
            <Callout status="warning">
              Warning callout: anomaly threshold is close to limit.
            </Callout>
            <Callout status="danger">
              Error callout: failed to load latest rule execution.
            </Callout>
            <Callout status="success">
              Success callout: model update completed.
            </Callout>
          </div>
        </div>
      </Section>

      <Section title="Navigation and states" description="Lightweight tabs plus empty/loading/error state patterns."><div className="space-y-4"><Tabs><Tab active>Overview</Tab><Tab>Activity</Tab><Tab>Settings</Tab></Tabs><div className="grid gap-4 md:grid-cols-3"><Card variant="inset"><CardContent><p className="font-medium">Empty state</p><p className="mt-1 text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">No incidents yet. Connect a source to begin ingestion.</p></CardContent></Card><Card variant="inset"><CardContent><p className="font-medium">Loading state</p><div className="mt-2 space-y-2"><div className="h-2 w-5/6 animate-pulse rounded bg-[var(--ds-surface-muted)]" /><div className="h-2 w-3/4 animate-pulse rounded bg-[var(--ds-surface-muted)]" /></div></CardContent></Card><Card variant="inset"><CardContent><p className="font-medium">Error state</p><p className="mt-1 text-[length:var(--ds-text-sm)] text-[var(--ds-status-danger-fg)]">Unable to fetch rule results.</p></CardContent></Card></div></div></Section>

      <Section
        title="Risk semantics"
        description="Semantic risk levels for register surfaces: background, foreground, and border tokens."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {riskSemanticLevels.map((level) => (
            <div
              key={level.key}
              className="rounded-[var(--ds-radius-md)] border border-solid p-[var(--ds-space-4)]"
              style={{
                backgroundColor: `var(--ds-risk-${level.key}-bg)`,
                color: `var(--ds-risk-${level.key}-fg)`,
                borderColor: `var(--ds-risk-${level.key}-border)`,
              }}
            >
              <p className="text-[length:var(--ds-text-sm)] font-semibold">{level.label}</p>
              <p className="mt-3 font-mono text-[length:var(--ds-text-xs)] opacity-[0.92]">bg: --ds-risk-{level.key}-bg</p>
              <p className="mt-1 font-mono text-[length:var(--ds-text-xs)] opacity-[0.92]">text: --ds-risk-{level.key}-fg</p>
              <p className="mt-1 font-mono text-[length:var(--ds-text-xs)] opacity-[0.92]">border: --ds-risk-{level.key}-border</p>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-[var(--ds-radius-md)] border border-solid border-[var(--ds-border)] bg-[var(--ds-surface-elevated)] p-[var(--ds-space-3)]">
          <p className="text-[length:var(--ds-text-xs)] font-medium text-[var(--ds-text-primary)]">Matrix tint (low)</p>
          <div
            className="mt-2 h-[var(--ds-space-3)] w-full rounded-[var(--ds-radius-sm)]"
            style={{ backgroundColor: "var(--ds-risk-low-matrix-tint)" }}
          />
          <p className="mt-2 font-mono text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">--ds-risk-low-matrix-tint</p>
        </div>
      </Section>

      <Section
        title="Overlay, glass, and scrim"
        description="Scrim and overlay for modals, glass and auth shells for elevated surfaces, vignettes, and photo backdrops."
      >
        <div className="grid gap-[var(--ds-space-6)] lg:grid-cols-2">
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Overlay / scrim tokens</CardTitle>
            </CardHeader>
            <CardContent className="space-y-[var(--ds-space-4)]">
              <div
                className="relative overflow-hidden rounded-[var(--ds-radius-lg)] border border-[var(--ds-border)] bg-[var(--ds-surface-default)]"
              >
                <div className="p-[var(--ds-space-4)]">
                  <p className="text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-primary)]">Base surface</p>
                  <p className="mt-1 text-[length:var(--ds-text-xs)] text-[var(--ds-text-secondary)]">
                    Content sits beneath a semi-transparent overlay layer.
                  </p>
                </div>
                <div
                  className="absolute inset-0 flex items-center justify-center p-[var(--ds-space-3)]"
                  style={{ backgroundColor: "var(--ds-overlay)" }}
                >
                  <p className="text-center font-mono text-[length:var(--ds-text-xs)] text-[var(--ds-text-inverse)]">--ds-overlay</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-[var(--ds-space-3)]">
                <div
                  className="h-10 w-10 shrink-0 rounded-[var(--ds-radius-sm)] border border-[var(--ds-border)]"
                  style={{ backgroundColor: "var(--ds-scrim-ink)" }}
                  aria-hidden
                />
                <div>
                  <p className="text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-primary)]">Scrim ink</p>
                  <p className="font-mono text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">--ds-scrim-ink</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Glass / auth surface tokens</CardTitle>
            </CardHeader>
            <CardContent className="space-y-[var(--ds-space-4)]">
              <div className="grid gap-[var(--ds-space-3)] sm:grid-cols-2">
                <div
                  className="rounded-[var(--ds-radius-md)] p-[var(--ds-space-3)] backdrop-blur-[20px]"
                  style={{
                    backgroundColor: "var(--ds-surface-glass)",
                    border: "1px solid var(--ds-border-glass-shell)",
                    boxShadow: "var(--ds-shadow-glass-outer)",
                  }}
                >
                  <p className="text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-primary)]">Light glass</p>
                  <p className="mt-2 font-mono text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">
                    --ds-surface-glass · --ds-border-glass-shell · --ds-shadow-glass-outer
                  </p>
                </div>
                <div
                  className="rounded-[var(--ds-radius-md)] p-[var(--ds-space-3)] backdrop-blur-[20px]"
                  style={{
                    backgroundColor: "var(--ds-surface-glass-dark)",
                    border: "1px solid var(--ds-border-auth-shell)",
                    boxShadow: "var(--ds-shadow-auth-card)",
                  }}
                >
                  <p className="text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-primary)]">Dark glass</p>
                  <p className="mt-2 font-mono text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">
                    --ds-surface-glass-dark · --ds-border-auth-shell · --ds-shadow-auth-card
                  </p>
                </div>
              </div>
              <div>
                <p className="mb-[var(--ds-space-2)] text-[length:var(--ds-text-xs)] font-medium text-[var(--ds-text-secondary)]">
                  Modal panel shadow
                </p>
                <div
                  className="rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] bg-[var(--ds-surface-elevated)] p-[var(--ds-space-3)]"
                  style={{ boxShadow: "var(--ds-shadow-modal-panel)" }}
                >
                  <p className="font-mono text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">--ds-shadow-modal-panel</p>
                </div>
              </div>
              <div>
                <p className="mb-[var(--ds-space-2)] text-[length:var(--ds-text-xs)] font-medium text-[var(--ds-text-secondary)]">
                  Glass vignette gradients
                </p>
                <div className="grid gap-[var(--ds-space-2)] sm:grid-cols-2">
                  <div className="space-y-[var(--ds-space-1)]">
                    <div
                      className="h-[var(--ds-space-8)] w-full rounded-[var(--ds-radius-md)] border border-[var(--ds-border)]"
                      style={{ backgroundImage: "var(--ds-gradient-glass-vignette-light)" }}
                    />
                    <p className="font-mono text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">
                      --ds-gradient-glass-vignette-light
                    </p>
                  </div>
                  <div className="space-y-[var(--ds-space-1)]">
                    <div
                      className="h-[var(--ds-space-8)] w-full rounded-[var(--ds-radius-md)] border border-[var(--ds-border)]"
                      style={{ backgroundImage: "var(--ds-gradient-glass-vignette-dark)" }}
                    />
                    <p className="font-mono text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">
                      --ds-gradient-glass-vignette-dark
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <p className="mb-[var(--ds-space-2)] text-[length:var(--ds-text-xs)] font-medium text-[var(--ds-text-secondary)]">
                  Photo backdrop washes
                </p>
                <div className="flex gap-[var(--ds-space-2)]">
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div
                      className="h-[var(--ds-space-8)] w-full rounded-[var(--ds-radius-md)] border border-solid border-[var(--ds-border)]"
                      style={{ background: "var(--ds-backdrop-photo-light)" }}
                    />
                    <p className="mt-[var(--ds-space-2)] font-mono text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">
                      --ds-backdrop-photo-light
                    </p>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div
                      className="h-[var(--ds-space-8)] w-full rounded-[var(--ds-radius-md)] border border-solid border-[var(--ds-border)]"
                      style={{ background: "var(--ds-backdrop-photo-dark)" }}
                    />
                    <p className="mt-[var(--ds-space-2)] font-mono text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">
                      --ds-backdrop-photo-dark
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section
        title="Chart colours"
        description="Global CSS custom properties for categorical series, plot chrome, and insight accents. These power the Dashboard chart type cards (Pie, Donut, Bar, Column, Line) and ChartShowcase primitives."
      >
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Tokens</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {chartColorSwatches.map((item) => (
              <div
                key={item.token}
                className="grid grid-cols-[auto_1fr] items-center gap-3 rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] bg-[var(--ds-surface-elevated)] px-3 py-2 shadow-[var(--ds-shadow-sm)] dark:shadow-none"
              >
                <div className="h-8 w-8 shrink-0 rounded-[var(--ds-radius-sm)] border border-[var(--ds-border)]" style={item.style} />
                <div className="min-w-0">
                  <p className="text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-primary)]">{item.label}</p>
                  <p className="font-mono text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">{item.token}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </Section>

      <Section title="Charts" description="Shared chart defaults and semantic chart token usage."><ChartShowcase uniqueId={`${idPrefix}-charts`} /></Section>
    </div>
  );
}

export default function DesignSystemPage() {
  return <ThemePreviewShell lightContent={<DsReference idPrefix="light" />} darkContent={<DsReference idPrefix="dark" />} />;
}
