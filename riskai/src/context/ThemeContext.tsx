"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { THEME_LIGHT_ONLY_MVP } from "@/config/themeLightOnly";
import { supabaseBrowserClient } from "@/lib/supabase/browser";

const STORAGE_KEY = "riskai-theme";

export type Theme = "light" | "dark";

function getInitialTheme(): Theme {
  if (THEME_LIGHT_ONLY_MVP) return "light";
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "dark" || stored === "light") return stored;
  if (typeof window.matchMedia !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const effective: Theme = THEME_LIGHT_ONLY_MVP ? "light" : theme;
  root.classList.remove("light", "dark");
  root.classList.add(effective);
  root.setAttribute("data-theme", effective);
  localStorage.setItem(STORAGE_KEY, effective);
}

function parseThemePreference(raw: unknown): Theme | null {
  if (raw === "dark" || raw === "light") return raw;
  return null;
}

async function persistThemePreferenceToSupabase(theme: Theme): Promise<void> {
  if (THEME_LIGHT_ONLY_MVP) return;
  try {
    const supabase = supabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("visualify_profiles").update({ theme_preference: theme }).eq("id", user.id);
  } catch {
    /* silent */
  }
}

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => getInitialTheme());

  // Keep <html> class in lockstep with React state before paint (useEffect runs too late and causes dark: styles to flash).
  useLayoutEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (THEME_LIGHT_ONLY_MVP) return;
    let cancelled = false;
    void (async () => {
      try {
        const supabase = supabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        const { data: row } = await supabase
          .from("visualify_profiles")
          .select("theme_preference")
          .eq("id", user.id)
          .maybeSingle();
        if (cancelled) return;
        const remote = parseThemePreference(row?.theme_preference as unknown);
        if (!remote) return;
        const localRaw = localStorage.getItem(STORAGE_KEY);
        if (localRaw === remote) return;
        if (cancelled) return;
        setThemeState(remote);
        applyTheme(remote);
      } catch {
        /* silent */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setTheme = useCallback((next: Theme) => {
    if (THEME_LIGHT_ONLY_MVP) return;
    setThemeState(next);
    void persistThemePreferenceToSupabase(next);
  }, []);

  const toggleTheme = useCallback(() => {
    if (THEME_LIGHT_ONLY_MVP) return;
    setThemeState((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      void persistThemePreferenceToSupabase(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
