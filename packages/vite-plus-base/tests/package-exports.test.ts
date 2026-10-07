import { readFileSync } from "node:fs";

import { describe, expect, it } from "vite-plus/test";

describe("published package types", () => {
  it("declares the TypeScript entry points npm uses for the types badge", () => {
    const manifest = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8"),
    ) as {
      types?: string;
      exports?: Record<string, unknown>;
    };

    expect(manifest.types).toBe("./dist/index.d.mts");
    expect(manifest.exports).toEqual({
      ".": {
        types: "./dist/index.d.mts",
        default: "./dist/index.mjs",
      },
      "./template/bin": {
        types: "./dist/template/bin/index.d.mts",
        default: "./dist/template/bin/index.mjs",
      },
      "./template/bin/bingo": {
        types: "./dist/template/bin/bingo.d.mts",
        default: "./dist/template/bin/bingo.mjs",
      },
      "./package.json": "./package.json",
    });
  });
});
