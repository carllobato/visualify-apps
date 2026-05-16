export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 py-8">
      <h1 className="text-[length:var(--ds-text-xl)] font-semibold text-[var(--ds-text-primary)]">
        Dashboard
      </h1>
      <p className="text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
        Signed-in area. Workspace product access has been verified for this app.
      </p>
    </main>
  );
}
