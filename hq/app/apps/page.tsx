import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@visualify/design-system";
import { resolveAuthenticatedUser } from "@/lib/auth/resolve-authenticated-user";
import {
  fetchWorkspaceProductAccessForUser,
  type WorkspaceProductAccessRow,
} from "@/lib/workspace-product-access";
import { VISUALIFY_APP_CATALOG } from "@/lib/visualify-apps";
import { HqSignedInShell } from "../hq-signed-in-shell";

export const dynamic = "force-dynamic";

const primaryCtaClass =
  "inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-[var(--ds-radius-md)] px-4 " +
  "text-[length:var(--ds-text-sm)] font-medium no-underline " +
  "bg-[var(--ds-primary)] text-[var(--ds-primary-text)] shadow-[var(--ds-shadow-sm)] " +
  "transition-all duration-150 ease-out hover:bg-[var(--ds-primary-hover)] hover:shadow-[var(--ds-elevation-button-secondary-hover)] active:brightness-[0.97] " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-primary)]";

function groupAccessByProductKey(rows: WorkspaceProductAccessRow[]) {
  const map = new Map<string, WorkspaceProductAccessRow[]>();
  for (const row of rows) {
    const list = map.get(row.productKey) ?? [];
    list.push(row);
    map.set(row.productKey, list);
  }
  return map;
}

export default async function AppsPage() {
  const user = await resolveAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const accessRows = await fetchWorkspaceProductAccessForUser(user.id);
  const byProduct = groupAccessByProductKey(accessRows);
  const productKeys = [...byProduct.keys()].sort((a, b) => {
    const nameA = byProduct.get(a)?.[0]?.productName ?? a;
    const nameB = byProduct.get(b)?.[0]?.productName ?? b;
    return nameA.localeCompare(nameB);
  });

  return (
    <HqSignedInShell>
      <div className="flex min-h-full flex-col items-start justify-start px-0 pb-10 pt-6">
        <main className="w-full max-w-md shrink-0 space-y-7">
          <div className="space-y-2.5">
            <h1 className="text-[length:var(--ds-text-xl)] font-semibold tracking-tight text-[var(--ds-text-primary)]">
              Apps
            </h1>
            <p className="text-[length:var(--ds-text-sm)] leading-relaxed text-[var(--ds-text-secondary)]">
              Launch and manage Visualify products you have access to.
            </p>
          </div>

          {productKeys.length === 0 ? (
            <Card
              variant="default"
              className="w-full [border-width:var(--ds-border-width)] border-[var(--ds-border)] bg-[var(--ds-surface-elevated)]"
            >
              <CardContent className="pt-6">
                <p className="text-[length:var(--ds-text-sm)] leading-relaxed text-[var(--ds-text-secondary)]">
                  No apps are available yet. When your workspace includes an active or trial subscription
                  to a product, it will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-5">
              {productKeys.map((productKey) => {
                const entitlements = byProduct.get(productKey) ?? [];
                const first = entitlements[0];
                const catalog = VISUALIFY_APP_CATALOG.find((a) => a.id === productKey);
                const title = first?.productName ?? catalog?.name ?? productKey;
                const description =
                  catalog?.description ??
                  "Open this product from your workspace subscription.";

                return (
                  <Card
                    key={productKey}
                    variant="default"
                    className="w-full [border-width:var(--ds-border-width)] border-[var(--ds-border)] bg-[var(--ds-surface-elevated)]"
                  >
                    <CardHeader>
                      <CardTitle className="text-[var(--ds-text-primary)]">{title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-5">
                      <p className="text-[length:var(--ds-text-sm)] leading-relaxed text-[var(--ds-text-secondary)]">
                        {description}
                      </p>

                      <ul className="m-0 list-none space-y-2 p-0">
                        {entitlements.map((e, i) => (
                          <li
                            key={`${e.workspaceSlug}-${i}-${e.subscriptionStatus}-${e.memberRole}-${e.plan ?? ""}`}
                            className="text-[length:var(--ds-text-xs)] leading-relaxed text-[var(--ds-text-secondary)]"
                          >
                            <span className="font-medium text-[var(--ds-text-primary)]">
                              {e.workspaceName}
                            </span>
                            {e.workspaceSlug ? (
                              <span className="text-[var(--ds-text-tertiary)]"> · {e.workspaceSlug}</span>
                            ) : null}
                            <span>
                              {" "}
                              · {e.subscriptionStatus}
                              {e.plan ? ` · ${e.plan}` : ""} · {e.memberRole}
                            </span>
                          </li>
                        ))}
                      </ul>

                      {catalog?.href ? (
                        <a
                          href={catalog.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={primaryCtaClass}
                        >
                          Open {catalog.name}
                        </a>
                      ) : null}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </HqSignedInShell>
  );
}
