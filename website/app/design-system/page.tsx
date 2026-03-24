import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import { Button, Card } from "@visualify/design-system";
import { ChartShowcase } from "@visualify/design-system";

export const metadata: Metadata = {
  title: "Design System — Visualify",
  description: "Internal reference for shared Visualify styling tokens and components.",
  robots: { index: false, follow: false },
};

const colorSwatches: {
  token: string;
  label: string;
  style?: CSSProperties;
  /** Full-width row; leads the palette without extra chrome */
  featured?: boolean;
}[] = [
  { token: "--ds-primary", label: "Primary", style: { backgroundColor: "var(--ds-primary)" }, featured: true },
  { token: "--ds-background", label: "Background", style: { backgroundColor: "var(--ds-background)" } },
  { token: "--ds-foreground", label: "Foreground", style: { backgroundColor: "var(--ds-foreground)" } },
  {
    token: "--ds-muted",
    label: "Muted surface",
    style: { backgroundColor: "var(--ds-muted)" },
  },
  {
    token: "--ds-border",
    label: "Border",
    style: {
      backgroundColor: "var(--ds-muted)",
      borderWidth: 2,
      borderStyle: "solid",
      borderColor: "var(--ds-border)",
    },
  },
  { token: "--ds-success", label: "Success", style: { backgroundColor: "var(--ds-success)" } },
  { token: "--ds-warning", label: "Warning", style: { backgroundColor: "var(--ds-warning)" } },
  { token: "--ds-danger", label: "Danger", style: { backgroundColor: "var(--ds-danger)" } },
];

const spaceSteps = [
  { token: "--ds-space-1", name: "space-1" },
  { token: "--ds-space-2", name: "space-2" },
  { token: "--ds-space-3", name: "space-3" },
  { token: "--ds-space-4", name: "space-4" },
  { token: "--ds-space-6", name: "space-6" },
  { token: "--ds-space-8", name: "space-8" },
  { token: "--ds-space-12", name: "space-12" },
] as const;

const principles = [
  {
    title: "Consistency",
    body: "Reach for tokens and shared components before inventing one-off styles.",
  },
  {
    title: "Restraint",
    body: "Favor quiet surfaces and a single strong accent; avoid competing focal points.",
  },
  {
    title: "Reuse",
    body: "Extend patterns from this package so web and apps stay visually aligned.",
  },
] as const;

// Showcase overrides (Tailwind `!` beats package Button defaults without tailwind-merge).
const demoBtnBase =
  "!h-9 !min-h-9 shrink-0 items-center justify-center !rounded-[var(--ds-radius-md)] !px-4 !py-0 text-sm font-medium " +
  "transition-[filter,background-color,border-color,color,box-shadow,opacity] duration-150 ease-out " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-primary)]";

const demoBtnPrimary =
  `${demoBtnBase} ` +
  "!bg-[var(--ds-primary)] !text-white shadow-[var(--ds-shadow-sm)] hover:brightness-[1.07] active:brightness-[0.97] " +
  "disabled:pointer-events-none disabled:!opacity-[0.38] disabled:shadow-none disabled:hover:brightness-100";

const demoBtnSecondary =
  `${demoBtnBase} ` +
  "!border !border-[var(--ds-border)] !bg-transparent !text-[var(--ds-muted-foreground)] " +
  "hover:!bg-[var(--ds-muted)] hover:!text-[var(--ds-foreground)] " +
  "disabled:pointer-events-none disabled:!opacity-[0.38]";

const demoBtnGhost =
  `${demoBtnBase} ` +
  "!border-none !bg-transparent !shadow-none !text-[var(--ds-muted-foreground)] " +
  "hover:!bg-[color-mix(in_oklab,var(--ds-muted)_52%,transparent)] hover:!text-[var(--ds-foreground)] " +
  "disabled:pointer-events-none disabled:!opacity-[0.38]";

/** Static snapshots of the hover visuals (same tokens as interactive hover above). */
const demoBtnPrimaryHoverShown =
  `${demoBtnBase} ` +
  "!bg-[var(--ds-primary)] !text-white shadow-[var(--ds-shadow-sm)] brightness-[1.07]";
const demoBtnSecondaryHoverShown =
  `${demoBtnBase} ` +
  "!border !border-[var(--ds-border)] !bg-[var(--ds-muted)] !text-[var(--ds-foreground)]";
