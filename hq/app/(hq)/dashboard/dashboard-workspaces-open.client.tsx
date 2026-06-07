"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useState, type ReactNode } from "react";
import { setVisualifyActiveWorkspaceIdAction } from "../../workspace-switcher-actions";

type DashboardOpenWorkspaceContextValue = {
  busyId: string | null;
  tilesDisabled: boolean;
  openWorkspace: (id: string) => void;
};

const DashboardOpenWorkspaceContext = createContext<DashboardOpenWorkspaceContextValue | null>(null);

export function useDashboardOpenWorkspace(): DashboardOpenWorkspaceContextValue {
  const ctx = useContext(DashboardOpenWorkspaceContext);
  if (ctx == null) {
    throw new Error("useDashboardOpenWorkspace must be used within DashboardOpenWorkspaceProvider");
  }
  return ctx;
}

export function DashboardOpenWorkspaceProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function openWorkspace(id: string) {
    if (busyId) return;
    setBusyId(id);
    try {
      const result = await setVisualifyActiveWorkspaceIdAction(id);
      if (!result.ok) return;

      router.push(`/workspaces/${id}`);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <DashboardOpenWorkspaceContext.Provider
      value={{
        busyId,
        tilesDisabled: busyId !== null,
        openWorkspace,
      }}
    >
      {children}
    </DashboardOpenWorkspaceContext.Provider>
  );
}
