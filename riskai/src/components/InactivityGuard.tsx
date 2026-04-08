"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabaseBrowserClient } from "@/lib/supabase/browser";

const LOGOUT_MS = 15 * 60 * 1_000;
const WARNING_MS = 14 * 60 * 1_000;
const ACTIVITY_EVENTS: (keyof DocumentEventMap)[] = [
  "mousemove",
  "keydown",
  "click",
  "scroll",
];

export function InactivityGuard() {
  const [showWarning, setShowWarning] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  const warningTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (warningTimer.current) clearTimeout(warningTimer.current);
    if (logoutTimer.current) clearTimeout(logoutTimer.current);
    warningTimer.current = null;
    logoutTimer.current = null;
  }, []);

  const signOutAndRedirect = useCallback(async () => {
    clearTimers();
    setShowWarning(false);
    try {
      await supabaseBrowserClient().auth.signOut({ scope: "local" });
    } finally {
      window.location.href = "/login?reason=inactive";
    }
  }, [clearTimers]);

  const resetTimers = useCallback(() => {
    clearTimers();
    setShowWarning(false);

    warningTimer.current = setTimeout(() => {
      setShowWarning(true);
    }, WARNING_MS);

    logoutTimer.current = setTimeout(() => {
      signOutAndRedirect();
    }, LOGOUT_MS);
  }, [clearTimers, signOutAndRedirect]);

  useEffect(() => {
    const supabase = supabaseBrowserClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      setAuthenticated(!!user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setAuthenticated(!!session?.user);
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!authenticated) {
      clearTimers();
      setShowWarning(false);
      return;
    }

    resetTimers();

    const onActivity = () => resetTimers();
    const listenerOptions: AddEventListenerOptions = { passive: true };
    ACTIVITY_EVENTS.forEach((evt) =>
      document.addEventListener(evt, onActivity, listenerOptions),
    );

    return () => {
      clearTimers();
      ACTIVITY_EVENTS.forEach((evt) =>
        document.removeEventListener(evt, onActivity, listenerOptions),
      );
    };
  }, [authenticated, resetTimers, clearTimers]);

  if (!showWarning) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label="Inactivity warning"
      className="ds-modal-backdrop"
      style={{ zIndex: 9999 }}
    >
      <div
        style={{
          background: "var(--ds-surface-elevated)",
          border: "1px solid var(--ds-border)",
          borderRadius: "var(--ds-radius-md)",
          boxShadow: "var(--ds-shadow-modal-panel)",
          padding: "var(--ds-space-8)",
          maxWidth: 400,
          width: "90vw",
          textAlign: "center",
          color: "var(--ds-text-primary)",
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            margin: "0 auto var(--ds-space-4)",
            borderRadius: "var(--ds-radius-sm)",
            background: "var(--ds-status-warning-subtle-bg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm0 3.5a.75.75 0 0 1 .75.75v4a.75.75 0 0 1-1.5 0v-4A.75.75 0 0 1 10 5.5Zm0 8a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z"
              fill="var(--ds-status-warning)"
            />
          </svg>
        </div>
        <h2
          style={{
            margin: "0 0 var(--ds-space-2)",
            fontSize: "var(--ds-text-lg)",
            fontWeight: 600,
          }}
        >
          Session expiring
        </h2>
        <p
          style={{
            margin: "0 0 var(--ds-space-6)",
            fontSize: "var(--ds-text-sm)",
            color: "var(--ds-text-secondary)",
            lineHeight: 1.5,
          }}
        >
          You will be signed out due to inactivity.
        </p>
        <button
          type="button"
          onClick={resetTimers}
          style={{
            appearance: "none",
            border: "none",
            borderRadius: "var(--ds-radius-sm)",
            background: "var(--ds-primary)",
            color: "var(--ds-primary-text)",
            fontSize: "var(--ds-text-sm)",
            fontWeight: 500,
            padding: "var(--ds-space-2) var(--ds-space-5)",
            cursor: "pointer",
            transition: "background var(--ds-transition-fast)",
          }}
          onMouseEnter={(e) =>
            ((e.target as HTMLElement).style.background =
              "var(--ds-primary-hover)")
          }
          onMouseLeave={(e) =>
            ((e.target as HTMLElement).style.background = "var(--ds-primary)")
          }
        >
          Stay signed in
        </button>
      </div>
    </div>
  );
}
