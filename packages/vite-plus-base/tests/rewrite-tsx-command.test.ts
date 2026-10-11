import { describe, expect, it } from "vite-plus/test";

import { rewriteTsxCommand } from "../template/src/blocks/blockOxnode/rewriteTsxCommand.ts";

describe("rewriteTsxCommand", () => {
  it("rewrites tsx commands and leaves .tsx paths alone", () => {
    expect(rewriteTsxCommand("tsx src/App.tsx").text).toBe("oxnode src/App.tsx");
    expect(rewriteTsxCommand("tsx watch src/index.ts").text).toBe("oxnode --watch src/index.ts");
    expect(rewriteTsxCommand("node --import tsx src/index.ts").text).toBe(
      "node --import @oxc-node/core/register src/index.ts",
    );
    expect(rewriteTsxCommand("node --import=tsx src/index.ts").text).toBe(
      "node --import=@oxc-node/core/register src/index.ts",
    );
    expect(rewriteTsxCommand('node --import "tsx" src/index.ts').text).toBe(
      'node --import "@oxc-node/core/register" src/index.ts',
    );
    expect(rewriteTsxCommand("node --import tsx/esm src/index.ts").text).toBe(
      "node --import @oxc-node/core/register src/index.ts",
    );
    expect(rewriteTsxCommand("vp exec tsx src/index.ts").text).toBe("vp exec oxnode src/index.ts");
    expect(rewriteTsxCommand("pnpm exec tsx src/index.ts").text).toBe(
      "pnpm exec oxnode src/index.ts",
    );
    expect(rewriteTsxCommand("pnpm tsx src/index.ts").text).toBe("pnpm exec oxnode src/index.ts");
    expect(rewriteTsxCommand("pnpm tsx watch src/index.ts").text).toBe(
      "pnpm exec oxnode --watch src/index.ts",
    );
    expect(rewriteTsxCommand("npx tsx src/index.ts").text).toBe("oxnode src/index.ts");
    expect(rewriteTsxCommand("npm exec tsx src/index.ts").text).toBe(
      "npm exec oxnode src/index.ts",
    );
    expect(rewriteTsxCommand("pnpm --filter app exec tsx src/main.ts").text).toBe(
      "pnpm --filter app exec oxnode src/main.ts",
    );
    expect(rewriteTsxCommand("tsx src/a.ts && tsx watch src/b.ts").text).toBe(
      "oxnode src/a.ts && oxnode --watch src/b.ts",
    );
    expect(rewriteTsxCommand("echo file.tsx").text).toBe("echo file.tsx");
    expect(rewriteTsxCommand("oxnode src/index.ts").manual).toEqual([]);
  });

  it("leaves tsx watch flags and indirect invocations for a manual migration", () => {
    const watch = rewriteTsxCommand("tsx watch --clear-screen=false src/index.ts");
    expect(watch.text).toBe("tsx watch --clear-screen=false src/index.ts");
    expect(watch.manual.join(" ")).toContain("--clear-screen");

    const dlx = rewriteTsxCommand("pnpm dlx tsx src/index.ts");
    expect(dlx.text).toBe("pnpm dlx tsx src/index.ts");
    expect(dlx.manual.join(" ")).toContain("unrecognized");

    const loader = rewriteTsxCommand("node --loader tsx src/index.ts");
    expect(loader.text).toBe("node --loader tsx src/index.ts");
    expect(loader.manual.join(" ")).toContain("--loader");
  });
});
