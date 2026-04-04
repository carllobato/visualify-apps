import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { isDevAuthBypassEnabled } from "@/lib/dev/devAuthBypass";
import { supabaseServerClient } from "@/lib/supabase/server";
import { ProtectedShell } from "@/components/layout/ProtectedShell";
import { buildLoginRedirectUrl } from "@/lib/auth/loginRedirect";
import {
  parseSideNavPinnedCookie,
  SIDE_NAV_PINNED_COOKIE_NAME,
} from "@/lib/sideNavPinnedCookie";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const pathname = (await headers()).get("x-pathname") ?? "/";

  if (!user && !isDevAuthBypassEnabled()) {
    redirect(await buildLoginRedirectUrl(pathname));
  }
  const cookieStore = await cookies();
  const pinnedFromCookie = parseSideNavPinnedCookie(
    cookieStore.get(SIDE_NAV_PINNED_COOKIE_NAME)?.value,
  );
  const initialSideNavPinned = pinnedFromCookie ?? true;
  return (
    <ProtectedShell initialSideNavPinned={initialSideNavPinned}>{children}</ProtectedShell>
  );
}
