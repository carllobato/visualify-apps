type MinimalResourceListErrorProps = {
  title: string;
  message: string;
};

export function MinimalResourceListError({ title, message }: MinimalResourceListErrorProps) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 py-8">
      <h1 className="text-[length:var(--ds-text-xl)] font-semibold text-[var(--ds-text-primary)]">{title}</h1>
      <p className="text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]" role="alert">
        {message}
      </p>
    </main>
  );
}
