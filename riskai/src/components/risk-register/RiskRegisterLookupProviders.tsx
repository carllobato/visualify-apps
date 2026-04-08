"use client";

import type { ReactNode } from "react";
import { RiskAppliesToOptionsProvider } from "./RiskAppliesToOptionsContext";
import { RiskCategoryOptionsProvider } from "./RiskCategoryOptionsContext";
import { RiskProjectOwnersProvider } from "./RiskProjectOwnersContext";
import { RiskStatusOptionsProvider } from "./RiskStatusOptionsContext";

/** Wraps risk-register screens so category / status / applies_to / project owners lookups are available. */
export function RiskRegisterLookupProviders({
  projectId,
  extraOwnerNamesFromRisks,
  children,
}: {
  projectId: string;
  /** Owner strings from loaded risks so the picker lists names present on rows even if missing from `riskai_project_owners`. */
  extraOwnerNamesFromRisks?: string[];
  children: ReactNode;
}) {
  return (
    <RiskCategoryOptionsProvider>
      <RiskStatusOptionsProvider>
        <RiskAppliesToOptionsProvider>
          <RiskProjectOwnersProvider projectId={projectId} extraOwnerNamesFromRisks={extraOwnerNamesFromRisks}>
            {children}
          </RiskProjectOwnersProvider>
        </RiskAppliesToOptionsProvider>
      </RiskStatusOptionsProvider>
    </RiskCategoryOptionsProvider>
  );
}
