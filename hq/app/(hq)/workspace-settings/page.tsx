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
        <h1 className="mb-2 text-2xl font-semibold text-[var(--ds-text-primary)]">Workspace</h1>
        <p className="mb-8 text-sm text-[var(--ds-text-secondary)]">
          Select a workspace from the rail to open its admin hub.
        </p>
      </main>
    );
  }

  const manageable = await fetchManageableWorkspaceById(user.id, cookieId);
  if (!manageable) {
    return (
      <main className="w-full min-w-0 px-0 pb-4">
        <h1 className="mb-2 text-2xl font-semibold text-[var(--ds-text-primary)]">Workspace</h1>
        <p className="mb-8 text-sm text-[var(--ds-text-secondary)]">
          This workspace is not available for administration. Choose another workspace from the rail.
        </p>
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
