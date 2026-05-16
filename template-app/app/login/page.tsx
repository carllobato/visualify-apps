import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { supabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 p-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-[length:var(--ds-text-lg)] font-semibold text-[var(--ds-text-primary)]">
          Visualify Template App
        </p>
        <p className="text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">Sign in</p>
      </div>
      <LoginForm />
      <Link
        href="/"
        className="text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)] underline underline-offset-2"
      >
        Back to home
      </Link>
    </main>
  );
}
