"use client";

import { useEffect } from "react";
import { ErrorContent } from "./error-content";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <ErrorContent onRetry={reset} digest={error.digest} />;
}
