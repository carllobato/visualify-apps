/**
 * Node.js ESM loader hook for the built-in test runner (`node --test`).
 *
 * Handles two Next.js TypeScript conventions that Node's bare resolver doesn't support:
 *   1. `@/` path alias  → resolves to `<project-root>/src/`
 *   2. Extension-less relative imports (`"./foo"`, `"../bar"`) → appends `.ts`
 *
 * Used only by the `test` script; not part of the Next.js build.
 */
import { resolve as pathResolve, dirname } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));
const srcDir = pathResolve(projectRoot, "src");

/** Returns true when the specifier already carries a file extension we recognise. */
function hasKnownExtension(s) {
  return /\.(ts|tsx|js|jsx|mjs|cjs|json)$/.test(s);
}

export async function resolve(specifier, context, nextResolve) {
  // 1. @/ alias → src/<rest>.ts
  if (specifier.startsWith("@/")) {
    const rel = specifier.slice(2);
    const resolved = pathResolve(srcDir, rel) + ".ts";
    return { url: pathToFileURL(resolved).href, shortCircuit: true };
  }

  // 2. Extension-less relative imports inside .ts source files → append .ts
  if (
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    !hasKnownExtension(specifier) &&
    context.parentURL?.includes("/src/")
  ) {
    const parentPath = fileURLToPath(context.parentURL);
    const base = pathResolve(dirname(parentPath), specifier);
    return { url: pathToFileURL(base + ".ts").href, shortCircuit: true };
  }

  return nextResolve(specifier, context);
}
