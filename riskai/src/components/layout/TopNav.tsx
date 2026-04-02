"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@visualify/design-system";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import { riskaiPath } from "@/lib/routes";
import { useTheme } from "@/context/ThemeContext";
import type { User } from "@supabase/supabase-js";

const PersonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none shrink-0" aria-hidden>
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const MenuIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none" aria-hidden>
    <line x1="4" x2="20" y1="12" y2="12" />
    <line x1="4" x2="20" y1="6" y2="6" />
    <line x1="4" x2="20" y1="18" y2="18" />
  </svg>
);

const ChevronIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none text-[var(--ds-text-muted)]" aria-hidden>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const SunIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none" aria-hidden>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" />
    <path d="M12 20v2" />
    <path d="m4.93 4.93 1.41 1.41" />
    <path d="m17.66 17.66 1.41 1.41" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
    <path d="m6.34 17.66-1.41 1.41" />
    <path d="m19.07 4.93-1.41 1.41" />
  </svg>
);

const MoonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none" aria-hidden>
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </svg>
);

type TopNavProps = {
  onMenuClick?: () => void;
  /** When the account dropdown opens, parent can hide other chrome (e.g. mobile sidebar). */
  onAccountMenuOpen?: () => void;
  /** Translucent bar for full-bleed backgrounds (e.g. login). */
  variant?: "default" | "glass";
};

export function TopNav({ onMenuClick, onAccountMenuOpen, variant = "default" }: TopNavProps) {
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState<User | null | "loading">("loading");
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

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
    await supabaseBrowserClient().auth.signOut();
    window.location.href = "/";
  };

  const headerSurface =
    variant === "glass"
      ? "border-b border-[var(--ds-border)] bg-[color-mix(in_oklab,var(--ds-surface-elevated)_92%,var(--ds-background))] shadow-[var(--ds-shadow-sm)] transition-[background-color,border-color] duration-[250ms] ease-in-out"
      : "ds-app-top-nav";

  const menuItemClass =
    "block w-full cursor-pointer px-[var(--ds-space-4)] py-[var(--ds-space-2)] text-left text-[length:var(--ds-text-sm)] text-[var(--ds-text-primary)] no-underline transition-[background-color,color] duration-150 ease-out " +
    "hover:bg-[var(--ds-surface-hover)] focus-visible:bg-[var(--ds-surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-primary)]";

  return (
    <header className={`flex h-14 shrink-0 items-center justify-between gap-[var(--ds-space-3)] px-[var(--ds-space-2)] ${headerSurface}`}>
      <div className="flex min-w-0 items-center gap-[var(--ds-space-3)]">
        {onMenuClick ? (
          <Button
            type="button"
            variant="ghost"
            size="md"
            className="!h-9 !w-9 !min-w-9 shrink-0 !px-0 md:hidden [&_svg]:text-[var(--ds-text-muted)] hover:[&_svg]:text-[var(--ds-text-primary)]"
            aria-label="Open navigation"
            onClick={() => {
              setMenuOpen(false);
              onMenuClick();
            }}
          >
            <MenuIcon />
          </Button>
        ) : null}
        <Link
          href="/"
          className="inline-flex h-9 items-center px-[var(--ds-space-2)] text-[length:var(--ds-text-lg)] font-medium leading-none tracking-tight text-[var(--ds-text-primary)] no-underline transition-colors hover:text-[var(--ds-text-secondary)]"
        >
          Visualify <span className="mx-1.5 font-normal">|</span> RiskAI
        </Link>
      </div>

      <div className="flex items-center gap-[var(--ds-space-2)]">
        {mounted ? (
          <Button
            type="button"
            variant="ghost"
            size="md"
            role="switch"
            aria-checked={theme === "dark"}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
            className="!h-9 !w-9 !min-w-9 shrink-0 !px-0 [&_svg]:text-[var(--ds-text-muted)] hover:[&_svg]:text-[var(--ds-text-primary)]"
            onClick={(e) => {
              toggleTheme();
              (e.currentTarget as HTMLButtonElement).blur();
            }}
          >
            {theme === "dark" ? <MoonIcon /> : <SunIcon />}
          </Button>
        ) : (
          <span
            className="inline-block h-9 w-9 shrink-0 rounded-[var(--ds-radius-md)] bg-[var(--ds-surface-muted)]"
            aria-hidden
          />
        )}

        {user !== null && user !== "loading" ? (
          <div className="relative flex items-center" ref={menuRef}>
            <Button
              type="button"
              variant="secondary"
              size="md"
              className="!h-9 !rounded-full !py-0 !pl-1 !pr-2 !gap-2 !font-normal"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              aria-label="Account menu"
              onClick={() =>
                setMenuOpen((o) => {
                  const next = !o;
                  if (next) onAccountMenuOpen?.();
                  return next;
                })
              }
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--ds-surface-muted)] text-[var(--ds-text-primary)]">
                <PersonIcon />
              </span>
              <ChevronIcon />
            </Button>

            {menuOpen ? (
              <div
                role="menu"
                className="absolute right-0 top-full z-[100] mt-[var(--ds-space-1)] min-w-[200px] overflow-hidden rounded-[var(--ds-radius-md)] border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-elevated)] py-[var(--ds-space-1)] shadow-[var(--ds-shadow-lg)]"
              >
                <Link
                  href={riskaiPath("/settings")}
                  role="menuitem"
                  className={menuItemClass}
                  onClick={() => setMenuOpen(false)}
                >
                  Account Settings
                </Link>
                <div
                  className="my-[var(--ds-space-1)] border-t border-[var(--ds-border-subtle)]"
                  role="separator"
                  aria-hidden
                />
                <button type="button" role="menuitem" className={menuItemClass} onClick={handleSignOut}>
                  Sign Out
                </button>
              </div>
            ) : null}
          </div>
        ) : user === "loading" ? (
          <span
            className="inline-block h-9 w-9 shrink-0 rounded-full bg-[var(--ds-surface-muted)]"
            aria-hidden
          />
        ) : null}
      </div>
    </header>
  );
}
