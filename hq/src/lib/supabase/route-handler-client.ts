import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import type { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { supabaseSsrCookieProps } from "@/lib/supabase/auth-cookie-options";

type CookieWrite = { name: string; value: string; options?: CookieOptions };

/**
 * Supabase browser SSR client bound to the incoming Route Handler request cookies.
 * Matches `proxy.ts` / login route so `/api/*` handlers see the same session as `proxy` refresh.
 *
 * {@link applySupabaseAuthCookies} must be called on the route's `NextResponse` before returning
 * so refreshed auth cookies reach the client (same pattern as `proxy.ts` `response.cookies.set`).
 */
export function createRouteRequestSupabase(request: NextRequest): {
  supabase: ReturnType<typeof createServerClient>;
  applySupabaseAuthCookies: (response: NextResponse) => void;
} {
  const cookieWrites: CookieWrite[] = [];

  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    ...supabaseSsrCookieProps(),
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          cookieWrites.push({ name, value, options });
        });
      },
    },
  });

  return {
    supabase,
    applySupabaseAuthCookies(response: NextResponse) {
      for (const { name, value, options } of cookieWrites) {
        response.cookies.set(name, value, options);
      }
    },
  };
}
