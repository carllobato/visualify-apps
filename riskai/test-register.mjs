/**
 * Registers the @/ path alias hook before the test runner loads any test files.
 * Invoked via `node --import=./test-register.mjs`.
 */
import { register } from "node:module";
import { pathToFileURL } from "node:url";
import { resolve as pathResolve } from "node:path";

register(
  pathToFileURL(pathResolve(process.cwd(), "test-hooks.mjs")).href,
  { parentURL: pathToFileURL(process.cwd() + "/") }
);
