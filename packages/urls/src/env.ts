/// <reference path="./process-env.d.ts" />

import type { VisualifyProductDefinition } from "./products";

/**
 * Read a public env var safely in Next.js (server, client, and non-Node bundlers).
 * Returns `undefined` when unset, empty, or when `process` is unavailable.
 */
export function readPublicEnv(name: string): string | undefined {
  if (typeof process === "undefined") {
    return undefined;
  }
  const value = process.env?.[name]?.trim();
  return value || undefined;
}

/**
 * Resolve a product origin: `NEXT_PUBLIC_*_ORIGIN` when set, otherwise {@link VisualifyProductDefinition.defaultOrigin}.
 */
export function resolveOriginFromProduct(product: VisualifyProductDefinition): string {
  return readPublicEnv(product.originEnvVar) ?? product.defaultOrigin;
}
