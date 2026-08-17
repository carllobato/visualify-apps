/**
 * Node.js ESM loader hook for the built-in test runner (`node --test`).
 *
 * Handles two Next.js TypeScript conventions that Node's bare resolver doesn't support:
 *   1. `@/` path alias  → resolves to `<project-root>/src/` (`foo.ts` or `foo/index.ts`)
 *   2. Extension-less relative imports (`"./foo"`, `"../bar"`) → `foo.ts` or `foo/index.ts`
 *
 * Used only by the `test` script; not part of the Next.js build.
 */
import { resolve as pathResolve, dirname } from "node:path";
import { existsSync } from "node:fs";
import { pathToFileURL, fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));
const srcDir = pathResolve(projectRoot, "src");

/** Returns true when the specifier already carries a file extension we recognise. */
function hasKnownExtension(s) {
  return /\.(ts|tsx|js|jsx|mjs|cjs|json)$/.test(s);
}

/** Prefer `foo.ts`, then `foo/index.ts`. */
function resolveTsFile(baseWithoutExt) {
  const tsFile = `${baseWithoutExt}.ts`;
  if (existsSync(tsFile)) return tsFile;
  const tsIndex = pathResolve(baseWithoutExt, "index.ts");
  if (existsSync(tsIndex)) return tsIndex;
  return tsFile;
}

export async function resolve(specifier, context, nextResolve) {
  // 1. @/ alias → src/<rest>.ts (or src/<rest>/index.ts)
  if (specifier.startsWith("@/")) {
    const rel = specifier.slice(2);
    const resolved = resolveTsFile(pathResolve(srcDir, rel));
    return { url: pathToFileURL(resolved).href, shortCircuit: true };
  }

  // 2. Extension-less relative imports inside .ts source files → append .ts (or /index.ts)
  if (
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    !hasKnownExtension(specifier) &&
    context.parentURL?.includes("/src/")
  ) {
    const parentPath = fileURLToPath(context.parentURL);
    const base = pathResolve(dirname(parentPath), specifier);
    return { url: pathToFileURL(resolveTsFile(base)).href, shortCircuit: true };
  }

  return nextResolve(specifier, context);
}
