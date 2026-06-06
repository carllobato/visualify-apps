"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useState, type ReactNode } from "react";
import { setVisualifyActiveWorkspaceIdAction } from "../../workspace-switcher-actions";

type DashboardOpenWorkspaceContextValue = {
  busyId: string | null;
  tilesDisabled: boolean;
  openWorkspace: (id: string, navigateToAdmin?: boolean) => void;
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
  const pathname = usePathname();
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function openWorkspace(id: string, navigateToAdmin = true) {
    if (busyId) return;
    setBusyId(id);
    try {
      const result = await setVisualifyActiveWorkspaceIdAction(id);
      if (!result.ok) return;

      if (navigateToAdmin) {
        router.push(`/workspaces/${id}?tab=apps`);
        return;
      }

      if (pathname === "/dashboard") {
        router.refresh();
      } else {
        router.push("/dashboard");
      }
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
