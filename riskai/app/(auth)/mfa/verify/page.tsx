import { Suspense } from "react";
import { LoadingPlaceholderCompact } from "@/components/ds/LoadingPlaceholder";
import { LoginChrome } from "../../../login/LoginChrome";
import { MfaVerifyClient } from "./MfaVerifyClient";

export default function MfaVerifyPage() {
  return (
    <Suspense
      fallback={
        <LoginChrome>
          <LoadingPlaceholderCompact className="text-center" label="Loading verification" />
        </LoginChrome>
      }
    >
      <MfaVerifyClient />
    </Suspense>
  );
}
