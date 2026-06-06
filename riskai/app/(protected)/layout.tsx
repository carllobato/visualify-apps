import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { buildEntitledAppShellCatalogForUser, type AppShellRailAppCatalogEntry } from "@visualify/app-shell";
import { fetchWorkspaceEntitledProductKeysForUser } from "@visualify/workspace-product-access";
import { isDevAuthBypassEnabled } from "@/lib/dev/devAuthBypass";
import { hasProductAccess } from "@/lib/auth/hasProductAccess";
import { supabaseServerClient } from "@/lib/supabase/server";
import { ProtectedShell } from "@/components/layout/ProtectedShell";
import { buildLoginRedirectUrl } from "@/lib/auth/loginRedirect";
import { productConfig } from "@/lib/product-config";
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

  let appCatalog: readonly AppShellRailAppCatalogEntry[] = [];

  if (user) {
    const entitled = await hasProductAccess(user.id, productConfig.PRODUCT_KEY);
    if (!entitled) {
      redirect(productConfig.HQ_APPS_URL);
    }

    const workspaceEntitledProductKeys = await fetchWorkspaceEntitledProductKeysForUser(supabase, user.id);
    appCatalog = buildEntitledAppShellCatalogForUser(workspaceEntitledProductKeys, user.email);
  }

  const cookieStore = await cookies();
  const pinnedFromCookie = parseSideNavPinnedCookie(
    cookieStore.get(SIDE_NAV_PINNED_COOKIE_NAME)?.value,
  );
  const initialSideNavPinned = pinnedFromCookie ?? true;
  return (
    <ProtectedShell initialSideNavPinned={initialSideNavPinned} appCatalog={appCatalog}>
      {children}
    </ProtectedShell>
  );
}
