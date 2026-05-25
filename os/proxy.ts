import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  getSupabaseAuthCookieOptions,
  supabaseSsrCookieProps,
} from "@/lib/supabase/auth-cookie-options";
import { awaitSupabaseCookieSync } from "@/lib/supabase/await-supabase-cookie-sync";

function authDebugEnabled(): boolean {
  return process.env.SUPABASE_AUTH_DEBUG === "1";
}

function sbAuthCookieNames(request: NextRequest): string[] {
  return request.cookies.getAll().map(({ name }) => name).filter((n) => n.startsWith("sb-"));
}

/**
 * Refreshes the Supabase session from cookies on each matched request so Route Handlers and
 * Server Components see a valid session. Does not enforce route protection.
 *
 * Injects `x-pathname` / `x-url-search` so protected layouts can build login return URLs
 * (same idea as RiskAI).
 *
 * Pattern: single `NextResponse.next`, reuse same response in `setAll` so parallel
 * cookie writes do not drop earlier Set-Cookie headers.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const forwardedHeaders = new Headers(request.headers);
  forwardedHeaders.set("x-pathname", pathname);
  forwardedHeaders.set("x-url-search", search);

  const requestWithPath = new Request(request.url, {
    method: request.method,
    headers: forwardedHeaders,
  });

  const response = NextResponse.next({ request: requestWithPath });

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
        tag: "visualify-os-supabase-auth-debug",
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
    "/api/:path*",
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
