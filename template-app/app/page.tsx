import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-8">
      <p className="text-[length:var(--ds-text-lg)] font-semibold text-[var(--ds-text-primary)]">
        Visualify Template App
      </p>
      <Link
        href="/login"
        className="rounded-[var(--ds-radius-sm)] border border-[var(--ds-border)] bg-[var(--ds-surface-default)] px-4 py-2 text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-primary)]"
      >
        Sign in
      </Link>
    </main>
  );
}
