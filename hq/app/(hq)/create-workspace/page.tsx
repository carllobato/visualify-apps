import { redirect } from "next/navigation";
import { resolveAuthenticatedUser } from "@/lib/auth/resolve-authenticated-user";
import { CreateWorkspaceForm } from "./create-workspace-form";

export const dynamic = "force-dynamic";

export default async function CreateWorkspacePage() {
  const user = await resolveAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="w-full max-w-md shrink-0">
      <h1 className="mb-2 text-[length:var(--ds-text-xl)] font-semibold tracking-tight text-[var(--ds-text-primary)]">
        Create workspace
      </h1>
      <p className="mb-6 text-[length:var(--ds-text-sm)] leading-relaxed text-[var(--ds-text-secondary)]">
        A workspace is where you enable Visualify apps and manage billing. You will be the owner.
      </p>
      <CreateWorkspaceForm />
    </main>
  );
}
