import Image from "next/image";

/** Decorative product mocks for marketing — light theme. */

const RISK_REGISTER_IMAGE_WIDTH = 2912;
const RISK_REGISTER_IMAGE_HEIGHT = 924;

export function RegisterMockVisual() {
  return (
    <div
      className={
        "overflow-hidden rounded-[var(--ds-radius-md)] border border-[color-mix(in_oklab,var(--ds-border-subtle)_75%,transparent)] " +
        "bg-[var(--ds-surface)] shadow-[0_12px_40px_-16px_color-mix(in_oklab,var(--ds-scrim-ink)_18%,transparent)] " +
        "ring-1 ring-[color-mix(in_oklab,var(--ds-text-primary)_6%,transparent)]"
      }
    >
      <Image
        src="/images/feature-risk-register.png"
        alt="Risk register with search, columns for ID, title, category, owner, status, and rating"
        width={RISK_REGISTER_IMAGE_WIDTH}
        height={RISK_REGISTER_IMAGE_HEIGHT}
        className="block h-auto w-full"
        sizes="(max-width: 1024px) 92vw, min(448px, 28rem)"
      />
    </div>
  );
}

export function AiAssistMockVisual() {
  return (
    <div
      className={
        "overflow-hidden rounded-[var(--ds-radius-md)] border border-[color-mix(in_oklab,var(--ds-border-subtle)_75%,transparent)] " +
        "bg-[var(--ds-surface)] shadow-[0_12px_40px_-16px_color-mix(in_oklab,var(--ds-scrim-ink)_18%,transparent)] " +
        "ring-1 ring-[color-mix(in_oklab,var(--ds-text-primary)_6%,transparent)]"
      }
    >
      <div className="border-b border-[color-mix(in_oklab,var(--ds-border-subtle)_70%,transparent)] bg-[color-mix(in_oklab,var(--ds-surface-muted)_35%,var(--ds-surface))] px-4 py-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ds-text-muted)]">
          New risk
        </span>
      </div>
      <div className="space-y-3 p-4">
        <p className="text-[length:var(--ds-text-sm)] leading-relaxed text-[var(--ds-text-primary)]">
          Delay in steel delivery affecting critical path near{" "}
          <span className="rounded-sm bg-[color-mix(in_oklab,var(--ds-surface-muted)_90%,var(--ds-surface))] px-1 py-0.5">
            Milestone 4
          </span>
          …
        </p>
        <div
          className={
            "relative rounded-[var(--ds-radius-sm)] border border-[color-mix(in_oklab,var(--ds-primary)_28%,transparent)] " +
            "bg-[color-mix(in_oklab,var(--ds-primary)_7%,var(--ds-surface))] p-3 pl-3.5 " +
            "before:absolute before:top-0 before:bottom-0 before:left-0 before:w-[3px] before:rounded-l-[var(--ds-radius-sm)] before:bg-[var(--ds-primary)]"
          }
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color-mix(in_oklab,var(--ds-primary)_85%,var(--ds-text-primary))]">
            Suggested structure
          </p>
          <p className="mt-2 text-[length:var(--ds-text-sm)] leading-snug text-[var(--ds-text-primary)]">
            Classify as schedule risk · apply lognormal cost range · link to procurement package.
          </p>
        </div>
      </div>
    </div>
  );
}

export function ReportingMockVisual() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: "Total exposure", value: "$12.4M", sub: "P80 cost" },
          { label: "Schedule slip", value: "+11 wks", sub: "P80" },
          { label: "Top driver", value: "Procurement", sub: "38% share" },
        ].map((k) => (
          <div
            key={k.label}
            className={
              "rounded-[var(--ds-radius-sm)] border border-[color-mix(in_oklab,var(--ds-border-subtle)_75%,transparent)] " +
              "bg-[color-mix(in_oklab,var(--ds-surface-muted)_28%,var(--ds-surface))] px-3 py-3 shadow-[0_1px_2px_color-mix(in_oklab,var(--ds-scrim-ink)_5%,transparent)]"
            }
          >
            <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--ds-text-muted)]">{k.label}</p>
            <p className="mt-1.5 text-[length:var(--ds-text-base)] font-semibold tabular-nums text-[var(--ds-text-primary)]">
              {k.value}
            </p>
            <p className="mt-0.5 text-[10px] text-[var(--ds-text-secondary)]">{k.sub}</p>
          </div>
        ))}
      </div>
      <div
        className={
          "h-2 overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--ds-surface-muted)_80%,var(--ds-surface))] " +
          "shadow-[inset_0_1px_2px_color-mix(in_oklab,var(--ds-scrim-ink)_8%,transparent)]"
        }
      >
        <div
          className="h-full w-[62%] rounded-full bg-[color-mix(in_oklab,var(--ds-primary)_78%,var(--ds-surface-muted))]"
          aria-hidden
        />
      </div>
      <p className="text-center text-[10px] text-[var(--ds-text-muted)]">Driver contribution (illustrative)</p>
    </div>
  );
}
