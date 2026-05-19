import { AppShellPageHeader } from "@visualify/app-shell";
import Link from "next/link";
import { redirect } from "next/navigation";
import { resolveAuthenticatedUser } from "@/lib/auth/resolve-authenticated-user";
import {
  fetchManageableWorkspaceById,
  readVisualifyActiveWorkspaceIdFromCookie,
} from "@/lib/workspace-settings-data";

export const dynamic = "force-dynamic";

export default async function WorkspaceSettingsPage() {
  const user = await resolveAuthenticatedUser();
  if (!user) redirect("/login");

  const cookieId = await readVisualifyActiveWorkspaceIdFromCookie();
  if (!cookieId) {
    return (
      <main className="w-full min-w-0 px-0 pb-4">
        <AppShellPageHeader
          title="Workspace"
          description="Select a workspace from the rail to open its admin hub."
          className="mb-8"
        />
      </main>
    );
  }

  const manageable = await fetchManageableWorkspaceById(user.id, cookieId);
  if (!manageable) {
    return (
      <main className="w-full min-w-0 px-0 pb-4">
        <AppShellPageHeader
          title="Workspace"
          description="This workspace is not available for administration. Choose another workspace from the rail."
          className="mb-8"
        />
        <Link
          href="/account"
          className="inline-flex rounded-[var(--ds-radius-sm)] border border-[var(--ds-border)] bg-[var(--ds-surface-default)] px-4 py-2 text-sm font-medium text-[var(--ds-text-primary)] no-underline hover:bg-[var(--ds-surface-hover)]"
        >
          User Settings
        </Link>
      </main>
    );
  }

  redirect(`/workspaces/${manageable.id}`);
}
