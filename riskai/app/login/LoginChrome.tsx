import { TopNav } from "@/components/layout/TopNav";

/** Shared shell: solid DS background, TopNav, scroll region (used by /login on the website host and / on the app host). */
export function LoginChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col bg-[var(--ds-background)] text-[var(--ds-text-primary)]">
      <div className="fixed inset-x-0 top-0 z-20">
        <TopNav variant="default" />
      </div>
      <div className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-4 pb-8 pt-16">
        {children}
      </div>
    </div>
  );
}
