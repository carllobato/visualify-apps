"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  AppShellRailAccountTrigger,
  appShellRailAccountMenuClassName,
  appShellRailFooterAccountRowClass,
} from "@visualify/app-shell";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import { riskaiPath } from "@/lib/routes";
import type { User } from "@supabase/supabase-js";

const ACCOUNT_SETTINGS_HREF = riskaiPath("/account");

/** Clears session via `app/auth/sign-out/route.ts`; same post-sign-out entry as `TopNav`. */
const SIGN_OUT_ROUTE = "/auth/sign-out";
const POST_SIGN_OUT_PATH = "/";

const PersonIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={20}
    height={20}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="pointer-events-none shrink-0"
    aria-hidden
  >
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

/** Account trigger + dropdown for RiskAI app shell rail (HQ-aligned). */
export function RiskAiRailAccountMenu({ railPageActive = false }: { railPageActive?: boolean }) {
  const [user, setUser] = useState<User | null | "loading">("loading");
  const [menuOpen, setMenuOpen] = useState(false);
  const [signOutPending, setSignOutPending] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = supabaseBrowserClient();
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u ?? null);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  const handleSignOut = async () => {
    setMenuOpen(false);
    setSignOutPending(true);
    try {
      const res = await fetch(SIGN_OUT_ROUTE, {
        method: "POST",
        credentials: "same-origin",
      });
      if (!res.ok) {
        await supabaseBrowserClient().auth.signOut();
      }
      window.location.href = POST_SIGN_OUT_PATH;
    } finally {
      setSignOutPending(false);
    }
  };

  if (user === "loading") {
    return (
      <span
        className="inline-block h-10 w-10 shrink-0 rounded-[var(--ds-radius-md)] bg-[var(--ds-surface-muted)]"
        aria-hidden
      />
    );
  }

  if (!user) {
    return null;
  }

  const emailRaw = user.email?.trim();
  const emailFromMetadata =
    typeof user.user_metadata?.email === "string" ? user.user_metadata.email.trim() : "";
  const signedInEmail = emailRaw || emailFromMetadata || null;

  const accountMenuPanel = menuOpen ? (
    <div role="menu" className={appShellRailAccountMenuClassName}>
      <div
        className="px-[var(--ds-space-4)] pb-[var(--ds-space-2)] pt-[var(--ds-space-3)]"
        role="presentation"
      >
        <div className="text-[length:var(--ds-text-xs)] font-normal leading-snug text-[var(--ds-text-secondary)]">
          Signed in as
        </div>
        <div
          className={`mt-[var(--ds-space-1)] truncate text-[length:var(--ds-text-sm)] leading-snug ${
            signedInEmail ? "text-[var(--ds-text-primary)]" : "text-[var(--ds-text-secondary)]"
          }`}
          title={signedInEmail ?? undefined}
        >
          {signedInEmail ?? "No email available"}
        </div>
      </div>
      <Link
        href={ACCOUNT_SETTINGS_HREF}
        role="menuitem"
        className="ds-app-menu-dropdown__item block text-left no-underline"
        onClick={() => setMenuOpen(false)}
      >
        Account Settings
      </Link>
      <button
        type="button"
        role="menuitem"
        className="ds-app-menu-dropdown__item"
        onClick={handleSignOut}
        disabled={signOutPending}
      >
        {signOutPending ? "Signing out…" : "Sign out"}
      </button>
    </div>
  ) : null;

  return (
    <AppShellRailAccountTrigger
      menuOpen={menuOpen}
      onToggle={() => setMenuOpen((o) => !o)}
      rowClassName={appShellRailFooterAccountRowClass(railPageActive)}
      pageActive={railPageActive}
      icon={<PersonIcon />}
      menu={accountMenuPanel}
      menuRef={menuRef}
    />
  );
}
