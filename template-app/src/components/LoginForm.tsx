"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AppLoginCardHeader,
  AppLoginFormError,
  AppLoginPasswordField,
  appLoginFormClassName,
  AppLoginStandardLegalFooter,
  AppLoginSubmitRow,
  AppLoginTrustLine,
} from "@visualify/app-shell";
import { Input, Label } from "@visualify/design-system";
import { supabaseBrowserClient } from "@/lib/supabase/browser";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const supabase = supabaseBrowserClient();
      const { error: signError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signError) {
        setError(signError.message);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <AppLoginCardHeader />

      <form onSubmit={onSubmit} className={appLoginFormClassName} autoComplete="on">
        <div>
          <Label htmlFor="template-login-email">Email</Label>
          <Input
            id="template-login-email"
            name="email"
            type="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="username"
            autoCapitalize="off"
            autoCorrect="off"
            required
            disabled={pending}
          />
        </div>

        <AppLoginPasswordField
          id="template-login-password"
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          visible={showPassword}
          onToggleVisible={() => setShowPassword((v) => !v)}
          autoComplete="current-password"
          required
          disabled={pending}
        />

        <AppLoginFormError message={error} />

        <AppLoginSubmitRow pending={pending} />

        <AppLoginTrustLine />

        <AppLoginStandardLegalFooter />
      </form>
    </>
  );
}
