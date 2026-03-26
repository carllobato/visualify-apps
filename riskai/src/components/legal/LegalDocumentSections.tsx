export const legalBodyClass =
  "text-[13px] leading-[1.65] text-[var(--ds-text-muted)] sm:text-sm sm:leading-[1.7]";
export const legalSubheadClass =
  "text-[12px] font-semibold tracking-tight text-[var(--ds-text-primary)] sm:text-[13px]";
export const legalInlineLinkClass =
  "font-medium text-[var(--ds-text-primary)] underline decoration-[var(--ds-border)] underline-offset-[3px] transition-colors hover:decoration-[var(--ds-text-secondary)]";

export function LegalSection({ title, children, inModal = false }: { title: string; children: React.ReactNode; inModal?: boolean }) {
  return (
    <section
      className={`border-t border-[color-mix(in_oklab,var(--ds-border)_50%,transparent)] pt-7 first:border-0 first:pt-0 ${
        inModal ? "sm:pt-8" : "sm:pt-7"
      }`}
    >
      <h2 className="text-[15px] font-semibold tracking-tight text-[var(--ds-text-primary)] sm:text-base">
        {title}
      </h2>
      <div className={`mt-3.5 space-y-3.5 ${legalBodyClass}`}>{children}</div>
    </section>
  );
}

export function LegalBulletList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-2.5 pl-[1.25rem] marker:text-[var(--ds-text-muted)] [&>li]:leading-[1.65]">
      {items.map((item) => (
        <li key={item}>
          {item}
        </li>
      ))}
    </ul>
  );
}
