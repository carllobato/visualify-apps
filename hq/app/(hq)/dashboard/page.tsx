import { AppShellPageHeader } from "@visualify/app-shell";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardWorkspacesSection } from "./dashboard-workspaces-section";
import { fetchDashboardLauncherCriticalData } from "@/lib/dashboard-launcher-data";
import { resolveAuthenticatedUser } from "@/lib/auth/resolve-authenticated-user";
import "./dashboard-mobile.css";

export const dynamic = "force-dynamic";

const createWorkspaceButtonClass =
  "inline-flex h-9 shrink-0 items-center justify-center rounded-[var(--ds-radius-md)] px-3.5 " +
  "text-[length:var(--ds-text-sm)] font-medium no-underline " +
  "bg-[var(--ds-primary)] text-[var(--ds-primary-text)] shadow-[var(--ds-shadow-sm)] " +
  "transition-all duration-150 ease-out hover:bg-[var(--ds-primary-hover)] hover:shadow-[var(--ds-elevation-button-secondary-hover)] active:brightness-[0.97] " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-primary)] " +
  "max-md:flex max-md:h-11 max-md:w-full max-md:shrink max-md:px-4 max-md:text-[length:var(--ds-text-base)]";

export default async function DashboardPage() {
  const user = await resolveAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const workspaces = await fetchDashboardLauncherCriticalData(user.id);

  return (
    <div className="ds-hq-dashboard-page flex min-h-full w-full flex-col items-start justify-start px-0 pt-0">
      <main className="ds-hq-dashboard-page__main w-full max-w-none shrink-0 space-y-4">
        <AppShellPageHeader
          title="Dashboard"
          description="Open a workspace or manage its platform settings."
          className={
            "!gap-3 sm:!gap-4 max-md:!gap-2.5 max-md:flex-col max-md:items-stretch " +
            "max-md:[&_h1]:sr-only max-md:[&_p]:m-0 max-md:[&_p]:text-[length:var(--ds-text-sm)] max-md:[&_p]:leading-snug"
          }
          actions={
            <Link href="/create-workspace" className={createWorkspaceButtonClass}>
              Create workspace
            </Link>
          }
        />

        <DashboardWorkspacesSection userId={user.id} workspaces={workspaces} />
      </main>
    </div>
  );
}
