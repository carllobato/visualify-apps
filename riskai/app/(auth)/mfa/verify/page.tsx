import { Suspense } from "react";
import { AppLoginFramedShell } from "@visualify/app-shell";
import { LoadingPlaceholderCompact } from "@/components/ds/LoadingPlaceholder";
import { MfaVerifyClient } from "./MfaVerifyClient";

export default function MfaVerifyPage() {
  return (
    <Suspense
      fallback={
        <AppLoginFramedShell brandHref="/" brandTitle="Visualify RiskAI" brandAriaLabel="Visualify RiskAI">
          <LoadingPlaceholderCompact className="text-center" label="Loading verification" />
        </AppLoginFramedShell>
      }
    >
      <MfaVerifyClient />
    </Suspense>
  );
}