const demoBtnGhostHoverShown =
  `${demoBtnBase} ` +
  "!border-none !shadow-none !text-[var(--ds-foreground)] !bg-[color-mix(in_oklab,var(--ds-muted)_52%,transparent)]";

function ThemePaneLabel({ label }: { label: string }) {
  return (
    <div className="mb-6 flex items-center gap-2.5 md:mb-7">
      <span className="shrink-0 whitespace-nowrap text-xs font-medium uppercase tracking-[0.14em] text-[var(--ds-muted-foreground)] opacity-[0.5]">
        {label}
      </span>
      <span
        className="h-px min-w-8 flex-1 bg-[color-mix(in_oklab,var(--ds-border)_55%,transparent)]"
        aria-hidden
      />
    </div>
  );
}

function Section({
  sectionId,
  title,
  description,
  children,
}: {
  sectionId: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section
      id={sectionId}
      className="scroll-mt-20 border-t border-[var(--ds-border)] pt-10 first:border-t-0 first:pt-0"
    >
      <header className="mb-7">
        <h2 className="ds-section-title text-[var(--ds-foreground)]">{title}</h2>
        <p className="ds-section-copy">{description}</p>
      </header>
      {children}
    </section>
  );
}

function DesignSystemContent({ idPrefix }: { idPrefix: "light" | "dark" }) {
  const sid = (key: string) => `${idPrefix}-${key}`;
  const isDarkPane = idPrefix === "dark";
  const heroShellClass = [
    "mx-auto mb-12 w-full max-w-[560px] rounded-2xl px-4 py-5 md:mb-16 md:px-5 md:py-6",
    isDarkPane
      ? "bg-[color-mix(in_oklab,var(--ds-muted)_14%,var(--ds-background))]"
      : "bg-[color-mix(in_oklab,var(--ds-muted)_26%,var(--ds-background))]",
  ].join(" ");
  const heroTitleClass = [
    "text-[34px] font-semibold leading-[1.02] tracking-[-0.025em] text-[var(--ds-foreground)] md:text-[40px] md:leading-[1.04]",
    isDarkPane
      ? "[color:color-mix(in_oklab,var(--ds-foreground)_93%,white)]"
      : "[color:color-mix(in_oklab,var(--ds-foreground)_96%,black)]",
  ].join(" ");
  const heroSubtitleClass = [
    "mt-2.5 max-w-[50ch] text-[14px] leading-[1.62] md:mt-3 md:text-[15px] md:leading-[1.6]",
    isDarkPane
      ? "text-[color-mix(in_oklab,var(--ds-foreground)_54%,white)] opacity-[0.72]"
      : "text-[var(--ds-muted-foreground)] opacity-[0.62]",
  ].join(" ");
  const heroCodeClass = [
    "relative top-px inline-block align-baseline rounded-[var(--ds-radius-sm)] border border-[var(--ds-border)]/45",
    "bg-[color-mix(in_oklab,var(--ds-muted)_78%,var(--ds-background))] px-[0.4rem] py-[0.15rem] font-mono text-[11px] font-medium tracking-[-0.015em]",
    "text-[color-mix(in_oklab,var(--ds-foreground)_88%,var(--ds-muted-foreground))] sm:text-[12px]",
  ].join(" ");

  const cardShowcaseInteractive =
    "transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-[2px] motion-reduce:transform-none motion-reduce:transition-none";
  const cardShowcaseSurface = isDarkPane
    ? "!border !border-[color-mix(in_oklab,var(--ds-border)_28%,transparent)] ![background:linear-gradient(168deg,color-mix(in_oklab,var(--ds-card)_82%,white_5%)_0%,color-mix(in_oklab,var(--ds-card)_48%,var(--ds-muted))_52%,color-mix(in_oklab,var(--ds-muted)_42%,var(--ds-card))_100%)]"
    : "!border-0 !bg-white";
  const cardShowcaseSurfaceMetric = isDarkPane
    ? "!border !border-[color-mix(in_oklab,var(--ds-border)_34%,transparent)] ![background:linear-gradient(162deg,color-mix(in_oklab,var(--ds-card)_88%,white_7%)_0%,color-mix(in_oklab,var(--ds-card)_44%,var(--ds-muted))_48%,color-mix(in_oklab,var(--ds-muted)_48%,var(--ds-card))_100%)]"
    : "!border-0 !bg-white";
  const cardShowcaseShadowDefault = isDarkPane
    ? "!shadow-[var(--ds-shadow-sm)] hover:!shadow-[var(--ds-shadow-md)]"
    : "!shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_32px_-14px_rgba(15,23,42,0.065)] hover:!shadow-[0_2px_5px_rgba(15,23,42,0.055),0_18px_48px_-14px_rgba(15,23,42,0.1)]";
  const cardShowcaseShadowMetric = isDarkPane
    ? "!shadow-[var(--ds-shadow-md)] hover:!shadow-[var(--ds-shadow-lg)]"
    : "!shadow-[var(--ds-shadow-md)] hover:!shadow-[var(--ds-shadow-lg)]";

  /**
   * Radius previews: same token + border recipe in both themes — --ds-muted / --ds-border already
   * resolve per theme, so we avoid a dark-only fill that made swatches unlike light.
   * Slightly stronger border in dark-only keeps corners legible on ds-card.
   */
  const radiusPreviewSurface = isDarkPane
    ? "border border-[color-mix(in_oklab,var(--ds-border)_48%,transparent)] bg-[var(--ds-muted)]"
    : "border border-[color-mix(in_oklab,var(--ds-border)_38%,transparent)] bg-[var(--ds-muted)]";

  /**
   * Tray behind shadow strips: one mix ratio for light and dark — tokens supply the colors,
   * so the “muted strip inside the card” relationship matches across themes (dark had used 26%
   * muted and read nearly flat vs page).
   */
  const shadowDemoTrayClass =
    "rounded-[var(--ds-radius-md)] bg-[color-mix(in_oklab,var(--ds-muted)_52%,var(--ds-background))] p-4 ring-1 ring-inset ring-[color-mix(in_oklab,var(--ds-border)_22%,transparent)] sm:p-5";

  const shadowLevelHints: Record<"Small" | "Medium" | "Large", string> = {
    Small: "Subtle lift (cards)",
    Medium: "Standard surface",
    Large: "Overlay / modal",
  };

  return (
    <>
      <header className={heroShellClass}>
        <p className="mb-2 text-xs tracking-[0.02em] text-[var(--ds-muted-foreground)] opacity-[0.48]">
          Design system{" "}
          <span className="mx-1 text-[0.65em] opacity-[0.45]" aria-hidden>
            •
          </span>{" "}
          Internal
        </p>
        <h1 className={heroTitleClass}>Design System</h1>
        <p className={heroSubtitleClass}>
          Shared Visualify foundation—tokens, surfaces, and components from{" "}
          <code className={heroCodeClass}>@visualify/design-system</code>.
        </p>
      </header>

      <div className="flex flex-col gap-14 sm:gap-16">
        <Section
          sectionId={sid("colors")}
          title="Colors"
          description="Semantic tokens from the package. This column shows how they read in the active context."
        >
          <ul className="grid grid-cols-2 gap-x-4 gap-y-7 sm:gap-x-5 sm:gap-y-8">
            {colorSwatches.map(({ token, label, style, featured }) => (
              <li key={token} className={featured ? "col-span-2" : undefined}>
                <div
                  className={`mb-1.5 w-full rounded-[var(--ds-radius-md)] shadow-[var(--ds-shadow-sm)] ${
                    featured ? "aspect-[10/1]" : "aspect-[5/1]"
                  }`}
                  style={style}
                />
                <p className="text-[length:var(--ds-text-sm)] font-semibold tracking-[-0.01em] text-[var(--ds-foreground)]">
                  {label}
                </p>
                <p className="mt-px font-mono text-[11px] leading-tight tracking-tight text-[var(--ds-muted-foreground)] opacity-[0.72]">
                  {token}
                </p>
              </li>
            ))}
          </ul>
        </Section>

        <Section
          sectionId={sid("typography")}
          title="Typography"
          description="Type scale from design tokens. Tight tracking on headings; calm body copy."
        >
          <Card className="space-y-6 p-6 sm:p-8">
            <div>
              <p className="mb-1.5 font-mono text-[length:var(--ds-text-xs)] text-[var(--ds-muted-foreground)]">
                Heading 1 · var(--ds-text-3xl)
              </p>
              <p
                className="font-semibold tracking-tight text-[var(--ds-card-foreground)]"
                style={{ fontSize: "var(--ds-text-3xl)", lineHeight: 1.15 }}
              >
                Calm interfaces, clear structure
              </p>
            </div>
            <div>
              <p className="mb-1.5 font-mono text-[length:var(--ds-text-xs)] text-[var(--ds-muted-foreground)]">
                Heading 2 · var(--ds-text-2xl)
              </p>
              <h3
                className="font-semibold tracking-tight text-[var(--ds-card-foreground)]"
                style={{ fontSize: "var(--ds-text-2xl)", lineHeight: 1.2 }}
              >
                Section rhythm
              </h3>
            </div>
            <div>
              <p className="mb-1.5 font-mono text-[length:var(--ds-text-xs)] text-[var(--ds-muted-foreground)]">
                Heading 3 · var(--ds-text-xl)
              </p>
              <h4
                className="font-semibold text-[var(--ds-card-foreground)]"
                style={{ fontSize: "var(--ds-text-xl)", lineHeight: 1.3 }}
              >
                Supporting titles
              </h4>
            </div>
            <div>
              <p className="mb-1.5 font-mono text-[length:var(--ds-text-xs)] text-[var(--ds-muted-foreground)]">
                Body · var(--ds-text-base)
              </p>
              <p className="text-[length:var(--ds-text-base)] leading-relaxed text-[var(--ds-card-foreground)]">
                Typography stays understated so content and actions remain the focus.
              </p>
            </div>
            <div>
              <p className="mb-1.5 font-mono text-[length:var(--ds-text-xs)] text-[var(--ds-muted-foreground)]">
                Small · var(--ds-text-sm)
              </p>
              <p className="text-[length:var(--ds-text-sm)] leading-relaxed text-[var(--ds-muted-foreground)]">
                Secondary descriptions, helper text, and compact UI labels.
              </p>
            </div>
            <div>
              <p className="mb-1.5 font-mono text-[length:var(--ds-text-xs)] text-[var(--ds-muted-foreground)]">
                Caption · var(--ds-text-xs)
              </p>
              <p className="text-[length:var(--ds-text-xs)] uppercase tracking-wider text-[var(--ds-muted-foreground)]">
                Meta · timestamps · table headers
              </p>
            </div>
          </Card>
        </Section>

        <Section
          sectionId={sid("buttons")}
          title="Buttons"
          description="Primary, secondary, and ghost variants from the shared Button component."
        >
          <div className="flex flex-col gap-8">
            <div>
              <p className="mb-3.5 text-[length:var(--ds-text-xs)] font-medium uppercase tracking-[0.12em] text-[var(--ds-muted-foreground)] opacity-[0.65]">
                Default
              </p>
              <div className="flex flex-wrap items-center gap-3.5">
                <Button variant="primary" className={demoBtnPrimary}>
                  Primary
                </Button>
                <Button variant="secondary" className={demoBtnSecondary}>
                  Secondary
                </Button>
                <Button variant="ghost" className={demoBtnGhost}>
                  Ghost
                </Button>
              </div>
              <p className="mb-3.5 mt-6 text-[length:var(--ds-text-xs)] font-medium uppercase tracking-[0.12em] text-[var(--ds-muted-foreground)] opacity-[0.65]">
                Hover
              </p>
              <div
                className="pointer-events-none flex flex-wrap items-center gap-3.5 select-none"
                aria-hidden="true"
              >
                <Button variant="primary" tabIndex={-1} className={demoBtnPrimaryHoverShown}>
                  Primary
                </Button>
                <Button variant="secondary" tabIndex={-1} className={demoBtnSecondaryHoverShown}>
                  Secondary
                </Button>
                <Button variant="ghost" tabIndex={-1} className={demoBtnGhostHoverShown}>
                  Ghost
                </Button>
              </div>
            </div>
            <div>
              <p className="mb-3.5 text-[length:var(--ds-text-xs)] font-medium uppercase tracking-[0.12em] text-[var(--ds-muted-foreground)] opacity-[0.65]">
                Disabled
              </p>
              <div className="flex flex-wrap items-center gap-3.5">
                <Button variant="primary" disabled className={demoBtnPrimary}>
                  Primary
                </Button>
                <Button variant="secondary" disabled className={demoBtnSecondary}>
                  Secondary
                </Button>
                <Button variant="ghost" disabled className={demoBtnGhost}>
                  Ghost
                </Button>
              </div>
            </div>
          </div>
        </Section>

        <Section
          sectionId={sid("cards")}
          title="Cards & surfaces"
          description="Elevated surfaces—subtle border, soft shadow, frosted backdrop."
        >
          <div className="flex flex-col gap-4">
            <Card
              className={`p-5 ${cardShowcaseInteractive} ${cardShowcaseSurface} ${cardShowcaseShadowDefault}`}
            >
              <h3 className="text-[length:var(--ds-text-lg)] font-semibold tracking-[-0.02em] text-[var(--ds-card-foreground)]">
                Default surface
              </h3>
              <p className="mt-2.5 text-[length:var(--ds-text-sm)] leading-relaxed text-[color-mix(in_oklab,var(--ds-muted-foreground)_88%,var(--ds-card-foreground))]">
                Baseline panel for settings, summaries, and grouped content.
              </p>
            </Card>
            <Card
              className={`p-7 sm:p-8 ${cardShowcaseInteractive} ${cardShowcaseSurfaceMetric} ${cardShowcaseShadowMetric}`}
            >
              <h3 className="text-[length:var(--ds-text-sm)] font-medium tracking-[-0.01em] text-[color-mix(in_oklab,var(--ds-muted-foreground)_78%,var(--ds-card-foreground))]">
                Metric highlight
              </h3>
              <p className="mt-3 text-4xl font-semibold tracking-tight text-[var(--ds-primary)] tabular-nums leading-[1.08]">
                98.2%
              </p>
              <p className="mt-2 text-[length:var(--ds-text-sm)] text-[color-mix(in_oklab,var(--ds-muted-foreground)_92%,transparent)]">
                Uptime · last 30 days
              </p>
            </Card>
            <Card
              className={`p-5 ${cardShowcaseInteractive} ${cardShowcaseSurface} ${cardShowcaseShadowDefault}`}
            >
              <h3 className="text-[length:var(--ds-text-lg)] font-semibold tracking-[-0.02em] text-[var(--ds-card-foreground)]">
                Action strip
              </h3>
              <p className="mt-2.5 text-[length:var(--ds-text-sm)] leading-relaxed text-[color-mix(in_oklab,var(--ds-muted-foreground)_88%,var(--ds-card-foreground))]">
                Pair cards with buttons for focused tasks.
              </p>
              <div
                className={
                  isDarkPane
                    ? "mt-7 border-t border-[color-mix(in_oklab,var(--ds-border)_32%,transparent)] pt-7"
                    : "mt-7 border-t border-[color-mix(in_oklab,var(--ds-border)_14%,transparent)] pt-7"
                }
              >
                <div className="flex w-full flex-col items-stretch sm:w-auto sm:items-start">
                  <Button variant="secondary" className="w-full sm:w-auto">
                    Open
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </Section>

        <Section
          sectionId={sid("spacing")}
          title="Spacing"
          description="Rhythm from --ds-space-* tokens. Bar width matches each step."
        >
          <Card className="space-y-3 p-6 sm:p-8">
            {spaceSteps.map(({ token, name }) => (
              <div key={token} className="flex items-center gap-3 sm:gap-4">
                <div className="flex min-h-9 min-w-0 flex-1 items-center">
                  <div
                    className="h-2.5 rounded-full bg-[var(--ds-primary)]/85"
                    style={{ width: `var(${token})` }}
                  />
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-[length:var(--ds-text-xs)] text-[var(--ds-muted-foreground)]">
                    var({token})
                  </p>
                  <p className="text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-foreground)]">{name}</p>
                </div>
              </div>
            ))}
          </Card>
        </Section>

        <Section
          sectionId={sid("radius-shadows")}
          title="Radius & shadows"
          description="Corner radii and elevation without harsh contrast."
        >
          <div className="flex flex-col gap-4">
            <Card className="p-6 sm:p-8">
              <h3 className="mb-5 text-[length:var(--ds-text-lg)] font-semibold text-[var(--ds-card-foreground)]">
                Radius
              </h3>
              <div className="flex flex-wrap items-end justify-between gap-6 sm:justify-start">
                {(
                  [
                    ["--ds-radius-sm", "sm"],
                    ["--ds-radius-md", "md"],
                    ["--ds-radius-lg", "lg"],
                  ] as const
                ).map(([cssVar, label]) => (
                  <div key={cssVar} className="text-center">
                    <div
                      className={`mx-auto h-14 w-14 ${radiusPreviewSurface}`}
                      style={{ borderRadius: `var(${cssVar})` }}
                    />
                    <p className="mt-2 font-mono text-[length:var(--ds-text-xs)] text-[var(--ds-muted-foreground)]">
                      {cssVar}
                    </p>
                    <p className="text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-foreground)]">{label}</p>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-6 sm:p-8">
              <h3 className="mb-5 text-[length:var(--ds-text-lg)] font-semibold text-[var(--ds-card-foreground)]">
                Shadows
              </h3>
              <div className={shadowDemoTrayClass}>
                <div className="space-y-4">
                  {(
                    [
                      ["--ds-shadow-sm", "Small"],
                      ["--ds-shadow-md", "Medium"],
                      ["--ds-shadow-lg", "Large"],
                    ] as const
                  ).map(([cssVar, label]) => (
                    <div
                      key={cssVar}
                      className={
                        isDarkPane
                          ? "min-h-[4.25rem] rounded-[var(--ds-radius-md)] border border-[color-mix(in_oklab,var(--ds-border)_36%,transparent)] bg-[color-mix(in_oklab,var(--ds-card)_94%,var(--ds-muted))] px-4 py-3.5"
                          : "min-h-[4.25rem] rounded-[var(--ds-radius-md)] border border-[color-mix(in_oklab,var(--ds-border)_55%,transparent)] bg-[var(--ds-card)] px-4 py-3.5"
                      }
                      style={{ boxShadow: `var(${cssVar})` }}
                    >
                      <p className="text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-foreground)]">{label}</p>
                      <p className="mt-0.5 text-[length:var(--ds-text-xs)] leading-snug text-[var(--ds-muted-foreground)] opacity-[0.88]">
                        {shadowLevelHints[label]}
                      </p>
                      <p className="mt-1 font-mono text-[length:var(--ds-text-xs)] text-[var(--ds-muted-foreground)] opacity-[0.78]">
                        {cssVar}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </Section>

        <Section
          sectionId={sid("charts")}
          title="Charts"
          description="Product-grade analytics defaults: low-noise visuals, restrained color, and emphasis-driven hierarchy via shared chart tokens."
        >
          <ChartShowcase uniqueId={sid("charts")} />
        </Section>

        <Section
          sectionId={sid("principles")}
          title="Usage principles"
          description="Keeping interfaces cohesive as the system grows."
        >
          <ul className="flex flex-col gap-3">
            {principles.map((item) => (
              <Card key={item.title} className="p-5">
                <h3 className="text-[length:var(--ds-text-base)] font-semibold text-[var(--ds-card-foreground)]">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-[length:var(--ds-text-sm)] leading-relaxed text-[var(--ds-muted-foreground)]">
                  {item.body}
                </p>
              </Card>
            ))}
          </ul>
        </Section>
      </div>

      <footer className="mt-14 border-t border-[var(--ds-border)] pt-8 pb-2">
        <p className="text-[length:var(--ds-text-sm)] leading-relaxed text-[var(--ds-muted-foreground)]">
          Internal design reference—not part of the public marketing narrative.
        </p>
      </footer>
    </>
  );
}

export default function DesignSystemPage() {
  return (
    <div className="visualify-ds-root min-h-dvh bg-[#e4e6ea]">
      <div className="flex min-h-dvh w-full flex-col lg:flex-row">
        <div className="flex min-h-dvh min-w-0 flex-1 flex-col bg-[color-mix(in_oklab,var(--ds-background)_52%,rgb(230_233_239))] px-5 py-9 sm:px-7 sm:py-11 lg:px-10">
          <div className="mx-auto w-full max-w-[min(100%,560px)] flex-1">
            <ThemePaneLabel label="Light mode" />
            <DesignSystemContent idPrefix="light" />
          </div>
        </div>

        <div
          className="pointer-events-none hidden w-px shrink-0 self-stretch lg:block"
          style={{
            backgroundImage:
              "linear-gradient(180deg, transparent 0%, rgba(15, 23, 42, 0.07) 18%, rgba(15, 23, 42, 0.12) 50%, rgba(15, 23, 42, 0.07) 82%, transparent 100%)",
          }}
          aria-hidden
        />

        <div
          data-theme="dark"
          className="flex min-h-dvh min-w-0 flex-1 flex-col bg-[var(--ds-background)] px-5 py-9 sm:px-7 sm:py-11 lg:px-10"
        >
          <div className="mx-auto w-full max-w-[min(100%,560px)] flex-1">
            <ThemePaneLabel label="Dark mode" />
            <DesignSystemContent idPrefix="dark" />
          </div>
        </div>
      </div>
    </div>
  );
}
