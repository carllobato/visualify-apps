import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import {
  Badge,
  Button,
  Callout,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  ChartShowcase,
  FieldError,
  HelperText,
  Input,
  Label,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
  Tabs,
  Textarea,
} from "@visualify/design-system";
import { ThemePreviewShell } from "./theme-preview-shell";

export const metadata: Metadata = {
  title: "Design System — Visualify",
  description: "Internal reference for shared Visualify styling tokens and components.",
  robots: { index: false, follow: false },
};

const colorSwatches: { token: string; label: string; style: CSSProperties }[] = [
  { token: "--ds-primary", label: "Primary", style: { backgroundColor: "var(--ds-primary)" } },
  { token: "--ds-background", label: "Background", style: { backgroundColor: "var(--ds-background)" } },
  { token: "--ds-foreground", label: "Foreground", style: { backgroundColor: "var(--ds-foreground)" } },
  { token: "--ds-muted", label: "Muted", style: { backgroundColor: "var(--ds-muted)" } },
  { token: "--ds-border", label: "Border", style: { border: "2px solid var(--ds-border)" } },
];

const semanticStatuses = ["success", "warning", "danger", "info", "neutral"] as const;
const spaceScale = ["--ds-space-1", "--ds-space-2", "--ds-space-3", "--ds-space-4", "--ds-space-6", "--ds-space-8"] as const;
const radiusScale = ["--ds-radius-sm", "--ds-radius-md", "--ds-radius-lg", "--ds-radius-xl"] as const;
const shadowScale = ["--ds-shadow-sm", "--ds-shadow-md", "--ds-shadow-lg"] as const;
const typeScale = ["--ds-text-xs", "--ds-text-sm", "--ds-text-base", "--ds-text-lg", "--ds-text-xl", "--ds-text-2xl"] as const;
const statusUseCases: Record<(typeof semanticStatuses)[number], string> = {
  success: "Confirmed or complete state",
  warning: "Requires attention, still recoverable",
  danger: "Failure or destructive outcome",
  info: "Informational/supporting context",
  neutral: "Background or non-critical state",
};
/** Slightly clearer borders/surfaces in light; dark keeps design-system tokens. */
const dsRefBorder =
  "border-[color-mix(in_oklab,var(--ds-border)_100%,var(--ds-foreground)_5%)] dark:border-[var(--ds-border)]";
const dsRefBorderStrong =
  "border-[color-mix(in_oklab,var(--ds-border)_100%,var(--ds-foreground)_6%)] dark:border-[var(--ds-border)]";
const dsRefSectionRule =
  "border-[color-mix(in_oklab,var(--ds-border)_100%,var(--ds-foreground)_4%)] dark:border-[var(--ds-border)]";
const dsRefInsetChrome =
  "rounded-[var(--ds-radius-sm)] border border-[color-mix(in_oklab,var(--ds-border)_100%,var(--ds-foreground)_4%)] bg-[var(--ds-surface-default)] dark:border-transparent dark:bg-transparent";
