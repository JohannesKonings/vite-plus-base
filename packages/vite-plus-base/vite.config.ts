import { defineLibraryConfig } from "./src/index.ts";

// tsdown 0.23 writes plain string `exports` for an ESM-only build and does not
// add a `types` condition. Map each emitted `.mjs` path to `{ types, default }`
// so npm can see the declarations. The top-level `types` field is kept as-is:
// `exports.legacy` stays off, which would also emit `main` and `module`.
function withTypeScriptConditions(
  packageExports: Record<string, unknown>,
): Record<string, unknown> {
  const next: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(packageExports)) {
    next[key] =
      typeof value === "string" && value.endsWith(".mjs")
        ? { types: value.replace(/\.mjs$/, ".d.mts"), default: value }
        : value;
  }

  return next;
}

export default defineLibraryConfig({
  pack: {
    entry: {
      index: "src/index.ts",
      "template/bin/bingo": "template/bin/bingo.ts",
      "template/bin/index": "template/bin/index.ts",
    },
    exports: {
      bin: {
        "vite-plus-base-bingo": "./template/bin/bingo.ts",
        "vite-plus-base-template": "./template/bin/index.ts",
      },
      customExports: withTypeScriptConditions,
    },
  },
});
