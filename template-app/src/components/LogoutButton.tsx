"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import {
  RAIL_NAV_ROW_INACTIVE_CLASS,
  RAIL_NAV_ROW_SHELL_CLASS,
  railLabelClass,
} from "@visualify/app-shell";

function IconSignOut() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <path
        d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 17l5-5-5-5M21 12H9"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type LogoutButtonProps = {
  /** Default: bordered control. `rail`: left-rail row matching platform chrome. */
  variant?: "default" | "rail";
};

export function LogoutButton({ variant = "default" }: LogoutButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onLogout() {
    setPending(true);
    try {
      const res = await fetch("/auth/sign-out", {
        method: "POST",
        credentials: "same-origin",
      });
      if (!res.ok) {
        await supabaseBrowserClient().auth.signOut();
      }
      router.push("/");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  if (variant === "rail") {
    return (
      <button
        type="button"
        onClick={onLogout}
        disabled={pending}
        title={pending ? "Signing out…" : "Sign out"}
        aria-label={pending ? "Signing out…" : "Sign out"}
        className={
          `${RAIL_NAV_ROW_SHELL_CLASS}${RAIL_NAV_ROW_INACTIVE_CLASS}` +
          " w-full cursor-pointer border-0 bg-transparent text-left no-underline disabled:opacity-50"
        }
      >
        <span className="flex size-10 shrink-0 items-center justify-center">
          <IconSignOut />
        </span>
        <span className={railLabelClass}>{pending ? "Signing out…" : "Sign out"}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onLogout}
      disabled={pending}
      className="rounded-[var(--ds-radius-sm)] border border-[var(--ds-border)] bg-[var(--ds-surface-default)] px-4 py-2 text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-primary)] disabled:opacity-50"
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
