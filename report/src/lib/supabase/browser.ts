import { createBrowserClient } from "@supabase/ssr";
import { supabaseSsrCookieProps } from "@/lib/supabase/auth-cookie-options";

export function supabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url?.trim()) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL. Add it to .env.local.");
  }
  if (!anonKey?.trim()) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY. Add it to .env.local.");
  }

  return createBrowserClient(url.trim(), anonKey.trim(), {
    ...supabaseSsrCookieProps(),
  });
}
