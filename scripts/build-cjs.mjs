#!/usr/bin/env node
/**
 * CommonJS build for @j13b/state.
 *
 * The primary `vite build` emits the ESM tree (+ .d.ts) to `dist/`. This pass
 * mirrors `src/` into `dist/cjs/` as CommonJS via `tsc`, then drops a
 * `package.json` marking that subtree `{"type":"commonjs"}`.
 *
 * Why the marker instead of a `.cjs` extension: it lets the extensionless
 * `require("./foo")` calls tsc emits resolve to sibling `.js` files (Node's
 * CJS resolver doesn't try `.cjs`), and it makes the co-located `.d.ts` files
 * be interpreted as CommonJS type declarations — so the `require` condition
 * gets correct types with no `.d.cts` duplication.
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cjsDir = join(root, "dist", "cjs");

console.log("• Building CommonJS tree → dist/cjs");
execSync("tsc -p tsconfig.cjs.json", { stdio: "inherit", cwd: root });

mkdirSync(cjsDir, { recursive: true });
writeFileSync(
  join(cjsDir, "package.json"),
  `${JSON.stringify({ type: "commonjs" }, null, 2)}\n`,
);

console.log("CommonJS build complete.");
