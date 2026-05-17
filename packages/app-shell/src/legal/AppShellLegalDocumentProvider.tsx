"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { AppShellLegalDocumentModal, type AppShellLegalDocumentId } from "./AppShellLegalDocumentModal";

type AppShellLegalDocumentContextValue = {
  openLegalDocument: (id: AppShellLegalDocumentId) => void;
};

const AppShellLegalDocumentContext = createContext<AppShellLegalDocumentContextValue | null>(null);

export function useAppShellLegalDocument() {
  const ctx = useContext(AppShellLegalDocumentContext);
  if (!ctx) {
    throw new Error("useAppShellLegalDocument must be used within AppShellLegalDocumentProvider");
  }
  return ctx;
}

/** Mount once at the app root so footer and login legal links can open in-app modals. */
export function AppShellLegalDocumentProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState<AppShellLegalDocumentId | null>(null);

  const openLegalDocument = useCallback((id: AppShellLegalDocumentId) => {
    setActive(id);
  }, []);

  const close = useCallback(() => setActive(null), []);

  const value = useMemo(() => ({ openLegalDocument }), [openLegalDocument]);

  return (
    <AppShellLegalDocumentContext.Provider value={value}>
      {children}
      {active ? <AppShellLegalDocumentModal legalDocument={active} onClose={close} /> : null}
    </AppShellLegalDocumentContext.Provider>
  );
}
