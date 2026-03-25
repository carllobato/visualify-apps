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
      <header className="rounded-[var(--ds-radius-lg)] border border-[var(--ds-border)] bg-[var(--ds-surface-elevated)] p-6">
        <p className="text-[length:var(--ds-text-xs)] uppercase tracking-[0.12em] text-[var(--ds-text-muted)]">Internal reference</p>
        <h1 className="mt-2 text-[length:var(--ds-text-3xl)] font-semibold tracking-tight text-[var(--ds-text-primary)]">Visualify design system</h1>
        <p className="mt-2 max-w-2xl text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
          Shared foundation from <code>@visualify/design-system</code>, reviewed in {idPrefix} mode.
        </p>
      </header>

      <Section title="Foundations" description="Semantic status, text, surface, spacing, radius, shadow, and typography scales.">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card variant="elevated"><CardHeader><CardTitle>Core tokens</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">{colorSwatches.map((item) => (<div key={item.token} className="rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] p-2"><div className="h-10 rounded-[var(--ds-radius-sm)] bg-[var(--ds-surface-default)]" style={item.style} /><p className="mt-2 text-[length:var(--ds-text-sm)] font-medium">{item.label}</p><p className="font-mono text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">{item.token}</p></div>))}</CardContent></Card>
          <Card variant="elevated"><CardHeader><CardTitle>Status tokens</CardTitle></CardHeader><CardContent className="space-y-2">{semanticStatuses.map((status) => (<div key={status} className="flex items-center justify-between rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] p-3"><p className="text-[length:var(--ds-text-sm)] font-medium capitalize">{status}</p><div className="flex items-center gap-2"><div className="h-5 w-5 rounded-full" style={{ backgroundColor: `var(--ds-status-${status})` }} /><Badge status={status}>{status}</Badge></div></div>))}</CardContent></Card>
          <Card variant="elevated"><CardHeader><CardTitle>Surface + text tokens</CardTitle></CardHeader><CardContent className="grid gap-2"><div className="rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] bg-[var(--ds-surface-default)] p-3 text-[var(--ds-text-primary)]">`--ds-surface-default` + `--ds-text-primary`</div><div className="rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] p-3 text-[var(--ds-text-secondary)]">`--ds-surface-muted` + `--ds-text-secondary`</div><div className="rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] bg-[var(--ds-surface-inset)] p-3 text-[var(--ds-text-muted)]">`--ds-surface-inset` + `--ds-text-muted`</div></CardContent></Card>
          <Card variant="elevated"><CardHeader><CardTitle>Scales</CardTitle></CardHeader><CardContent className="space-y-4"><div className="space-y-2"><p className="text-[length:var(--ds-text-sm)] font-medium">Spacing</p>{spaceScale.map((token) => (<div key={token} className="flex items-center gap-3"><div className="h-2 rounded-full bg-[var(--ds-primary)]" style={{ width: `var(${token})` }} /><p className="font-mono text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">{token}</p></div>))}</div><div className="flex flex-wrap gap-3">{radiusScale.map((token) => (<div key={token} className="text-center"><div className="h-10 w-10 border border-[var(--ds-border)] bg-[var(--ds-surface-muted)]" style={{ borderRadius: `var(${token})` }} /><p className="mt-1 font-mono text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">{token}</p></div>))}</div><div className="grid gap-2">{shadowScale.map((token) => (<div key={token} className="rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] bg-[var(--ds-surface-elevated)] p-3" style={{ boxShadow: `var(${token})` }}><p className="font-mono text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">{token}</p></div>))}</div><div className="space-y-1">{typeScale.map((token) => (<p key={token} style={{ fontSize: `var(${token})` }} className="text-[var(--ds-text-primary)]">{token} - The quick brown fox</p>))}</div></CardContent></Card>
        </div>
      </Section>

      <Section title="Buttons" description="Primary, secondary, ghost variants, size support, icons, and disabled states."><Card variant="elevated"><CardContent className="space-y-4"><div className="flex flex-wrap gap-2"><Button>Primary</Button><Button variant="secondary">Secondary</Button><Button variant="ghost">Ghost</Button></div><div className="flex flex-wrap items-center gap-2"><Button size="sm">Small</Button><Button size="md">Medium</Button><Button size="lg">Large</Button></div><div className="flex flex-wrap gap-2"><Button leftIcon="+" rightIcon="→">Create report</Button><Button variant="secondary" disabled>Disabled secondary</Button><Button variant="ghost" disabled>Disabled ghost</Button></div></CardContent></Card></Section>

      <Section title="Form primitives" description="Input/Textarea states with Label, HelperText, and FieldError patterns."><div className="grid gap-4 md:grid-cols-2"><Card variant="elevated"><CardContent className="space-y-4"><div><Label htmlFor={`${idPrefix}-email`}>Email</Label><Input id={`${idPrefix}-email`} placeholder="jane@visualify.ai" /><HelperText>Used for report notifications.</HelperText></div><div><Label htmlFor={`${idPrefix}-name-invalid`}>Workspace name</Label><Input id={`${idPrefix}-name-invalid`} aria-invalid="true" defaultValue="!" /><FieldError>Name must be at least 3 characters.</FieldError></div><div><Label htmlFor={`${idPrefix}-disabled-input`}>Disabled input</Label><Input id={`${idPrefix}-disabled-input`} disabled defaultValue="Readonly value" /></div></CardContent></Card><Card variant="elevated"><CardContent className="space-y-4"><div><Label htmlFor={`${idPrefix}-notes`}>Notes</Label><Textarea id={`${idPrefix}-notes`} placeholder="Write team notes..." /><HelperText>Multiline field with muted placeholder text.</HelperText></div><div><Label htmlFor={`${idPrefix}-error-textarea`}>Issue details</Label><Textarea id={`${idPrefix}-error-textarea`} aria-invalid defaultValue="broken" /><FieldError>Please include at least 20 characters.</FieldError></div></CardContent></Card></div></Section>

      <Section title="Cards and panels" description="Default card, elevated card, inset panel, and CardHeader/CardContent/CardFooter structure."><div className="grid gap-4 lg:grid-cols-3"><Card variant="default"><CardContent>Default card on base surface.</CardContent></Card><Card variant="elevated"><CardContent>Elevated card with subtle shadow.</CardContent></Card><Card variant="inset"><CardContent>Inset panel for grouped context.</CardContent></Card></div><Card variant="elevated" className="mt-4"><CardHeader><CardTitle>CardHeader</CardTitle></CardHeader><CardContent><p className="text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">CardContent area for main details.</p></CardContent><CardFooter className="flex justify-end"><Button variant="secondary" size="sm">Cancel</Button></CardFooter></Card></Section>

      <Section title="Table primitives" description="Clean headers, consistent row borders, and compact realistic data examples."><div className="space-y-4"><Card variant="elevated"><CardContent className="overflow-x-auto"><Table><TableHead><TableRow><TableHeadCell>Team</TableHeadCell><TableHeadCell>Owner</TableHeadCell><TableHeadCell>Status</TableHeadCell></TableRow></TableHead><TableBody><TableRow><TableCell>RiskOps</TableCell><TableCell>Sarah</TableCell><TableCell><Badge status="success">Healthy</Badge></TableCell></TableRow><TableRow><TableCell>Fraud Analytics</TableCell><TableCell>Ken</TableCell><TableCell><Badge status="warning">Watch</Badge></TableCell></TableRow></TableBody></Table></CardContent></Card><Card variant="elevated"><CardHeader><CardTitle>Compact data example</CardTitle></CardHeader><CardContent className="overflow-x-auto"><Table className="text-[13px]"><TableHead><TableRow><TableHeadCell>Rule</TableHeadCell><TableHeadCell>Events</TableHeadCell><TableHeadCell>Last run</TableHeadCell><TableHeadCell>Result</TableHeadCell></TableRow></TableHead><TableBody><TableRow><TableCell>Velocity check</TableCell><TableCell>142</TableCell><TableCell>2m ago</TableCell><TableCell><Badge status="success">Pass</Badge></TableCell></TableRow><TableRow><TableCell>Geo mismatch</TableCell><TableCell>33</TableCell><TableCell>6m ago</TableCell><TableCell><Badge status="danger">Alert</Badge></TableCell></TableRow></TableBody></Table></CardContent></Card></div></Section>

      <Section title="Status and feedback" description="Semantic badge usage and lightweight info/warning/danger/success callouts."><div className="space-y-4"><Card variant="elevated"><CardContent className="flex flex-wrap gap-2"><Badge status="neutral">Neutral</Badge><Badge status="success">Success</Badge><Badge status="warning">Warning</Badge><Badge status="danger">Danger</Badge><Badge status="info">Info</Badge><Badge status="success" variant="strong">Success strong</Badge></CardContent></Card><div className="grid gap-3 md:grid-cols-2"><Callout status="info">Info callout: deployment window starts in 15 minutes.</Callout><Callout status="warning">Warning callout: anomaly threshold is close to limit.</Callout><Callout status="danger">Error callout: failed to load latest rule execution.</Callout><Callout status="success">Success callout: model update completed.</Callout></div></div></Section>

      <Section title="Navigation and states" description="Lightweight tabs plus empty/loading/error state patterns."><div className="space-y-4"><Tabs><Tab active>Overview</Tab><Tab>Activity</Tab><Tab>Settings</Tab></Tabs><div className="grid gap-4 md:grid-cols-3"><Card variant="inset"><CardContent><p className="font-medium">Empty state</p><p className="mt-1 text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">No incidents yet. Connect a source to begin ingestion.</p></CardContent></Card><Card variant="inset"><CardContent><p className="font-medium">Loading state</p><div className="mt-2 space-y-2"><div className="h-2 w-5/6 animate-pulse rounded bg-[var(--ds-surface-muted)]" /><div className="h-2 w-3/4 animate-pulse rounded bg-[var(--ds-surface-muted)]" /></div></CardContent></Card><Card variant="inset"><CardContent><p className="font-medium">Error state</p><p className="mt-1 text-[length:var(--ds-text-sm)] text-[var(--ds-status-danger-fg)]">Unable to fetch rule results.</p></CardContent></Card></div></div></Section>

      <Section title="Charts" description="Shared chart defaults and semantic chart token usage."><ChartShowcase uniqueId={`${idPrefix}-charts`} /></Section>
    </div>
  );
}

export default function DesignSystemPage() {
  return <ThemePreviewShell lightContent={<DsReference idPrefix="light" />} darkContent={<DsReference idPrefix="dark" />} />;
}
