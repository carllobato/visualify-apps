"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  AppShellRailAccountTrigger,
  appShellRailAccountMenuClassName,
  appShellRailFooterAccountRowClass,
} from "@visualify/app-shell";
import { Button } from "@visualify/design-system";
import { authDisabledStubUser, isAuthDisabled } from "@/lib/auth/auth-disabled";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import type { User } from "@supabase/supabase-js";

const PersonIcon = ({ size = 20 }: { size?: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="pointer-events-none shrink-0"
    aria-hidden
  >
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const ChevronIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="pointer-events-none"
    aria-hidden
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

/** Account pill + dropdown for HQ dashboard (matches RiskAI top-nav account control). */
export function DashboardAccountMenu({
  variant = "header",
  railPageActive = false,
}: {
  variant?: "header" | "rail";
  /** When the route is `/account`, row uses active nav styling (surface + shadow). */
  railPageActive?: boolean;
}) {
  const [user, setUser] = useState<User | null | "loading">("loading");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAuthDisabled()) {
      setUser(authDisabledStubUser());
      return;
    }
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
    if (isAuthDisabled()) {
      setMenuOpen(false);
      window.location.assign("/dashboard");
      return;
    }
    setMenuOpen(false);
    setUser(null);
    try {
      const res = await fetch("/auth/sign-out", {
        method: "POST",
        credentials: "same-origin",
      });
      if (!res.ok) {
        await supabaseBrowserClient().auth.signOut({ scope: "global" });
      }
    } catch {
      await supabaseBrowserClient().auth.signOut({ scope: "global" });
    } finally {
      window.location.assign("/login");
    }
  };

  const rail = variant === "rail";

  if (user === "loading") {
    return (
      <span
        className={`inline-block shrink-0 bg-[var(--ds-surface-muted)] ${rail ? "h-10 w-10 rounded-[var(--ds-radius-md)]" : "h-9 w-9 rounded-full"}`}
        aria-hidden
      />
    );
  }

  if (!user) {
    return null;
  }

  const emailRaw = user.email?.trim();
  const emailFromMetadata =
    typeof user.user_metadata?.email === "string"
      ? user.user_metadata.email.trim()
      : "";
  const signedInEmail = emailRaw || emailFromMetadata || null;

  const accountMenuPanel = menuOpen ? (
    <div role="menu" className={rail ? appShellRailAccountMenuClassName : "absolute right-0 top-full z-[100] mt-[var(--ds-space-1)] ds-app-menu-dropdown ds-app-menu-dropdown--min-w-nav"}>
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
        href="/account"
        role="menuitem"
        className="ds-app-menu-dropdown__item block text-left no-underline"
        onClick={() => setMenuOpen(false)}
      >
        User Settings
      </Link>
      <button
        type="button"
        role="menuitem"
        className="ds-app-menu-dropdown__item"
        onClick={handleSignOut}
      >
        Sign out
      </button>
    </div>
  ) : null;

  if (rail) {
    return (
      <AppShellRailAccountTrigger
        menuOpen={menuOpen}
        onToggle={() => setMenuOpen((o) => !o)}
        rowClassName={appShellRailFooterAccountRowClass(railPageActive)}
        pageActive={railPageActive}
        icon={<PersonIcon size={18} />}
        menu={accountMenuPanel}
        menuRef={menuRef}
      />
    );
  }

  return (
    <div className="relative flex items-center" ref={menuRef}>
      <Button
        type="button"
        variant="ghost"
        size="md"
        className="ds-app-menu-trigger ds-app-menu-trigger--leading-slot"
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        aria-label="Account menu"
        onClick={() => setMenuOpen((o) => !o)}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--ds-surface)] text-[var(--ds-text-primary)]">
          <PersonIcon />
        </span>
        <ChevronIcon />
      </Button>
      {accountMenuPanel}
    </div>
  );
}
