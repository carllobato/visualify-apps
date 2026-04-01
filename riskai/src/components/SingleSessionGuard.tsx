"use client";

import { useEffect, useRef, useCallback } from "react";
import { supabaseBrowserClient } from "@/lib/supabase/browser";

const LOG = "[SingleSessionGuard]";
const INSTANCE_KEY = "visualify_session_instance_id";

/**
 * Set by a genuine SIGNED_IN (fresh login) before the page redirects.
 * Read by INITIAL_SESSION on the destination page so it claims ownership
 * instead of running a mismatch check that would race with the in-flight
 * upsert from the login page.
 */
const FRESH_LOGIN_KEY = "visualify_session_fresh_login";

// ---------------------------------------------------------------------------
// Client instance id — one per tab, survives same-tab refreshes
// ---------------------------------------------------------------------------

function getClientInstanceId(): string {
  if (typeof sessionStorage === "undefined") return crypto.randomUUID();
  let id = sessionStorage.getItem(INSTANCE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(INSTANCE_KEY, id);
  }
  return id;
}

// ---------------------------------------------------------------------------
// Product-id resolution (client-side, cached for the tab lifetime)
// ---------------------------------------------------------------------------

let cachedProductId: string | null = null;

async function resolveRiskAIProductId(
  supabase: ReturnType<typeof supabaseBrowserClient>,
): Promise<string | null> {
  if (cachedProductId) return cachedProductId;
  try {
    const { data, error } = await supabase
      .from("visualify_products")
      .select("id")
      .eq("key", "riskai")
      .single();

    if (error || !data) {
      console.warn(
        LOG,
        "Could not resolve RiskAI product — session enforcement skipped.",
        error?.message ?? "",
      );
      return null;
    }
    cachedProductId = data.id as string;
    return cachedProductId;
  } catch {
    console.warn(
      LOG,
      "Product lookup threw — session enforcement skipped.",
    );
    return null;
  }
}

// ---------------------------------------------------------------------------
// Guard component
// ---------------------------------------------------------------------------

/**
 * Enforces single-session-per-user for RiskAI.
 *
 * Event flow (v2.99 auth-js):
 *
 *   INITIAL_SESSION  – fires first on every page load with the stored session.
 *   SIGNED_IN        – fires after INITIAL_SESSION on page load (session
 *                      confirmation) AND on genuine sign-in calls.
 *   TOKEN_REFRESHED  – fires when the access token is auto-refreshed.
 *
 * Ownership rules:
 *
 *   • A genuine sign-in (SIGNED_IN before any INITIAL_SESSION with a session)
 *     upserts immediately and drops a sessionStorage flag so the post-redirect
 *     page can claim ownership even if the login-page upsert didn't land.
 *
 *   • A session-recovery SIGNED_IN (page load / tab refocus) is a no-op —
 *     it must NOT upsert or an old tab could reclaim ownership.
 *
 *   • INITIAL_SESSION claims (upserts) when the fresh-login flag is present,
 *     otherwise checks for a mismatch.
 *
 * Debug columns written on every upsert:
 *   client_instance_id  – unique per browser tab (sessionStorage)
 *   last_seen_at        – current timestamp
 *   user_agent          – navigator.userAgent
 */