const dsRefCalloutLift = "shadow-[var(--ds-shadow-sm)] dark:shadow-none";

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
    title: "Inset background layer",
    surfaceToken: "--ds-surface-inset",
    textToken: "--ds-text-muted",
    surfaceClass: "bg-[var(--ds-surface-inset)]",
    textClass: "text-[var(--ds-text-muted)]",
    helperClass: "text-[var(--ds-text-muted)]",
    helper: "Use for low-priority regions and boundaries.",
  },
] as const;

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className={`border-t pt-8 first:border-t-0 first:pt-0 ${dsRefSectionRule}`}>
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
        className={`rounded-[var(--ds-radius-lg)] border bg-[var(--ds-surface-elevated)] p-6 shadow-[var(--ds-shadow-sm)] dark:shadow-none ${dsRefBorder}`}
      >
        <p className="text-[length:var(--ds-text-xs)] uppercase tracking-[0.12em] text-[var(--ds-text-muted)]">Internal reference</p>
        <h1 className="mt-2 text-[length:var(--ds-text-3xl)] font-semibold tracking-tight text-[var(--ds-text-primary)]">Visualify design system</h1>
        <p className="mt-2 max-w-2xl text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
          Shared foundation from <code>@visualify/design-system</code>, reviewed in {idPrefix} mode.
        </p>
      </header>

      <Section title="Foundations" description="Semantic status, text, surface, spacing, radius, shadow, and typography scales.">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card variant="elevated" className={dsRefBorder}>
            <CardHeader>
              <CardTitle>Core tokens</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {colorSwatches.map((item) => (
                <div
                  key={item.token}
                  className={`grid grid-cols-[auto_1fr] items-center gap-3 rounded-[var(--ds-radius-md)] border px-3 py-2 shadow-[var(--ds-shadow-sm)] dark:bg-[color-mix(in_oklab,var(--ds-surface-default)_95%,var(--ds-surface-elevated))] dark:shadow-none ${dsRefBorder} bg-[var(--ds-surface-elevated)]`}
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
          <Card variant="elevated" className={dsRefBorder}>
            <CardHeader>
              <CardTitle>Status tokens</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {semanticStatuses.map((status) => (
                <div
                  key={status}
                  className={`rounded-[var(--ds-radius-md)] border bg-[var(--ds-surface-default)] p-3 ${dsRefBorder}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded-full border border-[var(--ds-border)]" style={{ backgroundColor: `var(--ds-status-${status})` }} />
                      <p className="text-[length:var(--ds-text-sm)] font-medium capitalize text-[var(--ds-text-primary)]">{status}</p>
                    </div>
                    <p className="font-mono text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">{`--ds-status-${status}`}</p>
                  </div>
                  <div className={`mt-2 flex flex-wrap items-center justify-between gap-2 border-t pt-2 ${dsRefSectionRule}`}>
                    <p className="text-[length:var(--ds-text-xs)] text-[var(--ds-text-secondary)]">{statusUseCases[status]}</p>
                    <Badge status={status}>{status}</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card variant="elevated" className={dsRefBorder}>
            <CardHeader>
              <CardTitle>Surface + text tokens</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {surfaceTextPatterns.map((pattern) => (
                <div
                  key={pattern.surfaceToken}
                  className={`rounded-[var(--ds-radius-md)] border p-3 ${dsRefBorder} ${pattern.surfaceClass}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={`text-[length:var(--ds-text-sm)] font-medium ${pattern.textClass}`}>{pattern.title}</p>
                      <p className={`mt-1 text-[length:var(--ds-text-xs)] ${pattern.helperClass}`}>{pattern.helper}</p>
                    </div>
                    <Button size="sm" variant="secondary">Action</Button>
                  </div>
                  <div className={`mt-3 rounded-[var(--ds-radius-sm)] border bg-[var(--ds-surface-elevated)] p-2 ${dsRefBorder}`}>
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
          <Card variant="elevated" className={dsRefBorder}>
            <CardHeader>
              <CardTitle>Scales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-primary)]">Spacing</p>
                {spaceScale.map((token) => (
                  <div key={token} className="grid grid-cols-[120px_1fr] items-center gap-3">
                    <p className="font-mono text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">{token}</p>
                    <div className="h-2 rounded-full border border-[color-mix(in_oklab,var(--ds-border)_100%,var(--ds-foreground)_3%)] bg-[var(--ds-surface-muted)] dark:border-transparent">
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
                          className={`h-9 w-9 border bg-[var(--ds-surface-muted)] ${dsRefBorder}`}
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
                        className={`flex items-center justify-between rounded-[var(--ds-radius-md)] border bg-[var(--ds-surface-elevated)] px-3 py-2 ${dsRefBorder}`}
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
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section title="Buttons" description="Primary, secondary, ghost variants, size support, icons, and disabled states."><Card variant="elevated"><CardContent className="space-y-4"><div className="flex flex-wrap gap-2"><Button>Primary</Button><Button variant="secondary">Secondary</Button><Button variant="ghost">Ghost</Button></div><div className="flex flex-wrap items-center gap-2"><Button size="sm">Small</Button><Button size="md">Medium</Button><Button size="lg">Large</Button></div><div className="flex flex-wrap gap-2"><Button leftIcon="+" rightIcon="→">Create report</Button><Button variant="secondary" disabled>Disabled secondary</Button><Button variant="ghost" disabled>Disabled ghost</Button></div></CardContent></Card></Section>

      <Section title="Form primitives" description="Input/Textarea states with Label, HelperText, and FieldError patterns."><div className="grid gap-4 md:grid-cols-2"><Card variant="elevated"><CardContent className="space-y-4"><div><Label htmlFor={`${idPrefix}-email`}>Email</Label><Input id={`${idPrefix}-email`} placeholder="jane@visualify.ai" /><HelperText>Used for report notifications.</HelperText></div><div><Label htmlFor={`${idPrefix}-name-invalid`}>Workspace name</Label><Input id={`${idPrefix}-name-invalid`} aria-invalid="true" defaultValue="!" /><FieldError>Name must be at least 3 characters.</FieldError></div><div><Label htmlFor={`${idPrefix}-disabled-input`}>Disabled input</Label><Input id={`${idPrefix}-disabled-input`} disabled defaultValue="Readonly value" /></div></CardContent></Card><Card variant="elevated"><CardContent className="space-y-4"><div><Label htmlFor={`${idPrefix}-notes`}>Notes</Label><Textarea id={`${idPrefix}-notes`} placeholder="Write team notes..." /><HelperText>Multiline field with muted placeholder text.</HelperText></div><div><Label htmlFor={`${idPrefix}-error-textarea`}>Issue details</Label><Textarea id={`${idPrefix}-error-textarea`} aria-invalid defaultValue="broken" /><FieldError>Please include at least 20 characters.</FieldError></div></CardContent></Card></div></Section>

      <Section
        title="Cards and panels"
        description="Default card, elevated card, inset panel, and CardHeader/CardContent/CardFooter structure at multiple widths."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <Card variant="default" className={dsRefBorder}>
            <CardContent>Default card on base surface.</CardContent>
          </Card>
          <Card variant="elevated" className={dsRefBorder}>
            <CardContent>Elevated card with subtle shadow.</CardContent>
          </Card>
          <Card variant="inset" className={dsRefBorder}>
            <CardContent>Inset panel for grouped context.</CardContent>
          </Card>
        </div>
        <div className="mt-4 space-y-4">
          <Card variant="elevated" className={`w-full ${dsRefBorder}`}>
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
            <Card variant="elevated" className={`w-full max-w-xs shrink-0 ${dsRefBorder}`}>
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
            <Card variant="elevated" className={`w-full max-w-md ${dsRefBorder}`}>
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
          <Card variant="elevated" className={`mx-auto w-full max-w-2xl ${dsRefBorder}`}>
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

      <Section title="Table primitives" description="Clean headers, consistent row borders, and compact realistic data examples.">
        <div className="space-y-4">
          <Card variant="elevated" className={dsRefBorder}>
            <CardContent className="overflow-x-auto">
              <div className={dsRefInsetChrome}>
                <Table>
                  <TableHead className={dsRefBorderStrong}>
                    <TableRow>
                      <TableHeadCell>Team</TableHeadCell>
                      <TableHeadCell>Owner</TableHeadCell>
                      <TableHeadCell>Status</TableHeadCell>
                    </TableRow>
                  </TableHead>
                  <TableBody className="[&>tr]:!border-[color-mix(in_oklab,var(--ds-border)_88%,transparent)] dark:[&>tr]:!border-[color-mix(in_oklab,var(--ds-border)_70%,transparent)]">
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
          <Card variant="elevated" className={dsRefBorder}>
            <CardHeader>
              <CardTitle>Compact data example</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <div className={dsRefInsetChrome}>
                <Table className="text-[13px]">
                  <TableHead className={dsRefBorderStrong}>
                    <TableRow>
                      <TableHeadCell>Rule</TableHeadCell>
                      <TableHeadCell>Events</TableHeadCell>
                      <TableHeadCell>Last run</TableHeadCell>
                      <TableHeadCell>Result</TableHeadCell>
                    </TableRow>
                  </TableHead>
                  <TableBody className="[&>tr]:!border-[color-mix(in_oklab,var(--ds-border)_88%,transparent)] dark:[&>tr]:!border-[color-mix(in_oklab,var(--ds-border)_70%,transparent)]">
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

      <Section title="Status and feedback" description="Semantic badge usage and lightweight info/warning/danger/success callouts.">
        <div className="space-y-4">
          <Card variant="elevated" className={dsRefBorder}>
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
            <Callout status="info" className={dsRefCalloutLift}>
              Info callout: deployment window starts in 15 minutes.
            </Callout>
            <Callout status="warning" className={dsRefCalloutLift}>
              Warning callout: anomaly threshold is close to limit.
            </Callout>
            <Callout status="danger" className={dsRefCalloutLift}>
              Error callout: failed to load latest rule execution.
            </Callout>
            <Callout status="success" className={dsRefCalloutLift}>
              Success callout: model update completed.
            </Callout>
          </div>
        </div>
      </Section>

      <Section title="Navigation and states" description="Lightweight tabs plus empty/loading/error state patterns."><div className="space-y-4"><Tabs><Tab active>Overview</Tab><Tab>Activity</Tab><Tab>Settings</Tab></Tabs><div className="grid gap-4 md:grid-cols-3"><Card variant="inset"><CardContent><p className="font-medium">Empty state</p><p className="mt-1 text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">No incidents yet. Connect a source to begin ingestion.</p></CardContent></Card><Card variant="inset"><CardContent><p className="font-medium">Loading state</p><div className="mt-2 space-y-2"><div className="h-2 w-5/6 animate-pulse rounded bg-[var(--ds-surface-muted)]" /><div className="h-2 w-3/4 animate-pulse rounded bg-[var(--ds-surface-muted)]" /></div></CardContent></Card><Card variant="inset"><CardContent><p className="font-medium">Error state</p><p className="mt-1 text-[length:var(--ds-text-sm)] text-[var(--ds-status-danger-fg)]">Unable to fetch rule results.</p></CardContent></Card></div></div></Section>

      <Section title="Charts" description="Shared chart defaults and semantic chart token usage."><ChartShowcase uniqueId={`${idPrefix}-charts`} /></Section>
    </div>
  );
}

export default function DesignSystemPage() {
  return <ThemePreviewShell lightContent={<DsReference idPrefix="light" />} darkContent={<DsReference idPrefix="dark" />} />;
}
