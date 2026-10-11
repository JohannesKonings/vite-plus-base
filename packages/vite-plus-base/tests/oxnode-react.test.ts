import { readFileSync } from "node:fs";

import { produceTemplate, type Template } from "bingo";
import { describe, expect, it } from "vite-plus/test";

import { createOxnodeDoc } from "../template/src/blocks/blockOxnode/createOxnodeDoc.ts";
import template from "../template/src/template.ts";

const stratumTemplate = template as unknown as Template;

const templateOptions = { preset: "default", name: "app", packageData: { name: "app" } };

function produce(files: Record<string, unknown>, mode: "setup" | "transition" = "transition") {
  return produceTemplate(stratumTemplate, {
    mode,
    options: { ...templateOptions, packageData: JSON.parse(files["package.json"] as string) },
    files,
  } as unknown as Parameters<typeof produceTemplate>[1]);
}

function readNestedFile(files: Record<string, unknown> | undefined, pathSegments: string[]) {
  let current: unknown = files;

  for (const segment of pathSegments) {
    if (!current || typeof current !== "object") {
      return undefined;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return typeof current === "string" ? current : undefined;
}

const workspaceConfig = (
  blockReact: string,
) => `import { defineWorkspaceConfig } from "@jaykingson/vite-plus-base";

export default defineWorkspaceConfig({
  bingo: {
    blockPackageJson: { name: "app" },
    blockReact: ${blockReact},
  },
});
`;

describe("oxnode runner", () => {
  it("matches the committed migration guide", () => {
    const committed = readFileSync(
      new URL("../../../docs/agents/oxnode.md", import.meta.url),
      "utf8",
    );
    expect(committed).toBe(createOxnodeDoc());
  });

  it("adds oxnode, rewrites root scripts and cdk.json, and does not add tsx", async () => {
    const creation = await produce({
      "package.json": JSON.stringify({
        name: "app",
        private: true,
        scripts: {
          dev: "tsx watch src/index.ts",
          start: "node --import tsx src/main.ts",
          exec: "vp exec tsx src/run.ts",
          pack: "pnpm tsx src/pack.ts",
          once: "npx tsx src/App.tsx",
        },
        devDependencies: {
          tsx: "^4.20.0",
          vite: "catalog:",
        },
      }),
      "cdk.json": JSON.stringify({
        app: "npx tsx bin/app.ts",
        watch: { include: ["**/*.tsx"], exclude: ["node_modules"] },
      }),
    });

    const pkg = JSON.parse(creation.files?.["package.json"] as string);
    expect(pkg.scripts).toEqual({
      dev: "oxnode --watch src/index.ts",
      start: "node --import @oxc-node/core/register src/main.ts",
      exec: "vp exec oxnode src/run.ts",
      pack: "pnpm exec oxnode src/pack.ts",
      once: "oxnode src/App.tsx",
    });
    expect(pkg.devDependencies.tsx).toBeUndefined();
    expect(pkg.devDependencies["@oxc-node/cli"]).toBe("^0.1.5");
    expect(pkg.devDependencies["@oxc-node/core"]).toBe("^0.1.5");
    expect(pkg.devDependencies.vite).toBe("catalog:");
    expect(creation.files?.["package.json"]).not.toContain('"tsx"');

    const cdk = JSON.parse(creation.files?.["cdk.json"] as string);
    expect(cdk.app).toBe("oxnode bin/app.ts");
    expect(cdk.watch.include).toEqual(["**/*.tsx"]);

    expect(readNestedFile(creation.files, ["docs", "agents", "oxnode.md"])).toContain(
      "OXC_TRANSFORM_ALL=1",
    );
    expect(creation.suggestions?.join("\n")).toContain("oxnode");
    expect(pkg.devDependencies["@vitejs/plugin-react"]).toBeUndefined();
  });

  it("keeps tsx when a watch flag cannot be rewritten and preserves catalog specifiers", async () => {
    const creation = await produce({
      "package.json": JSON.stringify({
        name: "app",
        scripts: {
          dev: "tsx watch --include ./extra src/index.ts",
          build: "tsx src/build.ts",
        },
        devDependencies: {
          "@oxc-node/cli": "catalog:",
          "@oxc-node/core": "catalog:",
          tsx: "^4.20.0",
        },
      }),
    });

    const pkg = JSON.parse(creation.files?.["package.json"] as string);
    expect(pkg.scripts.dev).toBe("tsx watch --include ./extra src/index.ts");
    expect(pkg.scripts.build).toBe("oxnode src/build.ts");
    expect(pkg.devDependencies.tsx).toBe("^4.20.0");
    expect(pkg.devDependencies["@oxc-node/cli"]).toBe("catalog:");
    expect(pkg.devDependencies["@oxc-node/core"]).toBe("catalog:");
    expect(creation.suggestions?.join("\n")).toContain("--include");
  });

  it("rewrites workspace package scripts and the sibling cdk.json app", async () => {
    const creation = await produce({
      "package.json": JSON.stringify({ name: "app", private: true }),
      "pnpm-workspace.yaml": "packages:\n  - packages/*\n",
      packages: {
        infra: {
          "package.json": JSON.stringify({
            name: "infra",
            scripts: { synth: "pnpm exec tsx bin/app.ts" },
            devDependencies: { tsx: "^4.20.0" },
          }),
          "cdk.json": JSON.stringify({ app: "pnpm tsx bin/app.ts" }),
        },
        web: {
          "package.json": JSON.stringify({
            name: "web",
            scripts: { dev: "vp dev" },
          }),
        },
      },
    });

    const infra = JSON.parse(
      readNestedFile(creation.files, ["packages", "infra", "package.json"]) ?? "{}",
    );
    expect(infra.scripts.synth).toBe("pnpm exec oxnode bin/app.ts");
    expect(infra.devDependencies.tsx).toBeUndefined();
    expect(infra.devDependencies["@oxc-node/cli"]).toBe("^0.1.5");
    expect(infra.devDependencies["@oxc-node/core"]).toBe("^0.1.5");

    const cdk = JSON.parse(
      readNestedFile(creation.files, ["packages", "infra", "cdk.json"]) ?? "{}",
    );
    expect(cdk.app).toBe("pnpm exec oxnode bin/app.ts");

    expect(readNestedFile(creation.files, ["packages", "web", "package.json"])).toBeUndefined();
  });
});

describe("blockReact", () => {
  it("sets up plugin-react without the experimental compiler", async () => {
    const creation = await produce({
      "package.json": JSON.stringify({
        name: "app",
        private: true,
        devDependencies: { vite: "catalog:" },
      }),
      "vite.config.ts": workspaceConfig("{}"),
      packages: {
        web: {
          "package.json": JSON.stringify({
            name: "web",
            dependencies: { react: "^19.0.0" },
          }),
        },
      },
    });

    const pkg = JSON.parse(creation.files?.["package.json"] as string);
    expect(pkg.devDependencies["@vitejs/plugin-react"]).toBe("^6.1.2");
    expect(pkg.devDependencies["oxc-transform-react"]).toBeUndefined();

    const moduleSource = readNestedFile(creation.files, ["tooling", "vite", "react.ts"]);
    expect(moduleSource).toContain("export const reactPlugin = react();");
    expect(moduleSource).not.toContain("compiler: true");

    const doc = readNestedFile(creation.files, ["docs", "agents", "react-vite.md"]);
    expect(doc).toContain("Experimental");
    expect(doc).toContain("reactCompilerPreset");
    expect(doc).toContain("oxcCompiler: true");

    const web = JSON.parse(
      readNestedFile(creation.files, ["packages", "web", "package.json"]) ?? "{}",
    );
    expect(web.dependencies.react).toBe("^19.0.0");
    expect(web.devDependencies["@vitejs/plugin-react"]).toBe("^6.1.2");
    expect(web.devDependencies["oxc-transform-react"]).toBeUndefined();
    expect(creation.suggestions?.join("\n")).toContain("Oxc React Compiler is off");
  });

  it("installs the experimental Oxc React Compiler when oxcCompiler is true", async () => {
    const creation = await produce({
      "package.json": JSON.stringify({ name: "app", private: true }),
      "vite.config.ts": workspaceConfig("{ oxcCompiler: true }"),
    });

    const pkg = JSON.parse(creation.files?.["package.json"] as string);
    expect(pkg.devDependencies["@vitejs/plugin-react"]).toBe("^6.1.2");
    expect(pkg.devDependencies["oxc-transform-react"]).toBe("^0.152.0");
    expect(readNestedFile(creation.files, ["tooling", "vite", "react.ts"])).toContain(
      "react({ compiler: true })",
    );
    expect(readNestedFile(creation.files, ["docs", "agents", "react-vite.md"])).toContain(
      "Experimental",
    );
    expect(creation.suggestions?.join("\n")).toContain("Experimental Oxc React Compiler is on");
  });
});