export function SingleSessionGuard() {
  const signingOutRef = useRef(false);
  const lastUpsertedTokenRef = useRef<string | null>(null);
  const clientInstanceId = useRef(getClientInstanceId());

  /**
   * True once INITIAL_SESSION has fired with a valid session in this mount.
   * Any subsequent SIGNED_IN is a session-recovery confirmation, not a
   * genuine fresh login.
   */
  const initialSessionHadAuth = useRef(false);

  // ---- sign-out (guarded against re-entrance) ----------------------------

  const signOutAndRedirect = useCallback(async () => {
    if (signingOutRef.current) return;
    signingOutRef.current = true;
    try {
      await supabaseBrowserClient().auth.signOut({ scope: "local" });
    } finally {
      window.location.href = "/login?reason=session_replaced";
    }
  }, []);

  // ---- upsert (skip if token unchanged) ----------------------------------

  const upsertSession = useCallback(
    async (userId: string, token: string) => {
      if (signingOutRef.current || lastUpsertedTokenRef.current === token) return;

      const supabase = supabaseBrowserClient();
      const productId = await resolveRiskAIProductId(supabase);
      if (!productId) return;

      const now = new Date().toISOString();

      const { error } = await supabase.from("visualify_user_sessions").upsert(
        {
          user_id: userId,
          product_id: productId,
          session_id: token,
          updated_at: now,
          client_instance_id: clientInstanceId.current,
          last_seen_at: now,
          user_agent: navigator.userAgent,
        },
        { onConflict: "user_id,product_id" },
      );

      if (error) {
        console.warn(LOG, "Session upsert failed:", error.message);
        return;
      }
      lastUpsertedTokenRef.current = token;
    },
    [],
  );

  // ---- check (read DB, sign-out on mismatch) -----------------------------

  const checkSession = useCallback(
    async (userId: string, token: string) => {
      if (signingOutRef.current) return;

      const supabase = supabaseBrowserClient();
      const productId = await resolveRiskAIProductId(supabase);
      if (!productId) return;

      const { data, error } = await supabase
        .from("visualify_user_sessions")
        .select("session_id")
        .eq("user_id", userId)
        .eq("product_id", productId)
        .maybeSingle();

      if (error) {
        console.warn(LOG, "Session check failed:", error.message);
        return;
      }

      if (!data) {
        await upsertSession(userId, token);
        return;
      }

      if (data.session_id !== token) {
        signOutAndRedirect();
        return;
      }

      // Heartbeat: touch last_seen_at without changing session_id
      const { error: heartbeatErr } = await supabase
        .from("visualify_user_sessions")
        .update({
          last_seen_at: new Date().toISOString(),
          client_instance_id: clientInstanceId.current,
          user_agent: navigator.userAgent,
        })
        .eq("user_id", userId)
        .eq("product_id", productId);

      if (heartbeatErr) {
        console.warn(LOG, "Heartbeat update failed:", heartbeatErr.message);
      }
    },
    [upsertSession, signOutAndRedirect],
  );

  // ---- auth state listener -----------------------------------------------

  useEffect(() => {
    const supabase = supabaseBrowserClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) return;

      const userId = session.user.id;
      const token = session.access_token;

      switch (event) {
        // ---------------------------------------------------------------
        // INITIAL_SESSION fires first on every page load.
        //
        // If a fresh-login flag is present in sessionStorage the previous
        // page performed a genuine sign-in and its upsert may not have
        // landed before the redirect.  Claim ownership here instead of
        // running a mismatch check that would race-lose.
        // ---------------------------------------------------------------
        case "INITIAL_SESSION": {
          initialSessionHadAuth.current = true;

          let freshLogin = false;
          try {
            freshLogin = sessionStorage.getItem(FRESH_LOGIN_KEY) === "1";
            sessionStorage.removeItem(FRESH_LOGIN_KEY);
          } catch { /* SSR / private-browsing guard */ }

          if (freshLogin) {
            upsertSession(userId, token);
          } else {
            checkSession(userId, token);
          }
          break;
        }

        // ---------------------------------------------------------------
        // SIGNED_IN fires after INITIAL_SESSION on page load (session
        // confirmation) and after signInWith*() calls (genuine login).
        //
        // Distinguish genuine logins: INITIAL_SESSION has NOT yet
        // reported a stored session → this is a real sign-in → set the
        // flag so the post-redirect page claims, and upsert now.
        //
        // Session-recovery SIGNED_IN: INITIAL_SESSION already ran with
        // a valid session → skip to prevent old tabs from reclaiming.
        // ---------------------------------------------------------------
        case "SIGNED_IN": {
          if (!initialSessionHadAuth.current) {
            try { sessionStorage.setItem(FRESH_LOGIN_KEY, "1"); } catch { /* noop */ }
            upsertSession(userId, token);
          }
          break;
        }

        // ---------------------------------------------------------------
        // TOKEN_REFRESHED: always upsert so the DB tracks the current
        // access token and the tab is not evicted by its own stale token.
        // ---------------------------------------------------------------
        case "TOKEN_REFRESHED":
          upsertSession(userId, token);
          break;
      }
    });

    return () => subscription.unsubscribe();
  }, [upsertSession, checkSession]);

  // ---- periodic ownership poll (every 15 s) --------------------------------

  useEffect(() => {
    const POLL_MS = 15_000;
    const id = setInterval(() => {
      if (signingOutRef.current) return;

      supabaseBrowserClient()
        .auth.getSession()
        .then(({ data: { session } }) => {
          if (session) {
            checkSession(session.user.id, session.access_token);
          }
        });
    }, POLL_MS);

    return () => clearInterval(id);
  }, [checkSession]);

  // ---- visibility-change re-check ----------------------------------------

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible" || signingOutRef.current) return;

      supabaseBrowserClient()
        .auth.getSession()
        .then(({ data: { session } }) => {
          if (session) {
            checkSession(session.user.id, session.access_token);
          }
        });
    };

    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [checkSession]);

  return null;
}
