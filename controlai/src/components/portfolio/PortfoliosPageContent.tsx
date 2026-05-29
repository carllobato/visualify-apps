"use client";

import { useState } from "react";
import { Button } from "@visualify/design-system";
import { MinimalResourceList, type MinimalResourceListItem } from "@/components/MinimalResourceList";
import { CreatePortfolioForm } from "@/components/portfolio/CreatePortfolioForm";
import type { EntitledWorkspace } from "@/types/entitledWorkspace";

type PortfoliosPageContentProps = {
  portfolios: MinimalResourceListItem[];
  workspaces: EntitledWorkspace[];
};

export function PortfoliosPageContent({ portfolios, workspaces }: PortfoliosPageContentProps) {
  const [creating, setCreating] = useState(false);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-[length:var(--ds-text-xl)] font-semibold text-[var(--ds-text-primary)]">
            Portfolios
          </h1>
          <p className="text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
            ControlAI portfolios in this workspace.
          </p>
        </div>
        {!creating ? (
          <Button type="button" onClick={() => setCreating(true)}>
            New portfolio
          </Button>
        ) : null}
      </div>

      {creating ? (
        <CreatePortfolioForm workspaces={workspaces} onCancel={() => setCreating(false)} />
      ) : null}

      {portfolios.length === 0 && !creating ? (
        <p className="text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
          No portfolios in this workspace yet.
        </p>
      ) : null}

      {portfolios.length > 0 ? (
        <MinimalResourceList
          title=""
          description=""
          emptyMessage=""
          items={portfolios}
          itemHref={(id) => `/portfolios/${id}`}
          hideHeader
        />
      ) : null}
    </div>
  );
}
