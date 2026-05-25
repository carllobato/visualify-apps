type OsPagePlaceholderProps = {
  title: string;
  description: string;
};

/** Lightweight scaffold page — Stage 8 replaces with operational views. */
export function OsPagePlaceholder({ title, description }: OsPagePlaceholderProps) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 py-6 sm:gap-4 sm:px-6 sm:py-8">
      <h1 className="text-[length:var(--ds-text-xl)] font-semibold tracking-tight text-[var(--ds-text-primary)]">
        {title}
      </h1>
      <p className="max-w-prose text-[length:var(--ds-text-sm)] leading-relaxed text-[var(--ds-text-secondary)]">
        {description}
      </p>
    </main>
  );
}
