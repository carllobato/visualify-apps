"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Callout } from "@visualify/design-system";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import { DASHBOARD_PATH } from "@/lib/routes";

function safeNextPath(raw: string | null, fallback: string): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return fallback;
  }
  return raw;
}

export default function AuthConfirmClientPage() {
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const inviteToken = params.get("invite_token");
  const code = params.get("code");
  const nextPath = useMemo(() => safeNextPath(params.get("next"), DASHBOARD_PATH), [params]);

  useEffect(() => {
    async function run() {
      if (!code?.trim()) {
        setError("Missing confirmation code.");
        return;
      }
      const { error: exchangeError } = await supabaseBrowserClient().auth.exchangeCodeForSession(code);
      if (exchangeError) {
        setError(exchangeError.message);
        return;
      }

      if (inviteToken?.trim()) {
        window.location.replace(`/invite?invite_token=${encodeURIComponent(inviteToken)}`);
        return;
      }
      window.location.replace(nextPath);
    }
    void run();
  }, [code, inviteToken, nextPath]);

  if (!error) {
    return (
      <main className="mx-auto w-full max-w-lg px-6 py-10">
        <Callout status="info" role="status">
          Confirming your account...
        </Callout>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-lg px-6 py-10">
      <Callout status="danger" role="alert">
        {error}
      </Callout>
    </main>
  );
}
