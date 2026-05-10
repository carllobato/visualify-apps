import Link from "next/link";
import { redirect } from "next/navigation";
import { isAuthDisabled } from "@/lib/auth/auth-disabled";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  if (isAuthDisabled()) {
    redirect("/dashboard");
  }

  return (
    <div className="relative flex min-h-dvh flex-col bg-[var(--ds-background)] text-[var(--ds-text-primary)]">
      <div className="fixed inset-x-0 top-0 z-20">
        <header className="ds-app-top-nav flex h-14 shrink-0 items-center justify-between gap-[var(--ds-space-3)] px-[var(--ds-space-2)]">
          <div className="flex min-w-0 items-center gap-[var(--ds-space-3)]">
            <Link
              href="/"
              className="inline-flex h-9 items-center px-[var(--ds-space-2)] text-[length:var(--ds-text-lg)] font-medium leading-none tracking-tight text-[var(--ds-text-primary)] no-underline transition-colors hover:text-[var(--ds-text-secondary)]"
            >
              Visualify
            </Link>
          </div>
        </header>
      </div>

      <div className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-4 pb-8 pt-16">
        <main className="w-full max-w-md shrink-0">
          <LoginForm />
          <p className="mt-4 text-center text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">
            © {new Date().getFullYear()} Visualify. All rights reserved.
          </p>
        </main>
      </div>
    </div>
  );
}
