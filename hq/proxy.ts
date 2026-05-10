import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  getSupabaseAuthCookieOptions,
  supabaseSsrCookieProps,
} from "@/lib/supabase/auth-cookie-options";
import { awaitSupabaseCookieSync } from "@/lib/supabase/await-supabase-cookie-sync";

function authDebugEnabled(): boolean {
  return process.env.HQ_SUPABASE_AUTH_DEBUG === "1";
}

function sbAuthCookieNames(request: NextRequest): string[] {
  return request.cookies.getAll().map(({ name }) => name).filter((n) => n.startsWith("sb-"));
}

/**
 * Refreshes the Supabase session from cookies on each matched request so
 * server components receive a valid session. Does not enforce route protection.
 */
export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) {
    return response;
  }

  const supabase = createServerClient(url, anonKey, {
    ...supabaseSsrCookieProps(),
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      /**
       * Must not replace `response` inside `setAll`: Supabase may call `setAll`
       * more than once per request (refresh/chunks). Recreating `NextResponse.next`
       * each time drops earlier Set-Cookie headers and logs users out on navigation.
       */
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  await awaitSupabaseCookieSync();

  if (authDebugEnabled()) {
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
    const cookieOpts = getSupabaseAuthCookieOptions();
    console.log(
      JSON.stringify({
        tag: "hq-supabase-auth-debug",
        host,
        pathname: request.nextUrl.pathname,
        sbAuthCookieNames: sbAuthCookieNames(request),
        cookieDomainConfigured: cookieOpts?.domain ?? null,
        getUserReturnedUser: Boolean(user),
      }),
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
